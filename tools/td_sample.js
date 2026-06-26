/**
 * td_sample — Live-control tool.
 *
 * Samples a single value from an operator in a running TouchDesigner instance
 * via the td_mcp bridge:
 *   - 'chop_channel' -> CHOP.chan(name) value(s) (CHOP_Class)
 *   - 'top_pixel'    -> TOP.sample(u=, v=) pixel color (TOP_Class)
 * Both are documented calls. Use this to read back concrete values for
 * verification without rendering a full frame.
 *
 * @module tools/td_sample
 */

import { z } from "zod";
import { sendCommand, mcpResult } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Sample (live)",
  description:
    "Sample a single value from an operator in a running TouchDesigner instance " +
    "(live control via the td_mcp bridge). " +
    "kind='chop_channel' reads a CHOP channel via CHOP.chan(name); " +
    "kind='top_pixel' reads a pixel via TOP.sample(u, v). " +
    "Use this to verify concrete output values without rendering a full frame.",
  inputSchema: {
    path: z
      .string()
      .describe("Full path of the operator to sample, e.g. '/td_mcp/sandbox/noise1'."),
    kind: z
      .enum(["chop_channel", "top_pixel"])
      .describe(
        "What to sample: 'chop_channel' (CHOP.chan) or 'top_pixel' (TOP.sample)."
      ),
    channel: z
      .string()
      .optional()
      .describe(
        "For kind='chop_channel': the channel name to read (e.g. 'chan1'). Required for CHOPs."
      ),
    u: z
      .number()
      .optional()
      .describe(
        "For kind='top_pixel': horizontal sample coordinate (0..1 normalized, or a pixel index)."
      ),
    v: z
      .number()
      .optional()
      .describe(
        "For kind='top_pixel': vertical sample coordinate (0..1 normalized, or a pixel index)."
      )
  }
};

// Tool handler. Forward the kind-specific args to the bridge; the bridge picks
// the documented call (CHOP.chan vs TOP.sample) based on 'kind'.
export async function handler({ path, kind, channel, u, v }) {
  const res = await sendCommand("sample", { path, kind, channel, u, v });
  return mcpResult(res);
}
