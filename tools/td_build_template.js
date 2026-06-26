/**
 * td_build_template — Node-side COMPILER for live network building.
 *
 * Reads a named network template (the same data that `get_network_template`
 * documents) and COMPILES it into an ordered series of atomic bridge commands
 * that build the network inside a running TouchDesigner 2025 instance:
 *
 *   1. create_operator   — one per template operator (createType from the map)
 *   2. set_parameter     — one per template parameter (parName from the map)
 *   3. connect           — one per template connection (port-level wiring)
 *   4. layout            — tidy the resulting network
 *
 * This tool is STRICT: if an operator's create-type or a parameter's parName
 * cannot be resolved against the operator map (wiki/data/maps/operators.json),
 * it HARD-ERRORS and lists exactly what is missing rather than guessing. All
 * underlying calls are documented TouchDesigner APIs (COMP.create(opType,name),
 * op.par.NAME.val/.expr, Connector.connect()).
 *
 * @module tools/td_build_template
 */

import { z } from "zod";
import { sendCommand, mcpText, resolveOpType, resolveParName } from "./td-live/client.js";
// The template definitions live in get_network_template.js. They are not
// exported there (the module only exports {schema, handler}), so we keep an
// independent, equivalent description of the templates here as the build
// source-of-truth. Each template lists operators, connections, and parameters
// in the exact shape get_network_template documents.
import { BUILD_TEMPLATES } from "./td-live/templates.js";

// All mutating live tools default to the dedicated sandbox COMP.
const DEFAULT_PARENT = "/td_mcp/sandbox";

// Alias map mirrors get_network_template's friendly lookup so callers can use
// the same names ("feedback loop", "vj", "data viz", ...).
const ALIAS_MAP = {
  "video player": "video-player",
  videoplayer: "video-player",
  video: "video-player",
  generative: "generative-art",
  "generative art": "generative-art",
  generativeart: "generative-art",
  feedback: "generative-art",
  "feedback loop": "generative-art",
  audio: "audio-reactive",
  "audio reactive": "audio-reactive",
  audioreactive: "audio-reactive",
  "audio-visual": "audio-reactive",
  "music visualizer": "audio-reactive",
  data: "data-visualization",
  "data visualization": "data-visualization",
  datavisualization: "data-visualization",
  "data viz": "data-visualization",
  dataviz: "data-visualization",
  live: "live-performance",
  "live performance": "live-performance",
  liveperformance: "live-performance",
  vjing: "live-performance",
  vj: "live-performance",
  performance: "live-performance"
};

function resolveTemplateKey(name) {
  const lower = String(name || "").toLowerCase().trim();
  if (BUILD_TEMPLATES[lower]) return lower;
  if (ALIAS_MAP[lower]) return ALIAS_MAP[lower];
  return null;
}

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Build Template (live)",
  description:
    "COMPILE a named TouchDesigner network template into a running TouchDesigner " +
    "instance via the td_mcp bridge: it creates every operator, sets the template " +
    "parameters, wires the connections (port-level), and lays out the network. " +
    "Templates: video-player, generative-art, audio-reactive, data-visualization, " +
    "live-performance (aliases like 'feedback loop', 'vj', 'data viz' accepted). " +
    "Builds into the sandbox COMP by default (" + DEFAULT_PARENT + "). STRICT: if any " +
    "operator type or parameter name cannot be resolved against the operator map, " +
    "it fails and lists what is missing instead of guessing. Requires the bridge " +
    "to be running (see td_status).",
  inputSchema: {
    template: z
      .string()
      .describe(
        "Template name: video-player | generative-art | audio-reactive | " +
        "data-visualization | live-performance (aliases accepted). Use 'list' to " +
        "see the available templates."
      ),
    parent: z
      .string()
      .optional()
      .describe(
        `Path to the parent COMP to build inside. Defaults to ${DEFAULT_PARENT}.`
      )
  }
};

/**
 * Resolve every operator type and parameter name in the template up-front so we
 * can hard-error before issuing any mutating command. Returns either
 * { ok:false, missing:[...] } or { ok:true, ops:{id->{name,createType}}, params, conns }.
 */
async function planBuild(tpl) {
  const missing = [];
  const ops = {}; // id -> { name, createType, type }

  // Resolve create types for every operator.
  for (const op of tpl.operators) {
    const createType = await resolveOpType(op.type);
    if (!createType) {
      missing.push(`operator type '${op.type}' (id '${op.id}') — no createType in the operator map`);
    }
    ops[op.id] = { name: op.id, createType, type: op.type };
  }

  // Resolve parameter names for every parameter (label -> parName via the map).
  const params = [];
  for (const p of tpl.parameters || []) {
    const op = ops[p.op];
    const opType = op ? op.type : p.op;
    const parName = await resolveParName(opType, p.param);
    if (!parName) {
      missing.push(
        `parameter '${p.param}' on '${p.op}' (${opType}) — no parName in the operator map`
      );
    }
    params.push({ ...p, parName });
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true, ops, params, conns: tpl.connections || [] };
}

