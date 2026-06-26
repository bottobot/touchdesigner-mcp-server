/**
 * td_run_python — Execute arbitrary Python in a running TouchDesigner instance
 * via the td_mcp bridge's `run_python` command.
 *
 * SECURITY: this is ARBITRARY CODE EXECUTION inside TouchDesigner. It is OFF by
 * default and only works when the bridge has its "Allow Python" flag explicitly
 * enabled. With the flag off, the bridge will reject the request and this tool
 * surfaces that rejection. Use the structured tools (td_build_template,
 * td_set_parameter, td_connect, ...) for normal work; reach for td_run_python
 * only when a task genuinely needs ad-hoc Python that the structured commands
 * cannot express.
 *
 * @module tools/td_run_python
 */

import { z } from "zod";
import { sendCommand, mcpResult } from "./td-live/client.js";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Run Python (live, UNSAFE)",
  description:
    "Run ARBITRARY Python code inside a running TouchDesigner instance via the " +
    "td_mcp bridge. WARNING: this is arbitrary code execution with full access " +
    "to the TouchDesigner project and the host Python environment. It is DISABLED " +
    "BY DEFAULT and only succeeds when the bridge's \"Allow Python\" flag is " +
    "explicitly turned on; otherwise the bridge rejects the request. Prefer the " +
    "structured live-control tools (td_build_template, td_set_parameter, " +
    "td_connect, td_list_network, ...) for normal operations and only use this " +
    "for ad-hoc Python that those cannot express. Returns stdout / the returned " +
    "value plus any errors, warnings and scriptErrors from the bridge.",
  inputSchema: {
    code: z
      .string()
      .describe(
        "Python source to execute in TouchDesigner. Runs in the project's Python " +
        "context (td module available: op, ops, project, absTime, etc.). " +
        "Only runs if the bridge's \"Allow Python\" flag is enabled."
      )
  }
};

// Tool handler — thin pass-through to the bridge's run_python command. The
// bridge enforces the "Allow Python" gate; we just relay the result/errors.
export async function handler({ code } = {}) {
  const res = await sendCommand("run_python", { code });
  return mcpResult(res);
}
