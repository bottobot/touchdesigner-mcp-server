/**
 * td_build_glsl — Node-side COMPILER for GLSL shader techniques in
 * wiki/data/experimental/glsl.json.
 *
 * For a SUPPORTED technique (one whose `setup` block carries BOTH a
 * machine-readable `operators_needed` list AND a `uniforms` list), this tool:
 *   1. creates a Text DAT and loads the shader source into it,
 *   2. creates a GLSL TOP,
 *   3. points the GLSL TOP's pixel-shader at the Text DAT (Pixel Dat param),
 *   4. declares each uniform on the GLSL TOP (name + value/expr),
 *   5. creates any supporting operators listed in the setup and lays out.
 *
 * For an UNSUPPORTED technique (no `setup`, or a `setup` lacking a
 * machine-readable uniforms list — e.g. multi-pass feedback systems that need
 * hand wiring), it does NOT fabricate connections. Instead it returns the
 * technique's shader snippet plus a clear explanation of why it needs manual
 * wiring and what the setup notes say to do.
 *
 * All emitted commands use documented TouchDesigner calls (COMP.create,
 * op.par.NAME.val/.expr, Connector.connect).
 *
 * @module tools/td_build_glsl
 */

import { z } from "zod";
import { sendCommand, mcpText, resolveOpType, resolveParName } from "./td-live/client.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GLSL_PATH = join(__dirname, "..", "wiki", "data", "experimental", "glsl.json");

const DEFAULT_PARENT = "/td_mcp/sandbox";

let _glslCache = null;
async function loadGlsl() {
  if (_glslCache) return _glslCache;
  try {
    _glslCache = JSON.parse(await readFile(GLSL_PATH, "utf-8"));
  } catch {
    _glslCache = { techniques: [] };
  }
  return _glslCache;
}

/** Find a technique by id or case-insensitive name. */
function findTechnique(techniques, key) {
  const lower = String(key || "").toLowerCase().trim();
  return (
    techniques.find((t) => String(t.id).toLowerCase() === lower) ||
    techniques.find((t) => String(t.name).toLowerCase() === lower) ||
    null
  );
}

/**
 * A technique is auto-buildable only when its setup block is machine-readable:
 * it must have a non-empty operators_needed list AND a non-empty uniforms list.
 * (Multi-pass / feedback techniques omit the uniforms list and require manual
 * wiring — we never fabricate those connections.)
 */
function isBuildable(tech) {
  const setup = tech && tech.setup;
  return !!(
    setup &&
    Array.isArray(setup.operators_needed) &&
    setup.operators_needed.length > 0 &&
    Array.isArray(setup.uniforms) &&
    setup.uniforms.length > 0
  );
}

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Build GLSL (live)",
  description:
    "COMPILE a GLSL shader technique from the experimental GLSL knowledge base " +
    "into a running TouchDesigner instance via the td_mcp bridge. For a SUPPORTED " +
    "technique (its setup block has machine-readable operators + uniforms) it " +
    "creates a Text DAT with the shader, a GLSL TOP pointed at that DAT, declares " +
    "the uniforms, creates supporting operators and lays out. For an UNSUPPORTED " +
    "technique (multi-pass/feedback systems needing hand wiring) it returns the " +
    "shader code plus an explanation and does NOT fabricate connections. Builds " +
    "into the sandbox COMP by default (" + DEFAULT_PARENT + "). Use technique:'list' " +
    "to enumerate. Requires the bridge (see td_status).",
  inputSchema: {
    technique: z
      .string()
      .describe(
        "Technique id or name from the GLSL KB (e.g. 'raymarching_basic', " +
        "'Gray-Scott Reaction-Diffusion'). Use 'list' to enumerate techniques " +
        "and whether each is auto-buildable."
      ),
    parent: z
      .string()
      .optional()
      .describe(`Parent COMP to build inside. Defaults to ${DEFAULT_PARENT}.`)
  }
};

