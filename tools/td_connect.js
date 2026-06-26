/**
 * td_connect — Live-control tool.
 *
 * Wires one operator's output into another operator's input in a running
 * TouchDesigner instance via the td_mcp bridge. On the TD side this drives the
 * documented Connector.connect() call (Connector_Class):
 *   op(to).inputConnectors[toIn].connect(op(from).outputConnectors[fromOut])
 *
 * @module tools/td_connect
 */

import { z } from "zod";
import { sendCommand, mcpResult } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Connect (live)",
  description:
    "Connect one operator's output to another operator's input in a running " +
    "TouchDesigner instance (live control via the td_mcp bridge). Wraps the " +
    "documented Connector.connect() call " +
    "(op(to).inputConnectors[toIn].connect(op(from).outputConnectors[fromOut])).",
  inputSchema: {
    from_path: z
      .string()
      .describe(
        "Full path of the source operator providing the output, " +
        "e.g. '/td_mcp/sandbox/noise1'."
      ),
    from_output: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        "Output connector index on the source operator (0-based). Defaults to 0."
      ),
    to_path: z
      .string()
      .describe(
        "Full path of the destination operator receiving the input, " +
        "e.g. '/td_mcp/sandbox/blur1'."
      ),
    to_input: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        "Input connector index on the destination operator (0-based). Defaults to 0."
      )
  }
};

// Tool handler. The bridge command expects {from, fromOut, to, toIn}.
export async function handler({ from_path, from_output = 0, to_path, to_input = 0 }) {
  const res = await sendCommand("connect", {
    from: from_path,
    fromOut: from_output,
    to: to_path,
    toIn: to_input
  });
  return mcpResult(res);
}
