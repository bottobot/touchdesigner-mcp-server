/**
 * td_status - Live-control health check for the TouchDesigner bridge.
 *
 * Sends the bridge's `status` command and reports whether the bridge is
 * reachable and the configured token is accepted. On any failure it surfaces
 * the install hint returned by the shared client so the user knows how to get
 * the td_mcp_bridge running.
 *
 * Part of the "live control" tool family that talks to a running
 * TouchDesigner 2025 instance over the HTTP command bridge.
 * @module tools/td_status
 */

// No zod import needed — this tool takes no inputs (empty inputSchema).
import { sendCommand, mcpText } from "./td-live/client.js";

// Tool schema — no inputs; this is a pure health probe.
export const schema = {
  title: "TouchDesigner Live Status",
  description:
    "Check whether the live-control TouchDesigner bridge is reachable and the " +
    "configured token is accepted. Returns a short status report, or an " +
    "install/setup hint when the bridge cannot be reached. Reads connection " +
    "settings from TD_MCP_HOST, TD_MCP_PORT and TD_MCP_TOKEN.",
  inputSchema: {}
};

// Tool handler
export async function handler() {
  const res = await sendCommand("status", {});

  // The shared client never throws; a transport failure comes back as
  // { ok:false, error:"Cannot reach the TouchDesigner bridge..." } which
  // already contains the install hint.
  if (!res.ok) {
    return mcpText(
      "TouchDesigner bridge: NOT reachable.\n" +
      (res.error || "Unknown error contacting the bridge.")
    );
  }

  // The bridge answered. result may carry version / build / sandbox details.
  let text = "TouchDesigner bridge: reachable and token accepted.\n";

  const r = res.result;
  if (r && typeof r === "object") {
    // Surface any well-known status fields if the bridge provides them.
    if (r.tdVersion) text += `TouchDesigner version: ${r.tdVersion}\n`;
    if (r.build) text += `Build: ${r.build}\n`;
    if (r.bridgeVersion) text += `Bridge version: ${r.bridgeVersion}\n`;
    if (r.sandbox) text += `Sandbox path: ${r.sandbox}\n`;
    if (typeof r.allowPython === "boolean") {
      text += `Allow Python: ${r.allowPython ? "enabled" : "disabled"}\n`;
    }
    // Fall back to dumping the raw result if none of the known fields matched.
    const knownKeys = ["tdVersion", "build", "bridgeVersion", "sandbox", "allowPython"];
    const hasKnown = knownKeys.some((k) => k in r);
    if (!hasKnown) {
      text += `Bridge details: ${JSON.stringify(r)}\n`;
    }
  } else if (r !== undefined && r !== null) {
    text += `Bridge details: ${String(r)}\n`;
  }

  // Pass through any non-fatal warnings the bridge reported.
  if (Array.isArray(res.warnings) && res.warnings.length > 0) {
    text += `Warnings:\n  - ${res.warnings.join("\n  - ")}\n`;
  }

  return mcpText(text.trimEnd());
}
