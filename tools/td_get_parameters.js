/**
 * td_get_parameters — Live-control tool (read-only).
 *
 * Reads an operator's parameters from a running TouchDesigner instance:
 * scripting name, label, current value, bound expression (if any), page, and —
 * for menu parameters — the VALID menu tokens and labels. This is the
 * perception half of the set_parameter loop: call it to discover what a
 * parameter is called, what it currently holds, and which values it accepts,
 * then set it with td_set_parameter.
 *
 * On the TD side this uses only documented calls: OP.pars(pattern) and the
 * Par members name/label/val/expr/menuNames/menuLabels (OP_Class / Par_Class).
 *
 * @module tools/td_get_parameters
 */

import { z } from "zod";
import { sendCommand, mcpText, mcpResult } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Get Parameters (live)",
  description:
    "Read an operator's parameters from a running TouchDesigner instance " +
    "(live control via the td_mcp bridge): scripting name, label, current " +
    "value, bound expression, page, and for menu parameters the valid menu " +
    "tokens. Use this to discover what a parameter is called and which values " +
    "it accepts BEFORE setting it with td_set_parameter, or to inspect state " +
    "while debugging a network. Read-only. Filter with `pattern` " +
    "(e.g. 'res*') to keep the result small.",
  inputSchema: {
    path: z
      .string()
      .describe(
        "Full path of the operator to inspect, e.g. '/td_mcp/sandbox/noise1'."
      ),
    pattern: z
      .string()
      .optional()
      .describe(
        "Parameter name pattern passed to the documented OP.pars(pattern) " +
        "call (default '*' = all). Example: 'res*' for resolution parameters."
      )
  }
};

// Tool handler. Renders the parameter list as a compact readable table.
export async function handler({ path, pattern }) {
  const res = await sendCommand("get_parameters", { path, pattern });
  if (!res.ok || !res.result || !Array.isArray(res.result.parameters)) {
    return mcpResult(res);
  }

  const { parameters, count } = res.result;
  let t = `# Parameters of ${res.result.path} (${count})\n`;
  if (pattern) t += `Pattern: ${pattern}\n`;
  t += "\n";
  let page = null;
  for (const p of parameters) {
    if (p.page && p.page !== page) {
      page = p.page;
      t += `\n## ${page}\n`;
    }
    let line = `- \`${p.name}\` (${p.label})`;
    if (p.expr) line += ` expr=\`${p.expr}\``;
    else line += ` = ${JSON.stringify(p.val)}`;
    if (p.menuNames) {
      line += ` — menu: ${p.menuNames.join(", ")}`;
    }
    t += line + "\n";
  }
  if (res.warnings && res.warnings.length) {
    t += `\n⚠️ Warnings:\n- ${res.warnings.join("\n- ")}`;
  }
  return mcpText(t.trimEnd());
}
