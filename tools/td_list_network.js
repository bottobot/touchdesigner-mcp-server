/**
 * td_list_network - List the operators inside a TouchDesigner network.
 *
 * Sends the bridge's `list_network` command for a given parent COMP and renders
 * the returned children as readable text (path, type, node position, input /
 * output counts, and error counts).
 *
 * Part of the "live control" tool family that talks to a running
 * TouchDesigner 2025 instance over the HTTP command bridge.
 * @module tools/td_list_network
 */

import { z } from "zod";
import { sendCommand, mcpText } from "./td-live/client.js";

// All mutating / inspecting live tools default to the dedicated sandbox COMP.
const DEFAULT_PARENT = "/td_mcp/sandbox";

// Tool schema
export const schema = {
  title: "TouchDesigner List Network",
  description:
    "List the operators inside a TouchDesigner network (a parent COMP). " +
    "Returns each child's path, type, node position, input/output counts and " +
    "error counts. Defaults to the live-control sandbox COMP " +
    `(${DEFAULT_PARENT}). Requires the TouchDesigner bridge to be running ` +
    "(see td_status).",
  inputSchema: {
    parent: z
      .string()
      .optional()
      .describe(
        `Path to the parent COMP whose network is listed. Defaults to ${DEFAULT_PARENT}.`
      ),
    max_depth: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        "How many levels deep to descend when listing children (default 1)."
      )
  }
};

// Tool handler
export async function handler({ parent = DEFAULT_PARENT, max_depth = 1 } = {}) {
  const res = await sendCommand("list_network", { parent, maxDepth: max_depth });

  if (!res.ok) {
    return mcpText(
      `Could not list network '${parent}'.\n` +
      (res.error || "Unknown error from the bridge.")
    );
  }

  // The bridge returns { parent, maxDepth, nodes:[...], count }. Accept that
  // (and a couple of alternative shapes) defensively.
  const r = res.result;
  let children = [];
  if (Array.isArray(r)) {
    children = r;
  } else if (r && Array.isArray(r.nodes)) {
    children = r.nodes;
  } else if (r && Array.isArray(r.children)) {
    children = r.children;
  }

  let text = `Network '${parent}' (max depth ${max_depth}) — `;
  text += `${children.length} operator${children.length === 1 ? "" : "s"}:\n\n`;

  if (children.length === 0) {
    text += "(empty)\n";
  } else {
    for (const c of children) {
      // Each child is expected to expose path/type/nodeX/nodeY/inputs/outputs/errors.
      const path = c.path ?? c.name ?? "(unknown)";
      const type = c.type ?? c.OPType ?? "?";
      const x = c.nodeX ?? "?";
      const y = c.nodeY ?? "?";
      const inputs = Array.isArray(c.inputs) ? c.inputs.length : (c.inputs ?? "?");
      const outputs = Array.isArray(c.outputs) ? c.outputs.length : (c.outputs ?? "?");

      text += `• ${path}\n`;
      text += `    type=${type}  pos=(${x}, ${y})  in=${inputs} out=${outputs}\n`;

      // Error / warning counts may be numbers or arrays depending on the bridge.
      const errCount = countOf(c.errors);
      const warnCount = countOf(c.warnings);
      if (errCount > 0 || warnCount > 0) {
        text += `    errors=${errCount} warnings=${warnCount}\n`;
        // If the bridge sent the actual error strings, show the first few.
        if (Array.isArray(c.errors) && c.errors.length > 0) {
          for (const e of c.errors.slice(0, 3)) {
            text += `      ! ${e}\n`;
          }
        }
      }
    }
  }

  // Surface any network-level warnings the bridge attached to the response.
  if (Array.isArray(res.warnings) && res.warnings.length > 0) {
    text += `\nWarnings:\n  - ${res.warnings.join("\n  - ")}\n`;
  }

  return mcpText(text.trimEnd());
}

// Normalize a value that may be an array (of messages) or a numeric count.
function countOf(v) {
  if (Array.isArray(v)) return v.length;
  if (typeof v === "number") return v;
  return 0;
}
