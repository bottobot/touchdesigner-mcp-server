/**
 * td_delete — Live-control tool.
 *
 * Deletes (destroys) an operator in a running TouchDesigner instance via the
 * td_mcp bridge. On the TD side this drives the documented op.destroy() call
 * (OP_Class), permanently removing the operator and its children.
 *
 * @module tools/td_delete
 */

import { z } from "zod";
import { sendCommand, mcpResult } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Delete (live)",
  description:
    "Delete (destroy) an operator in a running TouchDesigner instance " +
    "(live control via the td_mcp bridge). Wraps the documented op.destroy() " +
    "call. This permanently removes the operator and any of its children. " +
    "Target a path inside '/td_mcp/sandbox' to stay within the safe work area.",
  inputSchema: {
    path: z
      .string()
      .describe(
        "Full path of the operator to delete, " +
        "e.g. '/td_mcp/sandbox/noise1'."
      )
  }
};

// Tool handler. The bridge command expects {path}.
export async function handler({ path }) {
  const res = await sendCommand("delete", { path });
  return mcpResult(res);
}
