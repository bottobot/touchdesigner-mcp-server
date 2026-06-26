/**
 * td_build_pattern — Node-side COMPILER for the linear workflow patterns in
 * data/patterns.json.
 *
 * A "pattern" in patterns.json is an ordered list of human operator names
 * (its `workflow` array), e.g. ["Movie File In", "Transform", "Level", "Out"].
 * This compiler builds that chain in a running TouchDesigner instance:
 *
 *   - create each operator in order
 *   - wire each operator's output 0 into the NEXT operator's input 0
 *   - layout the network
 *
 * IMPORTANT LIMITATION — LINEAR SINGLE-INPUT CHAINS ONLY.
 *   patterns.json describes a flat sequence with no port/branch information, so
 *   this tool can only build a straight chain (out0 -> in0). Patterns whose
 *   operators truly need multiple inputs (Composite, Switch, Lookup, Merge,
 *   Render with separate Geo/Cam/Light, etc.) will be wired naively as a single
 *   chain — the multi-input wiring is NOT inferred. For branched / multi-input
 *   networks, use td_build_template (which carries explicit port-level
 *   connections) instead.
 *
 * STRICT: every operator name must resolve to a createType via the operator
 * map; otherwise the tool hard-errors and lists the unresolved names rather
 * than guessing.
 *
 * @module tools/td_build_pattern
 */

import { z } from "zod";
import { sendCommand, mcpText, loadOperatorMap, resolveOpType } from "./td-live/client.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATTERNS_PATH = join(__dirname, "..", "data", "patterns.json");

const DEFAULT_PARENT = "/td_mcp/sandbox";

// Cache the parsed patterns file.
let _patternsCache = null;
async function loadPatterns() {
  if (_patternsCache) return _patternsCache;
  try {
    const txt = await readFile(PATTERNS_PATH, "utf-8");
    _patternsCache = JSON.parse(txt);
  } catch {
    // Fail soft — an empty pattern set still lets the tool report cleanly.
    _patternsCache = { patterns: [] };
  }
  return _patternsCache;
}

/** Find a pattern by exact or case-insensitive name match. */
function findPattern(patterns, name) {
  const lower = String(name || "").toLowerCase().trim();
  return (
    patterns.find((p) => p.name && p.name.toLowerCase() === lower) || null
  );
}

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Build Pattern (live)",
  description:
    "COMPILE a linear workflow pattern from data/patterns.json into a running " +
    "TouchDesigner instance via the td_mcp bridge. It creates each operator in " +
    "the pattern's workflow order and wires them as a STRAIGHT CHAIN " +
    "(each op's output 0 into the next op's input 0), then lays out the network. " +
    "LIMITATION: this only builds LINEAR SINGLE-INPUT chains — patterns.json " +
    "carries no port/branch data, so multi-input nodes (Composite, Switch, " +
    "Merge, Render, etc.) are NOT branch-wired; use td_build_template for " +
    "branched networks. Builds into the sandbox COMP by default (" +
    DEFAULT_PARENT + "). STRICT: hard-errors if any operator name has no " +
    "createType in the operator map. Requires the bridge (see td_status).",
  inputSchema: {
    pattern: z
      .string()
      .describe(
        "Pattern name exactly as it appears in data/patterns.json (e.g. " +
        "'Basic Video Input Chain', 'Image Filter Chain'). Use 'list' to see " +
        "all available pattern names."
      ),
    parent: z
      .string()
      .optional()
      .describe(`Parent COMP to build inside. Defaults to ${DEFAULT_PARENT}.`)
  }
};

