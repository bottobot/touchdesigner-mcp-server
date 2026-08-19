/**
 * tools/td-live/client.js — shared transport + helpers for the live-control tools.
 *
 * The MCP tools talk to a Web Server DAT "bridge" running inside TouchDesigner over HTTP
 * (request/response). This module owns the transport, the operator map (create tokens +
 * parameter scripting-names), and the MCP result helpers. It never throws — every failure
 * is returned as a structured value so tool handlers stay simple and robust.
 *
 * Env config (read on every call so the user can change it without restarting):
 *   TD_MCP_HOST  (default '127.0.0.1')
 *   TD_MCP_PORT  (default '9981')
 *   TD_MCP_TOKEN (the shared secret printed by td-bridge bootstrap.py)
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP_PATH = join(__dirname, '..', '..', 'wiki', 'data', 'maps', 'operators.json');

function cfg() {
  return {
    host: process.env.TD_MCP_HOST || '127.0.0.1',
    port: process.env.TD_MCP_PORT || '9981',
    token: process.env.TD_MCP_TOKEN || '',
    // Per-request timeout. Renders / heavy cooks can exceed the old fixed 8s.
    timeoutMs: Number(process.env.TD_MCP_TIMEOUT_MS) > 0 ? Number(process.env.TD_MCP_TIMEOUT_MS) : 8000,
  };
}

function unreachable(host, port) {
  return {
    ok: false,
    error: `Cannot reach the TouchDesigner bridge at ${host}:${port}. ` +
           `Install/run td_mcp_bridge (see td-bridge/README.md) and set TD_MCP_TOKEN.`,
    errors: [], warnings: [], scriptErrors: [],
  };
}

function timedOut(host, port, ms) {
  return {
    ok: false,
    error: `The TouchDesigner bridge at ${host}:${port} did not respond within ${ms}ms. ` +
           `TD may be busy cooking a heavy network. Retry, or raise TD_MCP_TIMEOUT_MS ` +
           `(current default 8000).`,
    errors: [], warnings: [], scriptErrors: [],
  };
}

/**
 * Send one command to the TD bridge. Always resolves (never throws) to the documented
 * response envelope: { ok, id, result, errors, warnings, scriptErrors, error }.
 * opts.timeoutMs overrides the per-request timeout (else TD_MCP_TIMEOUT_MS / 8000).
 */
