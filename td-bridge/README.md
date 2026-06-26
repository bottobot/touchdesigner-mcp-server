# td_mcp bridge — live control of a running TouchDesigner

These three files install a small HTTP control surface **inside** a running
TouchDesigner 2025 instance so the MCP server's `td_*` "live" tools can build
and inspect networks in real time.

```
td-bridge/
├── router.py      # Web Server DAT *Callbacks* body — the command dispatcher
├── bootstrap.py   # one-time Textport script that constructs the bridge COMP
└── README.md      # this file
```

The MCP server (Node side) talks to the bridge over **HTTP POST** using a tiny
JSON protocol:

```
request  : { "id": "<uuid>", "op": "<command>", "args": { ... } }
response : { "ok": true|false, "id", "result": <any>,
             "errors": [...], "warnings": [...], "scriptErrors": [...],
             "error": "<msg if !ok>" }
```

---

## 1. Install

You have two options.

### Option A — paste `bootstrap.py` into the Textport (recommended)

1. Open TouchDesigner. Open the **Textport** (`Alt + T`).
2. Open `td-bridge/bootstrap.py`, **edit the `ROUTER_PY_PATH` constant** at the
   top to the absolute path of `td-bridge/router.py` on your machine, e.g.
   `ROUTER_PY_PATH = 'C:/dev/touchdesigner-mcp-server/td-bridge/router.py'`.
   (If you skip this, the bridge is still built but you must paste `router.py`
   into the `router` Text DAT by hand.)
3. Paste the whole edited `bootstrap.py` into the Textport and press Enter.
4. The Textport prints your token:

   ```
   [td_mcp] TD_MCP_TOKEN = <64 hex chars>
   ```

This creates `/td_mcp` (Base COMP) containing a `webserver` (Web Server DAT on
port **9981**, active), a `router` Text DAT (the callbacks), a `tokengen`
Execute DAT (mints the token on project start), a private `token` Text DAT, and
`/td_mcp/sandbox` (Base COMP) where all live edits land.

### Option B — save a `.tox` and drag it in

After running Option A once, right-click `/td_mcp` → **Save Component .tox**.
Thereafter you can drag that `.tox` into any project. The `tokengen` Execute DAT
re-mints a token on load; read it from the Textport or from the `token` DAT.

---

## 2. Point the MCP server at the bridge

The Node client (`tools/td-live/client.js`) reads three environment variables:

| Variable        | Default      | Meaning                                   |
| --------------- | ------------ | ----------------------------------------- |
| `TD_MCP_TOKEN`  | *(none)*     | the secret printed by bootstrap — required |
| `TD_MCP_HOST`   | `127.0.0.1`  | host the bridge is reachable at           |
| `TD_MCP_PORT`   | `9981`       | the Web Server DAT port                   |

Set them however your MCP host launches the server, e.g. in the MCP config
`env` block, or in your shell:

```powershell
# PowerShell
$env:TD_MCP_TOKEN = '<paste the 64 hex chars>'
$env:TD_MCP_HOST  = '127.0.0.1'
$env:TD_MCP_PORT  = '9981'
```

Read the current token at any time from the Textport
(`print(op('/td_mcp/token').text)`) or by reading the `token` Text DAT.

---

## 3. Security model

This bridge executes operator-graph mutations (and optionally arbitrary Python)
on request, so it is locked down in depth:

1. **Token auth.** Every request must carry an `Authorization` header equal to
   the random 64-hex-char token minted at startup. The compare is
   constant-time (`hmac.compare_digest`). No token / wrong token → `401`.
2. **CSRF guard.** Any request that carries an `Origin` **or** `Referer` header
   is rejected with `403`. Browsers always attach these on cross-site fetches;
   the MCP client never does. This stops a malicious local web page from
   driving the bridge via your browser.
3. **Sandbox.** Every *mutating* command (`create_operator`, `set_parameter`,
   `connect`, `delete`, `clear`, `layout`, `set_resolution`) must resolve a
   target whose `.path` is at or under `/td_mcp/sandbox`. Anything outside is
   rejected with `403` unless the request explicitly sets
   `allow_outside_sandbox: true`. The MCP tools default their `parent`/`path`
   to `/td_mcp/sandbox`.
4. **Python off by default.** The `run_python` command runs free-form Python
   only when the request sets `allow_python: true`. The corresponding MCP tool
   (`td_run_python`) documents this in its schema and is disabled unless you
   opt in. Treat it as full code execution inside TD.
5. **Bind / network exposure.** ⚠️ The Web Server DAT has **no
   "local address" parameter** — it binds on `port` and (in current builds)
   listens on all interfaces, not just loopback. The defences above (token +
   CSRF guard + sandbox) are what protect the bridge; for belt-and-suspenders,
   **block port 9981 inbound at your OS firewall** so only this machine can
   reach it. Leave `secure` (TLS) off for localhost use, or supply a cert if
   you must expose it.

