/**
 * td_layout - Auto-arrange the operators inside a TouchDesigner network.
 *
 * Sends the bridge's `layout` command for a given parent COMP so the nodes are
 * tidied into a readable arrangement (the bridge sets each operator's
 * nodeX/nodeY).
 *
 * Part of the "live control" tool family that talks to a running
 * TouchDesigner 2025 instance over the HTTP command bridge.
 * @module tools/td_layout
 */

import { z } from "zod";
import { sendCommand, mcpText } from "./td-live/client.js";

// Mutating live tools default to the dedicated sandbox COMP.
const DEFAULT_PARENT = "/td_mcp/sandbox";

// Tool schema
export const schema = {
  title: "TouchDesigner Layout Network",
  description:
    "Auto-arrange the operators inside a TouchDesigner network so the node " +
    `graph is tidy and readable. Operates on the sandbox COMP by default ` +
    `(${DEFAULT_PARENT}). Requires the TouchDesigner bridge to be running ` +
    "(see td_status).",
  inputSchema: {
    parent: z
      .string()
      .optional()
      .describe(
        `Path to the parent COMP whose children are laid out. Defaults to ${DEFAULT_PARENT}.`
      )
  }
};

// Tool handler
export async function handler({ parent = DEFAULT_PARENT } = {}) {
  const res = await sendCommand("layout", { parent });

  if (!res.ok) {
    return mcpText(
      `Could not lay out network '${parent}'.\n` +
      (res.error || "Unknown error from the bridge.")
    );
  }

  // The bridge may report how many operators were repositioned.
  const r = res.result;
  let arranged;
  if (r && typeof r === "object") {
    arranged = r.arranged ?? r.laidOut ?? r.count;
  } else if (typeof r === "number") {
    arranged = r;
  }

  let text = `Laid out network '${parent}'.`;
  if (typeof arranged === "number") {
    text += ` Arranged ${arranged} operator${arranged === 1 ? "" : "s"}.`;
  }

  if (Array.isArray(res.warnings) && res.warnings.length > 0) {
    text += `\nWarnings:\n  - ${res.warnings.join("\n  - ")}`;
  }

  return mcpText(text);
}
