/**
 * td_set_text — Live-control tool.
 *
 * Sets the CONTENTS of a DAT (Text DAT, Table DAT, …) in a running
 * TouchDesigner instance. A DAT's contents are the documented DAT.text
 * writable MEMBER (DAT_Class) — they are not a parameter, so this cannot be
 * done with td_set_parameter. Use it to load Python into a Text DAT, rows
 * into a Table DAT (tab-delimited columns, newline rows), or GLSL into a
 * shader DAT.
 *
 * @module tools/td_set_text
 */

import { z } from "zod";
import { sendCommand, mcpResult } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Set Text (live)",
  description:
    "Set the CONTENTS of a DAT (Text DAT, Table DAT, …) in a running " +
    "TouchDesigner instance via the td_mcp bridge — the documented DAT.text " +
    "writable member. DAT contents are not a parameter, so td_set_parameter " +
    "cannot do this. For a Table DAT use newline-separated rows with " +
    "tab-separated columns. Sandbox rules apply (see td_create_operator).",
  inputSchema: {
    path: z
      .string()
      .describe(
        "Full path of the DAT whose contents are set, " +
        "e.g. '/td_mcp/sandbox/table1'."
      ),
    text: z
      .string()
      .describe(
        "The full new contents. Replaces everything the DAT currently holds."
      )
  }
};

// Tool handler. The bridge command expects {path, text}.
export async function handler({ path, text }) {
  const res = await sendCommand("set_text", { path, text });
  return mcpResult(res);
}