// Tool handler
export async function handler({ pattern, parent = DEFAULT_PARENT } = {}) {
  const data = await loadPatterns();
  const patterns = Array.isArray(data.patterns) ? data.patterns : [];

  // List mode.
  if (String(pattern).toLowerCase().trim() === "list") {
    if (patterns.length === 0) return mcpText("No patterns found in data/patterns.json.");
    let t = `# Buildable linear patterns (${patterns.length})\n\n`;
    for (const p of patterns) {
      t += `- ${p.name} [${p.category}] — ${(p.workflow || []).join(" -> ")}\n`;
    }
    t += `\nNote: only linear single-input chains build correctly; use td_build_template for branched networks.`;
    return mcpText(t.trimEnd());
  }

  const pat = findPattern(patterns, pattern);
  if (!pat) {
    const names = patterns.map((p) => p.name).slice(0, 40).join(", ");
    return mcpText(
      `No pattern named "${pattern}". Use pattern:"list" to see all names.\n` +
      `Some available: ${names}`
    );
  }

  const workflow = Array.isArray(pat.workflow) ? pat.workflow : [];
  if (workflow.length === 0) {
    return mcpText(`Pattern "${pat.name}" has an empty workflow — nothing to build.`);
  }

  // ---- Resolve every operator name up-front (hard-error on gaps) ------------
  await loadOperatorMap(); // warm the cache (fails soft to {operators:{}})
  const resolved = []; // { name, createType, opId }
  const missing = [];
  const usedIds = {};
  for (const opName of workflow) {
    const createType = await resolveOpType(opName);
    if (!createType) {
      missing.push(opName);
    }
    // Generate a unique sanitized node id for this step.
    const base = sanitizeId(opName);
    let id = base;
    let n = 1;
    while (usedIds[id]) {
      n += 1;
      id = `${base}${n}`;
    }
    usedIds[id] = true;
    resolved.push({ name: opName, createType, opId: id });
  }

  if (missing.length > 0) {
    const uniq = [...new Set(missing)];
    let t = `Cannot build pattern '${pat.name}' — ${uniq.length} operator name(s) have no createType in the operator map.\n`;
    t += `Refusing to guess. Unresolved:\n`;
    for (const m of uniq) t += `  - ${m}\n`;
    t += `\nThese are short pattern names (e.g. "${uniq[0]}"); add a matching entry (by name) to wiki/data/maps/operators.json and retry.`;
    return mcpText(t);
  }

  // ---- Emit ordered atomic commands -----------------------------------------
  const steps = [];
  const bridgeErrors = [];

  // 1) create each operator in order.
  for (const r of resolved) {
    const res = await sendCommand("create_operator", {
      parent,
      opType: r.createType,
      name: r.opId
    });
    recordStep(steps, bridgeErrors, res, `create ${r.createType} '${r.opId}' (${r.name})`);
    if (!res.ok) {
      return finish(pat, parent, steps, bridgeErrors, /*aborted*/ true);
    }
  }

  // 2) wire the linear chain: out0 -> in0 for each adjacent pair.
  for (let i = 0; i < resolved.length - 1; i++) {
    const from = resolved[i];
    const to = resolved[i + 1];
    const res = await sendCommand("connect", {
      from: `${parent}/${from.opId}`,
      fromOut: 0,
      to: `${parent}/${to.opId}`,
      toIn: 0
    });
    recordStep(
      steps,
      bridgeErrors,
      res,
      `connect ${from.opId}[out 0] -> ${to.opId}[in 0]`
    );
  }

  // 3) layout.
  const layoutRes = await sendCommand("layout", { parent });
  recordStep(steps, bridgeErrors, layoutRes, `layout '${parent}'`);

  return finish(pat, parent, steps, bridgeErrors, /*aborted*/ false);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Turn a human operator name into a safe lowerCamel-ish node id. */
function sanitizeId(name) {
  const cleaned = String(name)
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
  return cleaned || "op";
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
  if (res) {
    for (const e of res.scriptErrors || []) bridgeErrors.push(`${label} (scriptError): ${e}`);
    for (const e of res.errors || []) bridgeErrors.push(`${label} (error): ${e}`);
  }
}

/** Render the final step-by-step build report. */
function finish(pat, parent, steps, bridgeErrors, aborted) {
  let t = `# Build pattern '${pat.name}' -> ${parent}\n`;
  t += `Chain: ${(pat.workflow || []).join(" -> ")}\n`;
  t += `(linear single-input wiring only)\n\n`;
  if (aborted) {
    t += `BUILD ABORTED — a create_operator command failed; remaining steps were skipped.\n\n`;
  }
  t += `Steps:\n${steps.join("\n")}\n`;
  if (bridgeErrors.length > 0) {
    t += `\nBridge errors/warnings (${bridgeErrors.length}):\n`;
    for (const e of bridgeErrors) t += `  ! ${e}\n`;
  } else if (!aborted) {
    t += `\nNo bridge errors reported. If a multi-input op in this chain looks wrong, ` +
      `rebuild with td_build_template (it carries explicit port wiring).`;
  }
  return mcpText(t.trimEnd());
}