export async function sendCommand(op, args = {}, opts = {}) {
  const { host, port, token, timeoutMs } = cfg();
  const ms = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : timeoutMs;
  const id = randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(`http://${host}:${port}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ id, op, args }),
      signal: controller.signal,
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    if (!res.ok) {
      return { ok: false, id, error: (body && body.error) || `Bridge returned HTTP ${res.status}: ${text.slice(0, 200)}`,
               errors: (body && body.errors) || [], warnings: (body && body.warnings) || [], scriptErrors: (body && body.scriptErrors) || [] };
    }
    if (!body || typeof body !== 'object') {
      return { ok: false, id, error: `Bridge returned a non-JSON response: ${text.slice(0, 200)}`, errors: [], warnings: [], scriptErrors: [] };
    }
    return {
      ok: body.ok !== false,
      id: body.id || id,
      result: body.result,
      errors: body.errors || [],
      warnings: body.warnings || [],
      scriptErrors: body.scriptErrors || [],
      error: body.error,
    };
  } catch (e) {
    // Distinguish "TD is slow / busy" from "nothing is listening" — the agent's
    // correct next action differs (wait/raise timeout vs. start the bridge).
    if (e && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      return timedOut(host, port, ms);
    }
    return unreachable(host, port);
  } finally {
    clearTimeout(timer);
  }
}

export function mcpText(s) {
  return { content: [{ type: 'text', text: String(s) }] };
}

function safeStringify(obj) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (k, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (v && typeof v === 'object') { if (seen.has(v)) return '[Circular]'; seen.add(v); }
      return v;
    }, 2);
  } catch { return String(obj); }
}

/** Render a command response envelope as a readable MCP text result. */
export function mcpResult(obj) {
  if (!obj || typeof obj !== 'object') return mcpText(String(obj));
  if (obj.ok === false) {
    let t = `❌ ${obj.error || 'Command failed.'}`;
    if (obj.errors && obj.errors.length) t += `\n\nErrors:\n- ${obj.errors.join('\n- ')}`;
    if (obj.scriptErrors && obj.scriptErrors.length) t += `\n\nScript errors:\n- ${obj.scriptErrors.join('\n- ')}`;
    return mcpText(t);
  }
  let t = '✅ ok';
  if (obj.result !== undefined) t += `\n\n${safeStringify(obj.result)}`;
  if (obj.warnings && obj.warnings.length) t += `\n\n⚠️ Warnings:\n- ${obj.warnings.join('\n- ')}`;
  if (obj.scriptErrors && obj.scriptErrors.length) t += `\n\nScript errors:\n- ${obj.scriptErrors.join('\n- ')}`;
  return mcpText(t);
}

// ---- operator map (create tokens + parameter scripting-names) ----
let _mapCache = null;
let _mapInflight = null;

export async function loadOperatorMap() {
  if (_mapCache) return _mapCache;
  if (_mapInflight) return _mapInflight;
  _mapInflight = (async () => {
    try {
      const j = JSON.parse(await fs.readFile(MAP_PATH, 'utf8'));
      _mapCache = j && j.operators ? j : { operators: {} };
    } catch {
      _mapCache = { operators: {} }; // fail soft (map not built yet)
    }
    _mapInflight = null;
    return _mapCache;
  })();
  return _mapInflight;
}

function findOperator(map, idOrName) {
  if (!idOrName) return null;
  const ops = map.operators || {};
  if (ops[idOrName]) return ops[idOrName];                              // by id
  const lower = String(idOrName).toLowerCase();
  for (const [id, o] of Object.entries(ops)) {
    if (id.toLowerCase() === lower) return o;
    if (o.name && o.name.toLowerCase() === lower) return o;             // by display name
    if (o.createType && o.createType.toLowerCase() === lower) return o; // by create token
  }
  return null;
}

/** Resolve an operator id/name/token to its documented create() token, or null. */
export async function resolveOpType(idOrName) {
  if (!idOrName) return null;
  const map = await loadOperatorMap();
  // If already a known create token, accept it.
  for (const o of Object.values(map.operators || {})) {
    if (o.createType && o.createType === idOrName) return o.createType;
  }
  const o = findOperator(map, idOrName);
  return o && o.createType ? o.createType : null;
}

/**
 * Resolve a parameter label (or pass-through parName) to its full map entry
 * { parName, type?, menu? }, or null. `menu`, when present, maps documented
 * menu LABELS to their scripting TOKENS (e.g. { "Add": "add" }).
 */
export async function resolveParam(opIdOrType, labelOrName) {
  if (!labelOrName) return null;
  const map = await loadOperatorMap();
  const o = findOperator(map, opIdOrType);
  if (!o || !o.params) return null;
  const params = o.params;
  if (params[labelOrName]) return params[labelOrName];                  // exact label or parName key
  const lower = String(labelOrName).toLowerCase();
  for (const [label, p] of Object.entries(params)) {
    if (label.toLowerCase() === lower) return p;
    if (p.parName && p.parName.toLowerCase() === lower) return p;
  }
  return null;
}

/** Resolve a parameter label (or pass-through parName) to its scripting parName, or null. */
export async function resolveParName(opIdOrType, labelOrName) {
  const p = await resolveParam(opIdOrType, labelOrName);
  return p && p.parName ? p.parName : null;
}

/**
 * Resolve a menu parameter value to its scripting TOKEN using the operator map.
 * Accepts a documented label ("Add"), a token ("add"), or anything else
 * (returned unchanged — non-menu params and unknown values pass through).
 */
export async function resolveMenuValue(opIdOrType, labelOrName, value) {
  if (typeof value !== 'string' || value === '') return value;
  const p = await resolveParam(opIdOrType, labelOrName);
  const menu = p && p.menu;
  if (!menu || typeof menu !== 'object') return value;
  const tokens = Object.values(menu);
  if (tokens.includes(value)) return value;                              // already a token
  if (menu[value] !== undefined) return menu[value];                     // exact label
  const lower = value.toLowerCase();
  for (const [label, token] of Object.entries(menu)) {
    if (label.toLowerCase() === lower) return token;
    if (String(token).toLowerCase() === lower) return token;
  }
  return value;                                                          // unknown — pass through
}
