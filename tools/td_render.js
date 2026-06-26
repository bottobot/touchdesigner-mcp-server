/**
 * td_render — Live-control tool.
 *
 * Renders the current frame of a TOP in a running TouchDesigner instance and
 * returns the encoded image so the assistant can SEE the result. On the TD side
 * this uses the documented TOP.saveByteArray(filetype) call (TOP_Class), and
 * the bridge returns the bytes as base64 in result.imageBase64.
 *
 * @module tools/td_render
 */

import { z } from "zod";
import { sendCommand, mcpResult } from "./td-live/client.js";

// Map a TouchDesigner saveByteArray filetype to a MIME type for the MCP image
// content block. saveByteArray supports the common image container formats.
const MIME_BY_FILETYPE = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".exr": "image/x-exr",
  ".dds": "image/vnd.ms-dds"
};

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Render (live)",
  description:
    "Render the current frame of a TOP in a running TouchDesigner instance and " +
    "return the image so the assistant can see the result (live control via the " +
    "td_mcp bridge). Uses the documented TOP.saveByteArray() call. " +
    "Use this after building/editing a network to visually verify the output.",
  inputSchema: {
    path: z
      .string()
      .describe("Full path of the TOP to render, e.g. '/td_mcp/sandbox/comp1'."),
    filetype: z
      .string()
      .optional()
      .describe(
        "Image container filetype passed to saveByteArray (default '.png'). " +
        "Common values: '.png', '.jpg', '.bmp', '.tiff', '.exr'."
      )
  }
};

// Tool handler. When the bridge returns result.imageBase64, surface it as an MCP
// image content block (this is how the assistant sees the frame). Otherwise fall
// back to the standard JSON summary so errors/warnings remain visible.
export async function handler({ path, filetype = ".png" }) {
  const res = await sendCommand("render", { path, filetype });

  const imageBase64 = res && res.ok && res.result && res.result.imageBase64;
  if (imageBase64) {
    const ext = String(filetype).toLowerCase();
    const mimeType = MIME_BY_FILETYPE[ext] || "image/png";
    return {
      content: [
        {
          type: "image",
          data: imageBase64,
          mimeType
        }
      ]
    };
  }

  // No image payload (e.g. bridge unreachable, op not a TOP, or an error) —
  // return the formatted result/error so the caller can diagnose.
  return mcpResult(res);
}
