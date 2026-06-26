/**
 * td_set_parameter — Live-control tool.
 *
 * Sets a parameter on an operator in a running TouchDesigner instance via the
 * td_mcp bridge. On the TD side this drives the documented Par members:
 *   - value : op.par.NAME.val = value
 *   - expr  : op.par.NAME.expr = 'expr'
 *   - pulse : op.par.NAME.pulse()
 *
 * The `parameter` input accepts either a documented parameter label (e.g.
 * 'Resolution') or an already-correct parameter name (e.g. 'resolutionw');
 * labels are resolved to parameter names through the operator map
 * (resolveParName), and an unresolved value is passed through unchanged so a
 * valid parName always works even when no map entry exists.
 *
 * @module tools/td_set_parameter
 */

import { z } from "zod";
import { sendCommand, mcpResult, mcpText, resolveParName } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Set Parameter (live)",
  description:
    "Set a parameter on an operator in a running TouchDesigner instance " +
    "(live control via the td_mcp bridge). Drives the documented " +
    "op.par.NAME.val (value), op.par.NAME.expr (expr) and op.par.NAME.pulse() " +
    "members. " +
    "`parameter` may be a documented label (e.g. 'Period') or an exact " +
    "parameter name (e.g. 'period'); labels are resolved via the operator map. " +
    "Provide exactly one of value, expr, or pulse.",
  inputSchema: {
    path: z
      .string()
      .describe(
        "Full path of the operator whose parameter is set, " +
        "e.g. '/td_mcp/sandbox/noise1'."
      ),
    parameter: z
      .string()
      .describe(
        "Parameter to set. Either a documented label (e.g. 'Period') or an " +
        "exact parameter name (e.g. 'period'). Labels are resolved to the " +
        "parameter name via the operator map; correct names pass through."
      ),
    value: z
      .union([z.string(), z.number(), z.boolean()])
      .optional()
      .describe(
        "Constant value to assign (sets op.par.NAME.val). " +
        "Use this OR expr OR pulse."
      ),
    expr: z
      .string()
      .optional()
      .describe(
        "Python expression to bind (sets op.par.NAME.expr), " +
        "e.g. 'absTime.seconds'. Use this OR value OR pulse."
      ),
    pulse: z
      .boolean()
      .optional()
      .describe(
        "When true, pulses the parameter (calls op.par.NAME.pulse()), " +
        "used for momentary/trigger parameters like 'Reset'. " +
        "Use this OR value OR expr."
      )
  }
};

// Tool handler. The bridge command expects {path, par, value?, expr?, pulse?}.
export async function handler({ path, parameter, value, expr, pulse }) {
  // Guard: exactly one mode must be supplied so intent is unambiguous.
  const modeCount =
    (value !== undefined ? 1 : 0) +
    (expr !== undefined ? 1 : 0) +
    (pulse ? 1 : 0);
  if (modeCount === 0) {
    return mcpText(
      "Nothing to set: provide exactly one of 'value' (constant), " +
      "'expr' (Python expression), or 'pulse' (true)."
    );
  }
  if (modeCount > 1) {
    return mcpText(
      "Ambiguous request: provide only one of 'value', 'expr', or 'pulse', " +
      "not more than one at a time."
    );
  }

  // Best-effort resolution of a label to a parameter name. resolveParName looks
  // up the op's params map and accepts either a label or an already-correct
  // parName; on miss it returns null and we pass the original value through so a
  // valid parName still works without a map entry.
  const par = (await resolveParName(path, parameter)) || parameter;

  // Build args with only the supplied mode so the bridge applies a single action.
  const args = { path, par };
  if (value !== undefined) args.value = value;
  if (expr !== undefined) args.expr = expr;
  if (pulse) args.pulse = true;

  const res = await sendCommand("set_parameter", args);
  return mcpResult(res);
}
