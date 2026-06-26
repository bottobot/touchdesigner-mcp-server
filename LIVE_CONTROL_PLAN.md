# Implementation Plan — Live TouchDesigner Control ("td-live")  ·  v2 (post-critique)

**Goal:** Extend the MCP server so an assistant can **build operator networks and create visuals inside a *running* TouchDesigner 2025 instance** — using the server's current knowledge (661 operators, 214 Python classes, network templates, GLSL/generative KB) to *act*, not just inform.

**Status:** Plan only (no production code). Built from 7 documented-only research subagents (`wf_3af088c3-603`) + Context7 (MCP SDK), then **independently re-verified against live docs by a 4-lens adversarial critique** (`wf_76f98790-6d3`). Every documented API carries a `docs.derivative.ca` citation; genuinely undocumented items are flagged **[VERIFY IN-APP]**.

### Corrections applied from the critique (traceability)
| Critique finding | Resolution in v2 |
|---|---|
| Web Server DAT **does** document a `Local Address (localaddress)` bind param | §1/§8 default it to **127.0.0.1** (localhost-only). Removed the false "no bind-address" gap and the TCP/IP-DAT fallback. |
| `COMP.create` accepts the **opType STRING** directly | §2/§6 pass the type token string; removed the invented `getattr(td,…)` resolver. Canonical token source = documented `OP.OPType`. |
| Response keys `statusCode`/`statusReason`/`data` **are** in the official example | §2/§4 cite them; §11 narrowed to just custom `content-type` for binary. |
| `TOP.save` full signature + `FileSaveStatus` return **are** documented | §2 corrected; §11.4 removed. |
| **"214 class names ARE the OPType tokens" is false** (only 14 `*TOP` classes; Noise/Level/Transform TOP have none) | §6: build label→OPType from the **661 `name`+`category`** via deterministic transform, cross-checked against per-operator class names where present, **verified in-app via `op.OPType`**. Made a P0.5 gate. |
| **`parName` is NOT in most processed files** (label==name, id=null) | §6: completing the label→`parName` scrape (from wikitext `{{Parameter\|parName=}}`) is a hard P0.5 dependency; builders hard-error on unresolved params. |
| `td_run_python`/`DAT.run` is **not** safer than `exec` | §5/§8: it is full code-exec; made **opt-in, disabled by default**; reframed, not a security boundary. |
| Sandbox confinement was a default, **not enforced** | §8: server-side path allow-list enforced before *every* mutation; out-of-sandbox = explicit opt-in capability. |
| Token lifecycle unspecified; privacy mis-framed; no CSRF defense | §8 rewritten with `authenticateBasic`/`clientAddress`, fresh random token in the `Authorization` header, constant-time compare, Origin/Referer rejection. |
| Render TOP has **no TOP inputs** (renders via Geometry/Camera/Lights params) → 3D visuals unbuildable as written | §5/§7 add explicit render-chain support; templates must carry those param rows. |
| `td_build_pattern`/`td_build_glsl` data lacks ports/params/uniform-bindings | §5: scope to what the data supports; enrich first; hard-error otherwise. |

---

## 1. Architecture

```
 Assistant ⇄ MCP(stdio) ⇄ td-mcp (Node)
                              │ per tool: await fetch('http://127.0.0.1:9981', {POST, JSON, Authorization: token})
                              ▼
        TouchDesigner 2025 — td_mcp_bridge.tox (user-installed COMP)
        ┌──────────────────────────────────────────────────────────┐
        │ Web Server DAT  Local Address=127.0.0.1  Port=9981        │  onHTTPRequest(dat,request,response)
        │   └─ Callbacks DAT (command router): auth → dispatch →    │   → one documented td call → response dict
        │        td API (COMP.create / Par / Connector / TOP.save)  │
        │ Execute DAT.onStart(): start server, mint token           │
        │ /td_mcp/sandbox  (Base COMP — default + enforced target)  │
        └──────────────────────────────────────────────────────────┘
```

- **Transport (documented):** Web Server DAT `onHTTPRequest(webServerDAT, request, response)` runs Python and returns the `response` dict. Bind to loopback with the **`Local Address` (`localaddress`)** parameter.
  > "Local Address — Specify an IP address to listen on … When left blank, the Web Server DAT will listen on all interfaces." (`Web_Server_DAT`)
  > "onHTTPRequest — Triggered when the web server receives an HTTP request. The request is a dictionary of HTTP headers." (`Web_Server_DAT`)
  > Official example: `response['statusCode']=200; response['statusReason']='OK'; response['data']=…; return response` (`Web_Server_DAT`)