// Tool handler
export async function handler({ template, parent = DEFAULT_PARENT } = {}) {
  // List mode — enumerate available templates without touching the bridge.
  if (String(template).toLowerCase().trim() === "list") {
    let t = "# Buildable templates\n\n";
    for (const [key, tpl] of Object.entries(BUILD_TEMPLATES)) {
      t += `- \`${key}\` — ${tpl.name}: ${tpl.description}\n`;
    }
    return mcpText(t.trimEnd());
  }

  const key = resolveTemplateKey(template);
  if (!key) {
    return mcpText(
      `No template named "${template}". Available: ${Object.keys(BUILD_TEMPLATES).join(", ")}. ` +
      `Use template:"list" for descriptions.`
    );
  }
  const tpl = BUILD_TEMPLATES[key];

  // ---- Plan + validate against the operator map (hard-error on gaps) --------
  const plan = await planBuild(tpl);
  if (!plan.ok) {
    let t = `Cannot build template '${key}' — ${plan.missing.length} unresolved item(s) in the operator map.\n`;
    t += `Refusing to build a partial/guessed network.\n\nMissing:\n`;
    for (const m of plan.missing) t += `  - ${m}\n`;
    t += `\nFix: add these to wiki/data/maps/operators.json (createType / params), then retry.`;
    return mcpText(t);
  }

  // ---- Emit ordered atomic commands -----------------------------------------
  const steps = []; // human-readable build log
  const bridgeErrors = []; // collected errors/scriptErrors from the bridge

  // 1) create every operator
  for (const op of tpl.operators) {
    const info = plan.ops[op.id];
    const res = await sendCommand("create_operator", {
      parent,
      opType: info.createType,
      name: info.name
    });
    recordStep(steps, bridgeErrors, res, `create ${info.createType} '${op.id}' (${op.type})`);
    if (!res.ok) {
      // A create failure is fatal for the rest of the build — stop and report.
      return finish(key, parent, steps, bridgeErrors, /*aborted*/ true);
    }
  }

  // 2) set every parameter (val by default; expr if the value looks like an expr)
  for (const p of plan.params) {
    const path = `${parent}/${p.op}`;
    const { value, expr } = classifyParamValue(p.value);
    const args = expr !== undefined ? { path, par: p.parName, expr } : { path, par: p.parName, value };
    const res = await sendCommand("set_parameter", args);
    const how = expr !== undefined ? `expr=${expr}` : `value=${JSON.stringify(value)}`;
    recordStep(steps, bridgeErrors, res, `set ${p.op}.${p.parName} ${how}`);
  }

  // 3) wire every connection (port-level)
  for (const c of plan.conns) {
    const res = await sendCommand("connect", {
      from: `${parent}/${c.from}`,
      fromOut: c.fromPort ?? 0,
      to: `${parent}/${c.to}`,
      toIn: c.toPort ?? 0
    });
    recordStep(
      steps,
      bridgeErrors,
      res,
      `connect ${c.from}[out ${c.fromPort ?? 0}] -> ${c.to}[in ${c.toPort ?? 0}]`
    );
  }

  // 4) layout the network
  const layoutRes = await sendCommand("layout", { parent });
  recordStep(steps, bridgeErrors, layoutRes, `layout '${parent}'`);

  return finish(key, parent, steps, bridgeErrors, /*aborted*/ false);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/**
 * Decide whether a template parameter "value" should be applied as a literal
 * value or as a TouchDesigner expression. The template data uses Python-ish
 * expression strings (e.g. "op('null1')['chan1']", "op('beat1')['bpm'] / 60").
 * Anything containing op(...) / project. / absTime. / arithmetic that is not a
 * bare number or quoted string is treated as an expression.
 */
function classifyParamValue(raw) {
  if (raw === null || raw === undefined) return { value: raw };
  const s = String(raw).trim();

  // Quoted string literal -> strip quotes, apply as a plain value.
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return { value: s.slice(1, -1) };
  }

  // Pure number -> numeric value.
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return { value: Number(s) };
  }

  // Looks like a TouchDesigner expression (references another op, project,
  // absTime, or contains arithmetic/brackets) -> apply as .expr.
  if (/op\s*\(|project\.|absTime|me\.|[\[\]/*+()]/.test(s)) {
    return { expr: s };
  }

  // Otherwise treat as a plain (menu/string) value.
  return { value: s };
}

/** Append a step line and collect any bridge errors for the final report. */
function recordStep(steps, bridgeErrors, res, label) {
  if (res && res.ok) {
    steps.push(`  [ok] ${label}`);
  } else {
    const msg = (res && res.error) || "unknown error";
    steps.push(`  [FAIL] ${label} — ${msg}`);
    bridgeErrors.push(`${label}: ${msg}`);
  }
  // Surface TD-side errors/scriptErrors even when ok===true.
  if (res) {
    for (const e of res.scriptErrors || []) bridgeErrors.push(`${label} (scriptError): ${e}`);
    for (const e of res.errors || []) bridgeErrors.push(`${label} (error): ${e}`);
  }
}

/** Render the final step-by-step build report. */
function finish(key, parent, steps, bridgeErrors, aborted) {
  let t = `# Build template '${key}' -> ${parent}\n\n`;
  if (aborted) {
    t += `BUILD ABORTED — a create_operator command failed; remaining steps were skipped.\n\n`;
  }
  t += `Steps:\n${steps.join("\n")}\n`;
  if (bridgeErrors.length > 0) {
    t += `\nBridge errors/warnings (${bridgeErrors.length}):\n`;
    for (const e of bridgeErrors) t += `  ! ${e}\n`;
  } else if (!aborted) {
    t += `\nNo bridge errors reported. Use td_render on a TOP (e.g. ${parent}/out1) to view the result, or td_get_errors to double-check.`;
  }
  return mcpText(t.trimEnd());
}