---

## 4. Command reference (the `op` field)

| `op`              | `args`                                                       | mutating |
| ----------------- | ----------------------------------------------------------- | :------: |
| `status`          | `{}`                                                         |    no    |
| `create_operator` | `{parent, opType, name?}`                                    |   yes    |
| `set_parameter`   | `{path, par, value?\|expr?\|pulse?}`                        |   yes    |
| `connect`         | `{from, fromOut=0, to, toIn=0}`                             |   yes    |
| `delete`          | `{path}`                                                     |   yes    |
| `clear`           | `{parent}`                                                   |   yes    |
| `layout`          | `{parent}`                                                   |   yes    |
| `list_network`    | `{parent, maxDepth=1}`                                       |    no    |
| `get_errors`      | `{path, recurse=true}`                                       |    no    |
| `set_resolution`  | `{path, w, h}`                                               |   yes    |
| `render`          | `{path, filetype='.png'}` → `result.imageBase64`            |    no    |
| `sample`          | `{path, kind:'top'\|'chop', ...}`                          |    no    |
| `run_python`      | `{code, allow_python:true}`                                 |   yes*   |

All mutating commands accept an `allow_outside_sandbox: true` escape hatch.
`opType` is the **string** OPType (e.g. `'noiseTOP'`, `'rectangleTOP'`,
`'renderTOP'`), per the documented `COMP.create(opType, name)`.

---

## 5. [VERIFY IN-APP] checklist

Everything below was written against the documented APIs and the offline help
shipped with TouchDesigner, but a few details can only be confirmed against
your exact build. Run through these once after installing:

- [ ] **Response dict field names.** `router.py` sets
      `response['statusCode']`, `['statusReason']`, `['data']`, and both
      `['Content-Type']` / `['content-type']`. The shipped callbacks template
      documents `statusCode`/`statusReason`/`data` and notes extra keys like
      `content-type` are allowed — confirm the Content-Type you set actually
      reaches the client (check the Node side sees `application/json`).
- [ ] **Request header keys & casing.** The docs guarantee
      `method`/`uri`/`pars`/`clientAddress`/`serverAddress`/`data` and say
      headers arrive as *extra* entries. `router.py` scans headers
      case-insensitively (`_header`). Confirm `Authorization`, `Origin`,
      `Referer` actually appear in the `request` dict (print
      `list(request.keys())` once) and adjust if your build prefixes/cases them
      differently.
- [ ] **`clientAddress` availability** for any future IP allow-listing (not
      currently enforced — token+CSRF is the gate).
- [ ] **Threading / cook-safety.** Confirm the Web Server DAT runs the callback
      on a thread where `op()`, `.create()`, `.cook(force=True)` and
      `.saveByteArray()` are safe. If you see intermittent cook/threading
      errors, marshal the work onto the main thread (e.g. via
      `run(..., delayFrames=0)` from the callback) — kept simple here on the
      assumption the callback runs main-thread.
- [ ] **Web Server DAT param names.** Verified from offline help:
      `active`, `restart`, `port`, `secure`, `privatekey`, `certificate`,
      `password`, `callbacks`. The `callbacks` par is assigned the `router`
      DAT (object) with a `.path` string fallback — confirm which your build
      accepts.
- [ ] **`callbacks` resolution.** Make sure `webserver.par.callbacks` resolves
      to the `router` DAT (no "callbacks DAT not found" warning on the Web
      Server DAT).
- [ ] **Execute DAT `start` par** name. `bootstrap.py` sets
      `tokengen.par.start = 1` to fire `onStart()`. Confirm the Execute DAT
      exposes a `start` parameter on your build; if not, trigger token minting
      via `onCreate()` (already wired) or run `op('/td_mcp/token').text =
      __import__('secrets').token_hex(32)` manually.
- [ ] **`set_resolution` parameter names.** `router.py` uses
      `outputresolution` (set to `'custom'`, falling back to index `9`),
      `resolutionw`, `resolutionh`. Confirm these machine-names on the TOPs you
      target; some TOPs name the menu differently. A node's exact par names are
      visible by hovering the parameter or via `op('...').pars()`.
- [ ] **`saveByteArray` filetype** values your build supports (`.png`, `.jpg`,
      `.exr`, ...). `render` defaults to `.png`.
- [ ] **`TOP.sample` signature** — `router.py` forwards `x`/`y`/`u`/`v`
      keywords; confirm your build accepts the combination you use.

If anything in this list is off, edit `router.py` in the `/td_mcp/router` Text
DAT directly (the Web Server DAT picks up changes live) — no rebuild needed.
