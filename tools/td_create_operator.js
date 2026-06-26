/**
 * td_create_operator — Live-control tool.
 *
 * Creates a new operator inside a parent COMP in a running TouchDesigner
 * instance via the td_mcp bridge. On the TD side this drives the documented
 * COMP.create(opTypeString, name) call (COMP_Class), e.g.
 * create('noiseTOP', 'noise1').
 *
 * The `op_type` accepts either a literal create token (e.g. 'noiseTOP') or a
 * human-friendly display name (e.g. 'Noise TOP'); the latter is resolved to a
 * create token through the operator map (resolveOpType).
 *
 * @module tools/td_create_operator
 */

import { z } from "zod";
import { sendCommand, mcpResult, mcpText, resolveOpType } from "./td-live/client.js";

// Default sandbox COMP that all mutating live tools target unless overridden.
const DEFAULT_PARENT = "/td_mcp/sandbox";

// Tool schema — raw zod shape inputSchema (MCP SDK v1.x).
export const schema = {
  title: "TD Create Operator (live)",
  description:
    "Create a new operator inside a parent COMP in a running TouchDesigner " +
    "instance (live control via the td_mcp bridge). Wraps the documented " +
    "COMP.create(opType, name) call. " +
    "`op_type` may be a create token like 'noiseTOP' or a display name like " +
    "'Noise TOP' (resolved via the operator map). " +
    "Defaults to creating inside the '/td_mcp/sandbox' COMP.",
  inputSchema: {
    parent: z
      .string()
      .optional()
      .describe(
        "Full path of the parent COMP to create the operator inside. " +
        "Defaults to '/td_mcp/sandbox'."
      ),
    op_type: z
      .string()
      .describe(
        "Operator type to create. Either a create token (e.g. 'noiseTOP', " +
        "'rectangleSOP', 'constantCHOP') or a display name (e.g. 'Noise TOP') " +
        "that is resolved to a create token via the operator map."
      ),
    name: z
      .string()
      .optional()
      .describe(
        "Optional name for the new operator. If omitted, TouchDesigner picks " +
        "a default unique name based on the operator type."
      )
  }
};

// Tool handler. The bridge command expects {parent, opType, name}.
export async function handler({ parent = DEFAULT_PARENT, op_type, name }) {
  // Resolve a display name / token to a documented create token.
  // resolveOpType matches by id or by name (case-insensitive); a value that is
  // already a valid create token passes through when it matches an id.
  const opType = await resolveOpType(op_type);

  if (!opType) {
    // Fail soft with an actionable message rather than sending an unknown type.
    return mcpText(
      `Could not resolve op_type '${op_type}' to a TouchDesigner create token. ` +
      "Pass either an exact create token (e.g. 'noiseTOP', 'constantCHOP', " +
      "'rectangleSOP') or a documented display name (e.g. 'Noise TOP'). " +
      "Use the 'search_operators' / 'get_operator' tools to find the correct " +
      "operator and its create token (the documented COMP.create() string)."
    );
  }

  const res = await sendCommand("create_operator", { parent, opType, name });
  return mcpResult(res);
}
