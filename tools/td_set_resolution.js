/**
 * td_set_resolution — Live-control tool.
 *
 * Sets the output resolution of a TOP in a running TouchDesigner instance via
 * the td_mcp bridge. On the TD side this drives the documented resolution
 * parameters (e.g. op.par.resolutionw / op.par.resolutionh) of the target TOP.
 *
 * @module tools/td_set_resolution
 */

import { z } from "zod";
import { sendCommand, mcpResult } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Set Resolution (live)",
  description:
    "Set the output resolution (width x height in pixels) of a TOP in a running " +
    "TouchDesigner instance (live control via the td_mcp bridge). " +
    "Targets a TOP's documented resolution parameters.",
  inputSchema: {
    path: z
      .string()
      .describe("Full path of the TOP to resize, e.g. '/td_mcp/sandbox/render1'."),
    width: z
      .number()
      .int()
      .positive()
      .describe("New output width in pixels (must be a positive integer)."),
    height: z
      .number()
      .int()
      .positive()
      .describe("New output height in pixels (must be a positive integer).")
  }
};

// Tool handler. The bridge command expects {path, w, h}.
export async function handler({ path, width, height }) {
  const res = await sendCommand("set_resolution", { path, w: width, h: height });
  return mcpResult(res);
}
