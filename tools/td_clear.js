/**
 * td_clear - Delete every operator inside the live-control sandbox COMP.
 *
 * Sends the bridge's `clear` command for a given parent COMP. By design the
 * bridge only clears operators *within* the sandbox so it cannot wipe the
 * user's wider TouchDesigner project.
 *
 * Part of the "live control" tool family that talks to a running
 * TouchDesigner 2025 instance over the HTTP command bridge.
 * @module tools/td_clear
 */

import { z } from "zod";
import { sendCommand, mcpText } from "./td-live/client.js";

// Mutating live tools default to the dedicated sandbox COMP.
const DEFAULT_PARENT = "/td_mcp/sandbox";

// Tool schema
export const schema = {
  title: "TouchDesigner Clear Network",
  description:
    "Delete every operator inside the live-control sandbox COMP. Only clears " +
    `operators within the sandbox (default ${DEFAULT_PARENT}) — it will not ` +
    "touch the rest of your TouchDesigner project. Requires the TouchDesigner " +
    "bridge to be running (see td_status).",
  inputSchema: {
    parent: z
      .string()
      .optional()
      .describe(
        `Path to the sandbox COMP to clear. Defaults to ${DEFAULT_PARENT}.`
      )
  }
};

// Tool handler
export async function handler({ parent = DEFAULT_PARENT } = {}) {
  const res = await sendCommand("clear", { parent });

  if (!res.ok) {
    return mcpText(
      `Could not clear network '${parent}'.\n` +
      (res.error || "Unknown error from the bridge.")
    );
  }

  // The bridge may report how many operators were removed.
  const r = res.result;
  let removed;
  if (r && typeof r === "object") {
    removed = r.removed ?? r.deleted ?? r.count;
  } else if (typeof r === "number") {
    removed = r;
  }

  let text = `Cleared sandbox '${parent}'.`;
  if (typeof removed === "number") {
    text += ` Removed ${removed} operator${removed === 1 ? "" : "s"}.`;
  }
  text += "\nNote: only operators inside the sandbox were affected; the rest of your project is untouched.";

  if (Array.isArray(res.warnings) && res.warnings.length > 0) {
    text += `\nWarnings:\n  - ${res.warnings.join("\n  - ")}`;
  }

  return mcpText(text);
}
