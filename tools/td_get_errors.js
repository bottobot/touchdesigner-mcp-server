/**
 * td_get_errors — Live-control tool.
 *
 * Reads cook errors, warnings and script errors from an operator in a running
 * TouchDesigner instance via the td_mcp bridge. Uses the documented
 * op.errors(recurse)/op.warnings(recurse)/op.scriptErrors(recurse) calls
 * (OP_Class) on the TD side.
 *
 * @module tools/td_get_errors
 */

import { z } from "zod";
import { sendCommand, mcpResult } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Get Errors (live)",
  description:
    "Read cook errors, warnings, and script errors from an operator in a running " +
    "TouchDesigner instance (live control via the td_mcp bridge). " +
    "Returns the documented op.errors()/op.warnings()/op.scriptErrors() output. " +
    "Use this to diagnose why a node is not cooking after a build/edit.",
  inputSchema: {
    path: z
      .string()
      .describe(
        "Full path of the operator to inspect, e.g. '/td_mcp/sandbox/noise1'."
      ),
    recurse: z
      .boolean()
      .optional()
      .describe(
        "When true (default), include errors from the operator's children as well."
      )
  }
};

// Tool handler.
export async function handler({ path, recurse = true }) {
  const res = await sendCommand("get_errors", { path, recurse });
  return mcpResult(res);
}