- **MCP side (Context7-confirmed):** each new tool is an async `registerTool` handler doing `await fetch()` to the bridge and returning `{content:[{type:'text',text}]}` — the SDK's documented `fetch-data` pattern; stateless HTTP request/response (no socket state). Matches the repo's SDK 1.29 usage.

---

## 2. Documented API foundation (independently re-verified)

| Capability | Documented API | Source |
|---|---|---|
| Create operator | `COMP.create(opType, name, initialize=True) → OP` — **`opType` may be the type token STRING** (e.g. `'noiseTOP'`) or the class | `COMP_Class` ("opType … can be a string 'waveCHOP'") |
| Canonical type token | `OP.OPType` (read an existing op's create token) | `OP_Class` |
| Change type | `OP.changeType(OPtype)` | `Working_with_OPs_in_Python` |
| Constant param | `op.par.X.val = v` (or `op.par.X = v`) | `Par_Class` |
| Expression | `op.par.X.expr = 'expr'` | `Par_Class` |
| Mode | `op.par.X.mode = ParMode.CONSTANT/EXPRESSION/EXPORT/BIND` | `Par_Class` |
| Pulse | `op.par.Y.pulse(value=1, frames=0, seconds=0)` | `Par_Class` |
| Connect | `Connector.connect(target)` via `OP.inputConnectors[i]`/`outputConnectors[i]` | `Connector_Class`, `OP_Class` |
| Bulk wire / read | `OP.setInputs(list)`; `OP.inputs`, `OP.outputs` | `OP_Class` |
| Position / size | `OP.nodeX/nodeY` (bottom-left origin), `nodeCenterX/Y`, `nodeWidth/Height` | `OP_Class` |
| Delete / copy | `OP.destroy()`; `COMP.copyOPs(list)` | `OP_Class`, `COMP_Class` |
| List / identify | `COMP.findChildren(type=, maxDepth=)`, `op.children`; `OP.name/path/type/id/OPType` | `COMP_Class`, `OP_Class` |
| Errors / cook | `OP.errors/warnings/scriptErrors(recurse=True)`; `OP.cook(force=True)`, `totalCooks`, `cpuCookTime` | `OP_Class` |
| Save frame | `TOP.save(filepath, asynchronous=False, createFolders=False, quality=1.0, metadata=[]) → FileSaveStatus` (has `isCompleted()`) | `TOP_Class` |
| Save bytes | `TOP.saveByteArray(filetype='.png')` | `TOP_Class` |
| Render setup | **Render TOP has NO TOP inputs** — renders via `Geometry`/`Camera`/`Lights` PARAMETERS pointing at COMPs (param writes) | `Render_TOP` |
| Sample | `CHOP.chan(name)`, `CHOP.numpyArray()`, `TOP.sample(u=,v=)` | `CHOP_Class`, `TOP_Class` |
| Execute code | `td.run(scriptOrCallable, …)` runs a string/callable; `DAT.run()` runs **a DAT's own text** | `Td_Module`, `DAT_Class` |
| Package / start | `COMP.save(filepath)` → `.tox`; `Execute DAT.onStart()` | `COMP_Class`, `Execute_DAT` |
| Auth primitives | `webserverDAT.authenticateBasic(...)`, `request['clientAddress']` | `WebserverDAT_Class` |

---

## 3. TD-side bridge (`td_mcp_bridge.tox`)
A self-contained COMP the user installs once. Operators (all documented):
1. **Web Server DAT** — `Local Address=127.0.0.1`, `Port=9981`, `Secure` off (loopback).
2. **Callbacks DAT** — the command router: `onHTTPRequest` → auth → dispatch to one documented call → return `response` dict with `statusCode`/`statusReason`/`data`.
3. **Execute DAT** — `onStart()` starts the server and mints a fresh random token.
4. **`/td_mcp/sandbox` Base COMP** — the default *and enforced* build target.

**Install (documented):** drag-drop the `.tox`, add to Palette "My Components", or set a COMP's **External .tox** (`externaltox`) + **Reload .tox on Start** (`reloadtoxonstart`). → `Custom_Components`, `COMP_Class`.

---

## 4. Command protocol
**Request** (Node → TD): HTTP POST, `Authorization: <token>`, `Content-Type: application/json`:
```json
{ "id":"<uuid>", "op":"create_operator",
  "args":{ "parent":"/td_mcp/sandbox", "opType":"noiseTOP", "name":"noise1" } }
```
**Response** (`response['data']` = JSON):
```json
{ "ok":true, "id":"<uuid>", "result":{ "path":"/td_mcp/sandbox/noise1", "type":"TOP", "opType":"noiseTOP" },
  "errors":[], "warnings":[], "scriptErrors":[], "cooked":true }
```
After every command the router collects `OP.errors/warnings/scriptErrors(recurse=True)`.

---

## 5. New MCP tools (each wraps one documented call)
**Atomic (P1):** `td_status`; `td_create_operator(parent,opType,name?)`→`COMP.create`; `td_set_parameter(opPath,par,value?|expr?|pulse?)`→`Par.val/.expr/.pulse`; `td_connect(from,fromOut,to,toIn)`→`Connector.connect`; `td_delete(path)`→`OP.destroy`; `td_list_network(parent,maxDepth)`→`findChildren`+per-op detail; `td_clear(parent=/td_mcp/sandbox)`→sandbox-scoped destroy loop; `td_layout(parent)`→`nodeX/nodeY` auto-spacing.

**Feedback (P2):** `td_get_errors(path)`; `td_set_resolution(topPath,w,h)` (param write, before render); `td_render(topPath,'.png')`→`TOP.saveByteArray`→base64 over MCP; `td_render_sequence(topPath,frames)`→cook N frames then save; `td_sample(path,kind)`.

**Render-chain (P2, documented requirement):** because the **Render TOP has no TOP inputs**, a 3D visual requires `td_set_parameter` writes to the Render TOP's `Geometry`/`Camera`/`Lights` params plus a Geometry COMP (with a render SOP + Material) and a Light/Camera COMP. Templates that include a render branch **must carry those param rows**; `td_build_template` fails-loud if they are missing.

**Compound (P2, only as far as the data supports):**
- `td_build_template(key,parent?)` — compiles a `get_network_template.js` entry (ops + connections + parameter settings + scripts). Requires the entry to carry OPType tokens + `parName`s + ports; errors on any gap (anti-fabrication).
- `td_build_pattern(name,parent?)` — **restricted to verified linear single-input chains** from `data/patterns.json` (which carries only ordered display labels, no ports/params); documents the limitation; will not naively wire multi-input ops.
- `td_build_glsl(id,parent?)` — **only techniques whose `setup` block is complete** (uniforms + ops with OPTypes + explicit input indices), e.g. `raymarching_basic`; errors on techniques lacking a machine-readable build spec until `glsl.json` is enriched.

**Code-exec (opt-in, OFF by default):** `td_run_python(code)` — writes `code` into a dedicated Text DAT then `.run()` (or `td.run(code)`). This is **arbitrary code execution**, not a sandbox; the bridge rejects it unless the user enables a `Allow Python` flag on the COMP.

---

## 6. Supporting data assets (P0.5 — hard pre-gate before any builder)
1. **`label → OPType` map** *(critique BLOCKER — the 214 class names are NOT a complete source)*. Build from the **661 processed `name`+`category`** via a deterministic transform (spaces removed, family suffix uppercased: "Noise TOP"→`noiseTOP`, "Movie File In TOP"→`moviefileinTOP`), **cross-checked** against the per-operator Python class names where one exists (≈ lowercase-first of the className), and **[VERIFY IN-APP]** by creating one op per family and reading back `op.OPType` to confirm the token. Irregular tokens are corrected from `op.OPType`, never guessed.
2. **`label → parName` map (+ menu-label → menu-value)** *(critique BLOCKER — not in most processed files)*. Complete the scrape from the wikitext `{{Parameter|parName=…}}` / `{{ParameterItem|itemName=…}}` (the v3.0.0 scraper already extracts these for POPs; extend to all families). `td_set_parameter` and every compound builder **hard-error** on any param that does not resolve.
Both maps ship as versioned data with provenance; neither is consumed by a builder until verified.

---

## 7. Visual feedback loop
1. `td_get_errors(builtComp, recurse=True)` — health gate; fix before render.
2. `OP.cook(force=True)`; confirm `totalCooks` advanced.
3. `td_set_resolution` then `td_render` → `saveByteArray('.png')` → base64 image returned over MCP so the assistant *sees* and iterates. (Optional human preview: NDI Out TOP.)
4. `td_sample` for CHOP/TOP value checks.
Acceptance for any 3D/feedback build also asserts the frame is **not uniformly black** (a real-content check, not merely "save succeeded").

---

## 8. Security model (documented + enforced)
- **Loopback binding (documented):** Web Server DAT `Local Address = 127.0.0.1` by default; non-loopback is an explicit, documented opt-in. → `Web_Server_DAT`.
- **Auth:** `Execute DAT.onStart()` mints a fresh random token (not baked in); the client sends it in the **`Authorization` header**; the callback enforces it with a **constant-time** compare (and may use the documented `authenticateBasic`), and also checks `request['clientAddress']` is loopback **[VERIFY IN-APP** that `clientAddress` is present in TD 2025's generated callbacks template]. → `WebserverDAT_Class`.
- **CSRF / browser defense:** reject any request carrying an `Origin`/`Referer` header (browsers always send them; the Node client never does) and require `Content-Type: application/json`.
- **Enforced sandbox confinement:** before *any* mutation (create/connect/setpar/delete/clear) the router resolves `op(path)` and verifies `op.path.startswith('/td_mcp/sandbox')` and that it is not the bridge itself — rejecting otherwise. Acting outside the sandbox is a separate, explicitly-enabled capability.
- **Code-exec off by default:** `td_run_python` disabled unless the user enables `Allow Python`; it is arbitrary code execution, framed as such.
- **Secrets at rest:** ship the `.tox` as a private/password-protected component **only** to encrypt the embedded token / TLS cert password — *not* counted as endpoint hardening (private components still run code). → `Privacy`.

---

## 9. Phasing
- **P0 — In-app verification (gate).** Confirm the residual §11 unknowns against a running TD 2025.
- **P0.5 — Build + verify the two maps (gate).** `label→OPType` and `label→parName` (§6); no builder is coded until both verify.
- **P1 — Atomics + bridge.** `td_mcp_bridge.tox` + atomic tools + enforced sandbox + auth. Acceptance: round-trip create→connect→setpar→list a known graph and read it back identically.
- **P2 — Feedback + render-chain + compilers.** errors/resolution/render/sample; render-chain support; `td_build_template`/`td_build_pattern`/`td_build_glsl` within data limits. Acceptance: build a documented template end-to-end (incl. a render branch) and return a **non-black** PNG with expected features.
- **P3 — Streaming & agentic iteration.** WebSocket push (`onWebSocketReceiveText`/`webSocketSendText`) for progress/live values; a "build → render → critique → adjust" loop.

## 10. Validation & verification
- **Documented-only gate:** every tool's call is in §2 with a citation; the router invokes nothing else.
- **Round-trip verification** after every build (read the graph back, assert match) — the v3.0.0 "verify, don't assert" discipline.
- **Render verification:** errors clean + non-black frame before "done".
- **Harness:** extend `scripts/validate.js` with a `td-live` suite that exercises each tool against a reachable bridge and **skips-with-notice** (never fakes) when none is present.
- **Anti-fabrication:** builders emit only operators/params that resolve through the verified maps; unknowns hard-error.

## 11. Residual [VERIFY IN-APP] (genuine documented gaps only)
1. **Custom `content-type`/binary response** handling on the Web Server DAT response dict (the `statusCode`/`statusReason`/`data` keys are documented; binary/base64 image responses are not shown inline).
2. **`request['clientAddress']`** presence/format in the TD 2025 generated `WebserverDAT_callbacks.py`.
3. **Threading / cook-safety:** whether `onHTTPRequest` runs on TD's main thread (so synchronous `create()`/wiring is valid) vs a server thread — *not documented*; default to `td.run` deferral if unconfirmed.
4. **`op.OPType` token** exact spelling per family (verify a sample; correct the map from the live value).
5. **Active-pane read/set** (e.g. `ui.panes`) so the assistant can build into what the user is viewing — *availability/shape to confirm*; otherwise build into the sandbox and tell the user where.

## 12. Risks & mitigations
- Undocumented edges → P0/P0.5 gates + §11 checklist; code only after in-app confirmation.
- Arbitrary code over a socket → loopback bind + token (Authorization) + CSRF rejection + enforced sandbox + code-exec off by default.
- Operator/param drift → verified maps + round-trip verification; hard-error on unknowns.
- Heavy commands blocking the frame loop → small handlers, `td.run` deferral for batches.
- User-network safety → enforced sandbox confinement, not a mere default.

## 13. Out of scope
- Editing the user's existing project logic (additive sandbox builds only unless explicitly directed).
- Undocumented/third-party remote-control schemes.
- Auto-running the bridge from the npm package (must be an explicit, user-installed component).