// Tool handler
export async function handler({ technique, parent = DEFAULT_PARENT } = {}) {
  const data = await loadGlsl();
  const techniques = Array.isArray(data.techniques) ? data.techniques : [];

  // List mode.
  if (String(technique).toLowerCase().trim() === "list") {
    if (techniques.length === 0) return mcpText("No GLSL techniques found in the knowledge base.");
    let t = `# GLSL techniques (${techniques.length})\n\n`;
    for (const tech of techniques) {
      const tag = isBuildable(tech) ? "auto-buildable" : "manual wiring";
      t += `- \`${tech.id}\` — ${tech.name} [${tag}]\n`;
    }
    return mcpText(t.trimEnd());
  }

  const tech = findTechnique(techniques, technique);
  if (!tech) {
    const ids = techniques.map((t) => t.id).join(", ");
    return mcpText(
      `No GLSL technique "${technique}". Use technique:"list" to enumerate.\n` +
      `Available ids: ${ids}`
    );
  }

  const shaderSrc = tech.code && tech.code.snippet ? tech.code.snippet : "";

  // ---- Unsupported -> return snippet + manual-wiring explanation -------------
  if (!isBuildable(tech)) {
    return mcpText(renderManual(tech, shaderSrc));
  }

  // ---- Supported -> compile to atomic commands ------------------------------
  // Resolve the createTypes / parNames we need before mutating anything.
  const textDatType = await resolveOpType("Text DAT");
  const glslTopType = await resolveOpType("GLSL TOP");

  const missing = [];
  if (!textDatType) missing.push("operator type 'Text DAT' — no createType in the operator map");
  if (!glslTopType) missing.push("operator type 'GLSL TOP' — no createType in the operator map");

  // The pixel-shader DAT parameter on the GLSL TOP (documented label
  // "Pixel Shader" -> par 'pixeldat'); resolve via the map, fall back to the
  // documented parName if the map has no entry for it.
  let pixelDatPar = await resolveParName("GLSL TOP", "Pixel Shader");
  if (!pixelDatPar) pixelDatPar = await resolveParName("GLSL TOP", "Pixel Dat");
  if (!pixelDatPar) pixelDatPar = "pixeldat"; // documented GLSL TOP parameter name

  // Resolve supporting operators from the setup (excluding the GLSL TOP / Text
  // DAT we create explicitly).
  const support = [];
  for (const need of tech.setup.operators_needed) {
    const opName = need.op;
    if (/glsl/i.test(opName) || /text dat/i.test(opName)) continue; // handled explicitly
    const createType = await resolveOpType(opName);
    if (!createType) {
      missing.push(`supporting operator '${opName}' — no createType in the operator map`);
    }
    support.push({ name: opName, createType, purpose: need.purpose, settings: need.settings });
  }

  if (missing.length > 0) {
    let t = `Cannot build GLSL technique '${tech.id}' — ${missing.length} unresolved item(s) in the operator map.\n`;
    t += `Refusing to build a partial/guessed network.\n\nMissing:\n`;
    for (const m of missing) t += `  - ${m}\n`;
    t += `\nFix: add these to wiki/data/maps/operators.json and retry, or rely on the manual snippet (technique:"list").`;
    return mcpText(t);
  }

  const steps = [];
  const bridgeErrors = [];

  // Node names inside the parent.
  const datName = `${tech.id}_src`;
  const glslName = `${tech.id}_glsl`;

  // 1) Text DAT holding the shader.
  let res = await sendCommand("create_operator", { parent, opType: textDatType, name: datName });
  recordStep(steps, bridgeErrors, res, `create ${textDatType} '${datName}' (Text DAT shader holder)`);
  if (!res.ok) return finish(tech, parent, steps, bridgeErrors, true);

  // Load the shader source into the Text DAT's 'text' parameter.
  res = await sendCommand("set_parameter", {
    path: `${parent}/${datName}`,
    par: "text",
    value: shaderSrc
  });
  recordStep(steps, bridgeErrors, res, `set ${datName}.text <shader source (${shaderSrc.length} chars)>`);

  // 2) GLSL TOP.
  res = await sendCommand("create_operator", { parent, opType: glslTopType, name: glslName });
  recordStep(steps, bridgeErrors, res, `create ${glslTopType} '${glslName}'`);
  if (!res.ok) return finish(tech, parent, steps, bridgeErrors, true);

  // 3) Point the GLSL TOP pixel shader at the Text DAT.
  res = await sendCommand("set_parameter", {
    path: `${parent}/${glslName}`,
    par: pixelDatPar,
    value: datName
  });
  recordStep(steps, bridgeErrors, res, `set ${glslName}.${pixelDatPar} = ${datName}`);

  // 4) Declare uniforms on the GLSL TOP. The GLSL TOP exposes numbered uniform
  // name/value rows (documented params 'uniname0', 'unitype0', 'uniform0x'...).
  // We set the name + a source value/expr per uniform.
  let uniIndex = 0;
  for (const u of tech.setup.uniforms) {
    const namePar = `uniname${uniIndex}`;
    const valPar = `uniformvalue${uniIndex}`; // first value slot for a float uniform
    // Uniform name.
    res = await sendCommand("set_parameter", {
      path: `${parent}/${glslName}`,
      par: namePar,
      value: u.name
    });
    recordStep(steps, bridgeErrors, res, `set ${glslName}.${namePar} = ${u.name}`);

    // Uniform source: expressions (absTime.seconds, op(...) etc.) -> .expr,
    // plain numbers -> value.
    const src = String(u.source ?? "").trim();
    if (src) {
      const isExpr = /absTime|op\s*\(|project\.|me\.|[*+/()\[\]]/.test(src) && !/^-?\d+(\.\d+)?$/.test(src);
      const args = isExpr
        ? { path: `${parent}/${glslName}`, par: valPar, expr: src }
        : { path: `${parent}/${glslName}`, par: valPar, value: /^-?\d+(\.\d+)?$/.test(src) ? Number(src) : src };
      res = await sendCommand("set_parameter", args);
      recordStep(
        steps,
        bridgeErrors,
        res,
        `set ${glslName}.${valPar} ${isExpr ? "expr" : "value"}=${src}  (uniform ${u.name})`
      );
    }
    uniIndex += 1;
  }

  // 5) Create supporting operators (e.g. Constant CHOP driving uTime). We do
  // NOT fabricate wiring between them and the GLSL TOP — uniforms are bound by
  // name/expression above, and any further wiring is left to the notes.
  for (const s of support) {
    const sName = sanitizeId(s.name);
    res = await sendCommand("create_operator", { parent, opType: s.createType, name: sName });
    recordStep(
      steps,
      bridgeErrors,
      res,
      `create ${s.createType} '${sName}'${s.purpose ? ` — ${s.purpose}` : ""}`
    );
  }

  // 6) Layout.
  res = await sendCommand("layout", { parent });
  recordStep(steps, bridgeErrors, res, `layout '${parent}'`);

  return finish(tech, parent, steps, bridgeErrors, false);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function sanitizeId(name) {
  const cleaned = String(name)
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
  return cleaned || "op";
}

function recordStep(steps, bridgeErrors, res, label) {
  if (res && res.ok) {
    steps.push(`  [ok] ${label}`);
  } else {
    const msg = (res && res.error) || "unknown error";
    steps.push(`  [FAIL] ${label} — ${msg}`);
    bridgeErrors.push(`${label}: ${msg}`);
  }
  if (res) {
    for (const e of res.scriptErrors || []) bridgeErrors.push(`${label} (scriptError): ${e}`);
    for (const e of res.errors || []) bridgeErrors.push(`${label} (error): ${e}`);
  }
}

function finish(tech, parent, steps, bridgeErrors, aborted) {
  let t = `# Build GLSL technique '${tech.id}' (${tech.name}) -> ${parent}\n\n`;
  if (aborted) {
    t += `BUILD ABORTED — a create_operator command failed; remaining steps were skipped.\n\n`;
  }
  t += `Steps:\n${steps.join("\n")}\n`;
  if (tech.notes) t += `\nSetup notes: ${tech.notes}\n`;
  if (bridgeErrors.length > 0) {
    t += `\nBridge errors/warnings (${bridgeErrors.length}):\n`;
    for (const e of bridgeErrors) t += `  ! ${e}\n`;
  } else if (!aborted) {
    t += `\nNo bridge errors reported. Render the GLSL TOP with td_render to view the result, ` +
      `or td_get_errors to check for shader-compile errors.`;
  }
  return mcpText(t.trimEnd());
}

/**
 * For unsupported techniques: return the shader snippet plus a clear,
 * non-fabricated explanation of the manual wiring the technique requires.
 */
function renderManual(tech, shaderSrc) {
  let t = `# GLSL technique '${tech.id}' (${tech.name}) — manual wiring required\n\n`;
  t += `This technique is NOT auto-buildable: its knowledge-base entry has no ` +
    `machine-readable setup (operators + uniforms), so wiring it automatically ` +
    `would mean guessing connections. The shader code is provided below for you ` +
    `to wire by hand.\n\n`;

  if (tech.description) t += `${tech.description}\n\n`;

  if (Array.isArray(tech.operators) && tech.operators.length > 0) {
    t += `Operators involved: ${tech.operators.join(", ")}\n`;
  }
  if (tech.notes) t += `\nWiring notes (from the KB): ${tech.notes}\n`;

  // If there is a non-machine-readable setup block, surface its operator list.
  if (tech.setup && Array.isArray(tech.setup.operators_needed)) {
    t += `\nOperators needed:\n`;
    for (const n of tech.setup.operators_needed) {
      t += `  - ${n.op}${n.purpose ? `: ${n.purpose}` : ""}${n.settings ? ` (settings: ${JSON.stringify(n.settings)})` : ""}\n`;
    }
  }

  if (shaderSrc) {
    t += `\nShader source:\n\`\`\`${(tech.code && tech.code.language) || "glsl"}\n${shaderSrc}\n\`\`\`\n`;
  }

  // Some techniques carry a second visualization shader.
  if (tech.visualization_shader && tech.visualization_shader.snippet) {
    t += `\nVisualization shader (${tech.visualization_shader.description || "colorize pass"}):\n`;
    t += `\`\`\`glsl\n${tech.visualization_shader.snippet}\n\`\`\`\n`;
  }

  t += `\nTo build a simple single-pass shader automatically instead, pick a technique ` +
    `marked [auto-buildable] in technique:"list".`;
  return t;
}
