# TouchDesigner MCP Server — Full Audit Report

**Date:** 2026-06-25
**Auditor:** Autonomous multi-agent review (12 agents: 7 static code/data auditors + 5 external-research auditors crawling docs.derivative.ca, Context7, and the live web)
**Scope:** Complete code review of the MCP server (`@bottobot/td-mcp` v2.8.0) — code correctness, data integrity, reference mapping, version currency, and coverage gaps.
**Method:** Each auditor read the server itself and/or crawled authoritative documentation, returning evidence-cited findings (file:line + quoted evidence + impact + fix). 92 findings total. Cross-verified against live Derivative release notes and Context7 SDK docs.

> **Verdict:** The server *looks* polished and runs locally, but it ships **wrong answers to real users at scale** and is **100% broken when installed from npm**. The problems are not cosmetic drift — they are (1) a packaging bug that makes the published package crash on startup, (2) **substantially fabricated version data** that misanswers the single most common question a TD assistant gets ("what's the latest version / when did POPs ship"), (3) **fabricated operator parameter data** for the entire POP family, and (4) a `Ready with 0 operators` stats bug. This requires a real modernization pass, not patching.

---

## 0. Ground-truth reference table (verified this audit)

Every number/fact below was verified against the filesystem, runtime, or live Derivative/Context7 sources. Use these as the single source of truth for the fix.

| Fact | Repo currently claims | **Verified truth** | Source |
|---|---|---|---|
| Operator JSON files | 630 / 649 / 631 (3 conflicting) | **629** (+1 stray `experimental` non-JSON entry in `processed/`) | `ls wiki/data/processed/*.json` = 629 |
| By family | TOP 140, COMP 41 (table) | **CHOP 165, TOP 139, SOP 112, DAT 70, MAT 13, COMP 40, POP 90** (=629) | filesystem suffix count |
| Python classes | 69 | **68 distinct** (69 indexed; `OP`+`Op` duplicate) | runtime: distinct className = 68 |
| Python methods | 1,510+ | 1,510 (1,506 store type under `returns`) | data scan |
| Tutorials / patterns / tools | 14 / 32 / 21 | **14 / 32 / 21** (correct) | filesystem + index.js |
| Latest TD **official** | "2024", Python 3.11.7, "current" | **2025.30000 series**, latest build **2025.32820 (2026-05-06)**, **Python 3.11.10**. *There has never been a TD 2024 official release.* | derivative.ca/download/archive; 2025 official update post |
| Latest TD **experimental** | "2025.10000", Python **3.12** | **2025.30000 series** (2025.30060→2025.31310), **Python 3.11.10** | Release_Notes/2025.30000/experimental |
| **POPs** (Point Operators) | "2021 preview / 2022 stable, 90+ ops" | **Announced 2024-05-19; shipped as the 2025 release flagship** — "first new operator family in over a decade" | pops-new-operator-family post; 2025 official update |
| **Vulkan** | "2020 preview" / "2025 GA, OpenGL remains" | **Experimental 2021 (2021.38110); the SOLE graphics API (OpenGL fully removed) as of 2022.20000** | Release_Notes/2022.20000 |
| TD 2021 official Python | 3.9.5 | **3.7.2** (3.9.5 arrived in 2021 *experimental* 2021.38110, official in 2022) | release notes |
| Build number format | bare 5-digit ints (28040, 60000, 90000) | **`YYYY.NNNNN`** (e.g. 2022.35320, 2025.32820) | archive |
| MCP SDK | `^1.0.4` → resolved 1.17.1 | v1.x API is **current & correct**; latest 1.x ~**1.29**; *do NOT adopt v2-alpha* | Context7 `/modelcontextprotocol/typescript-sdk` |
| zod | `^3.23.8` → 3.25.76 | Keep **zod 3**; tighten floor to **`^3.25.0`** (SDK v1.x needs the `zod/v4` shim present in ≥3.25) | Context7 v1.x README |
| cheerio | `^1.0.0-rc.12` (RC) in `dependencies` | **build-time only** (used solely in `wiki/processor/*`); → `devDependencies`, range `^1.1.2` | Grep: 0 runtime imports |
| Node engine | `>=18.0.0` | Node 18 EOL (2025-04-30); raise to **`>=20`** (min) or `>=22` (LTS) | runtime support calendar |
| docs.derivative.ca URL form | empty for 625/629; oldid-pinned (403) in index | **`https://docs.derivative.ca/<Title>`** (spaces→`_`, hyphens kept, original case); Python = `<Name>_Class` | 14 live fetches, all 200 OK |

---

## 1. Severity rollup

| Severity | Count | One-line theme |
|---|---|---|
| **Critical** | 15 | npm-install crash; fabricated version data; fabricated POP params; `0 operators` stats; non-compiling GLSL; fabricated ML operators |
| **High** | ~24 | count contradictions; stdout→stdio corruption; buildRange fabrication; dead URLs; missing operators/classes; wrong Python versions |
| **Medium** | ~28 | schema fragmentation; placeholder descriptions; doc drift; CV origin-flip gap; misleading errors |
| **Low / Info** | ~25 | dead code/imports; naming inconsistencies; hygiene |

---

## 2. CRITICAL findings (ship-blockers — fix first)

### C1. Published npm package crashes on startup — the JS data layer is excluded from the tarball
`package.json` `files` (lines 41–51) lists `wiki/data/` and `wiki/processor/` but **not** `wiki/operator-data-manager.js`, `wiki/operator-data-python-api.js`, or `wiki/utils/`. `index.js:16` does `import OperatorDataManager from './wiki/operator-data-manager.js'`. `npm pack --dry-run` confirms all three are absent → a clean `npm install -g @bottobot/td-mcp` aborts with **`ERR_MODULE_NOT_FOUND`** before any tool runs. **Every "Zero Configuration / works immediately" claim is false.** Only `git clone` works today.
**Fix:** add `wiki/operator-data-manager.js`, `wiki/operator-data-python-api.js`, `wiki/utils/` (and any other runtime `wiki/*.js`) to `files`; verify with `npm pack --dry-run`.

### C2. `getSystemStats()` reports **0 operators** — startup banner literally says "Ready with 0 operators"
`stats.totalEntries` is only set in `updateSystemStats()`, called only from `processHTMFiles()`. The normal boot path is `loadProcessedEntries()`, which never updates stats. Runtime confirmed: loads 629 but `getSystemStats().totalEntries = 0`. `index.js:252` prints `Ready with 0 operators`. SETUP-INSTRUCTIONS documents a fake `Ready with 630 operators` the code cannot produce.
**Fix:** set `this.stats.totalEntries = this.entries.size` at the end of `loadProcessedEntries()` (or compute on demand in `getSystemStats()`).

### C3. stdio MCP server logs ~91 lines to **stdout**, including after `server.connect()` — JSON-RPC frame corruption risk
`StdioServerTransport` writes protocol JSON to `process.stdout`; the server emits 91 `console.log` lines across `index.js` + `wiki/*` to that same stream, including `index.js:264` **after** connect, plus lazy `initialize()` logging that can fire mid-session on first tool call. A log line interleaved with a JSON-RPC message = invalid frame → client drops the response/disconnects.
**Fix:** route ALL diagnostics to `stderr` (`console.error` / a stderr logger) throughout `index.js` and `wiki/*`; guarantee no logging after connect; eagerly initialize before connect.

### C4–C5. Operator parameter data for the **entire POP family is fabricated**
97 `*_pop.json` files (cluster 2): **100% of 2,911 parameter descriptions** are the template `"Configure <X> for the operator"`, and **~199 parameter *names* are menu option values or type tokens** (`"1"`, `"P"`, `"point"`, `"float"`, `"inclusive"`) — not real TD parameters. `get_operator()` feeds these verbatim to users. Asking "what parameters does Accumulate POP have?" returns invented parameters named `1`, `P`, `point`, `float`. Any generated `op('x').par.P` is wrong.
**Fix:** re-parse POP source so menu options nest under their parent parameter's `menuItems`; populate real descriptions or leave empty (never template). Until re-parsed, flag cluster-2 params as unverified.

### C6. `get_python_api` / `search_python_api` drop return type + description for **~all 1,510 methods**
Code reads `method.returnType` and `method.description`; data stores the type under `method.returns` (1,506/1,510) and has no `description` on most. So the two most useful doc fields are silently dropped for essentially every method of every class. Never throws — a wrong-answer bug disguised as working code.
**Fix:** read `method.returns` (strip trailing `" :"`); source descriptions from `python-api-compatibility.json` where present or omit cleanly; mirror in `search_python_api`. Also normalize `member.readOnly ?? member.readonly` and `member.returnType ?? member.type` (26 + 12 members currently render wrong/Unknown).

### C7–C13. Version data is substantially **fabricated** (the core "bring up to date" failure)
- **C7** `currentStable: "2024"` — a TD release that **never existed**. Real current stable is **2025** (build 2025.32820, Python 3.11.10).
- **C8** The actual latest release (**TD 2025, Python 3.11.10**) is **entirely missing** from manifest + highlights + experimental data.
- **C9** **POP timeline inverted/fabricated:** claims POPs were a 2021 preview / 2022 stable feature with "90+ operators." Truth: announced **2024-05-19**, shipped in **2025**. A user told "your 2022 build has stable POPs" finds none.
- **C10** **Vulkan timeline wrong both ways:** manifest says "2020 preview"; experimental file says "2025 GA, OpenGL remains available." Truth: experimental 2021; **sole API, OpenGL removed, as of 2022.20000**.
- **C11** `currentExperimentalSeries: "2025.10000"` with **Python 3.12** is fabricated. Real series is **2025.30000**, **Python 3.11.10**. A user told "experimental has 3.12" writes 3.12-only code that fails.
- **C12 (build numbers)** Every `buildRange` in all three version files uses bare 5-digit ints that are non-monotonic and overlapping (2023 "11600–19000" is *below* 2021 "60000–65000"). Real builds are `YYYY.NNNNN`.
- **C13 (fabricated API/build gates)** `experimental-builds.json` invents Python API members at invented builds (`OP.asyncCook@90200`, `RenderTOP.rayTracing@90100`, class `POPGPU`) and fabricated breaking-changes ("metres→cm at build 22500"). Acting on these corrupts user projects.
**Fix:** near-total rewrite of `version-manifest.json`, `release-highlights.json`, `experimental-builds.json` from live release notes (sources cited in §0). Add real 2025; remove phantom 2024; correct POP/Vulkan/Python timelines; `YYYY.NNNNN` build strings; strip all unverifiable API/breaking-change entries.

### C14–C15. Experimental KB contains confidently-wrong, non-working content
- **C14** Most **GLSL TOP snippets write to `fragColor` without declaring it** (`layout(location=0) out vec4 fragColor;`) → won't compile in a TD GLSL TOP (8 snippets across glsl/generative/gpu files).
- **C15** Fabricated operators/integrations: **`TouchEngine CHOP`/`TouchEngine TOP` don't exist** (only Engine COMP); **Body Track CHOP** described as TensorRT with invented params (real backend is NVIDIA Maxine AR SDK; max 8 not 4); **TDAbleton example uses AbletonOSC `/live/...` addresses** TDAbleton doesn't use → silently no-ops.
**Fix:** add output declarations to all GLSL snippets; rewrite Body Track (Maxine), TouchEngine (Engine COMP + In/Out ops), and TDAbleton (real components or relabel as AbletonOSC). See §6.

---

## 3. HIGH findings (correctness & accuracy)

| # | Finding | Location | Fix |
|---|---|---|---|
| H1 | Operator count contradictory 4 ways (629/630/631/649) | index.js:65; package.json:3-4; README:24,463-469,510,650; MCP-ARCH:158-184 | Set everything to **629**; derive from `entries.size` |
| H2 | Per-family table wrong (TOP 140→139, COMP 41→40, DAT row shows 69 = python count) | README:463-469; MCP-ARCH:178-184 | Regenerate table programmatically |
| H3 | `OP` class double-counted (`OP`+`Op` in index.json) → 69 vs 68 distinct | wiki/data/python-api/index.json | Remove `Op`; report 68 |
| H4 | `version-manifest` buildRanges non-monotonic & mixed representation (099 uses *years*) | version-manifest.json:9-75 | Rewrite as `YYYY.NNNNN` |
| H5 | `experimental-builds.json` self-contradicts on "2024 build" (28070 vs 68000 vs 90000) | experimental-builds.json:7,103 vs manifest:75 | Reconcile to real builds |
| H6 | Wrong bundled Python for 2021 (3.9.5→3.7.2) and phantom 2024→3.11.7 | version-manifest.json:44-46,77,85-93 | Fix 2021; remove 2024; add 2025→3.11.10 |
| H7 | "graduated to 2024 stable / build 68000" narrative is false | experimental-builds.json:97-176 | Delete/rewrite (no 2024 stable exists) |
| H8 | Fabricated build-gated Python API additions presented as authoritative | experimental-builds.json (all series) | Strip or rebuild from real docs |
| H9 | 2 Python-class doc URLs are dead 404 (`Python_Op`, `Script_Operators`) | python-api/PythonOp.json, ScriptOp.json (+ stubs) | Repoint to `OP_Class` / per-family Script pages |
| H10 | 532 canonical URLs stored only in **403-blocked, oldid-pinned** `index.php?title=…&oldid=` form | search-index.json | Rewrite to clean `/<Title>` form (regex) |
| H11 | `url` empty/absent in **625 of 629** operators; relatedOperators/commonInputs/codeExamples effectively empty | wiki/data/processed/* | Backfill `url` mechanically for all 629; populate or drop the empty relationship fields |
| H12 | 3 incompatible schema generations coexist (97 POP files lack `url` and most metadata) | wiki/data/processed/* | Normalize to one schema + load-time validator |
| H13 | 4 hand-curated files carry unverifiable versionSupport claims ("NVIDIA DLSS", round hand-typed timestamps, no sourceFile) | render_top/camera_comp/feedback_top/geometry_comp.json | Verify or mark unverified; add provenance |
| H14 | GPU instancing Python sets non-existent params (`instancesource`/`instancechop`) | gpu-compute.json | Use `instancing`/`instanceop` |
| H15 | Replicator COMP technique invents `onReplicatorPulse(comp,event,replica)` API | generative-systems.json | Use real `onCreate`/`onRemoveReplicant` |
| H16 | Custom `uniform sampler2D sForceField` can't bind in a GLSL TOP | gpu-compute.json | Use `sTD2DInputs[1]` |
| H17 | MediaPipe snippet defines `onSetupParameters` twice → model never loads | machine-learning.json | Merge into one |
| H18 | **Coverage gaps**: POP missing ~12 (Alembic In/Out, Triangulate, Trace, Text, Plane, Line Resample, …); TOP missing ~12 (incl PBR); CHOP ~7 (RenderStream Out); DAT ~5 (TCP/IP, UDT In/Out, Web, Serial Devices); COMP ~3 (Field, GlTF In/Out); SOP ~3 | wiki/data/processed/ vs Category indexes | Scrape & add missing via MediaWiki `categorymembers` API |
| H19 | Python API far thinner than advertised (69 vs 150+ real classes; per-operator classes like `timerCHOP`, `moviefileinTOP`, `bodytrackCHOP` absent) | wiki/data/python-api/ | Expand ingestion; correct "full/complete" wording |

---

## 4. MEDIUM findings (selected)

- **M1** `get_version_info` accepts experimental/2025 strings then returns a misleading "likely a data issue — please report it" instead of redirecting to `get_experimental_build`. → call `isExperimentalVersion()` first.
- **M2** Body Track CHOP `addedIn` conflicts (release-highlights 2022 vs operator-compat 2023) → self-contradictory output. Set to 2022 (NVIDIA-AI wave). (Note: the *family* dating is separate from the POP error.)
- **M3** `search_experimental` rejects `ml`/`ai` aliases that sibling `get_experimental_techniques` accepts → share one alias map.
- **M4** `version-manifest` frozen at 2024 → `getVersionInfo('2025'/'2026')` returns null, version filtering silently no-ops for current-year users.
- **M5** Tool/import comments claim `v2.9`/`v2.10`/`v2.11` while package is `2.8.0` (phantom releases).
- **M6** Init failures swallowed twice (`index.js:254-258`, `loadProcessedEntries` catch) → half-initialized server reports success and serves empty results. Distinguish ENOENT; fail loud otherwise.
- **M7** 56 MB `search-index.json` loaded on every boot but **never queried** (`searchIndexer.search` has 0 call sites; `search()` uses `performDirectSearch`). Dead I/O + memory. → delete the indexer path or wire it in.
- **M8** All CV/ML image code ignores TD's bottom-left origin (no `np.flipud`) → MediaPipe/ONNX/OpenCV process frames upside-down.
- **M9** Audio Spectrum CHOP mis-described ("each channel is a frequency band"; "512 bins"); raymarcher aspect ratio inverted (`res.x/res.y` → use `res.z/res.w`); unverifiable "ONNX requires 2022.28120+" gate.
- **M10** `contentHash` empty in all 629 files; `processingVersion` split 1.0.0 / missing / 2.10.0 (ahead of package 2.8.0).
- **M11** SETUP-INSTRUCTIONS + MCP-ARCHITECTURE show fabricated `Ready with 630 operators` / `Loaded 630 operators` sample output.
- **M12** `.mcp.json` is committed to the public repo and bind-mounts Linux `/home/robert` + unrelated personal MCP servers; does not even configure td-mcp. → remove/gitignore or replace with a real `npx @bottobot/td-mcp` example.
- **M13** 13 `workflowPattern` references (`3d-render-pipeline`, `live-performance`, …) are pattern slugs collected as operator refs → don't resolve.
- **M14** **MCP SDK** resolved 1.17.1 vs latest ~1.29; **Node** floor `>=18` is EOL (→`>=20`). (Both MEDIUM per dep research.)

## 5. LOW / INFO (selected)
- Dead async `addedIdx` Promise + unused `getPythonCompatInfo`/`getVersionInfo` imports in python tools.
- `list_tutorials`/`get_tutorial` lack try/catch (inconsistent with the other 4 tools); `getTutorial` calls `.toLowerCase()` unguarded (latent crash).
- `get_glsl_pattern` "list" shows only 1 alias per pattern (hides `sdf`, `worley`, `flocking`, …).
- 3 operator descriptions are leftover class-id tokens (`hsvtorgbTOP_Class`); 9 files have empty `parameters`.
- `patterns.json` has 2 dead top-level fields (`workflow_categories`, `operator_purposes`); suggest_workflow naming (bare names) mismatches its own "use full name with family" guidance.
- **cheerio** is a release-candidate range in `dependencies` but is build-time only → move to `devDependencies`, range `^1.1.2`. **zod** floor → `^3.25.0`.
- Dead `setup.chain`/`setup.steps` branches in `get_experimental_techniques` (0 techniques use them).

---

## 6. Positives (don't regress these)
- All JSON parses cleanly (0 invalid across ~700 files).
- Tutorial tools, network-template/glsl-pattern data backing, and patterns.json↔suggest_workflow contracts are sound; all 8 version/experimental handlers run without crashing.
- Host is current everywhere (`docs.derivative.ca`, zero legacy `derivative.ca/wiki`); canonical URL pattern confirmed via 14 live fetches.
- The MCP SDK **API usage is current and correct for v1.x** — keep it; do **not** migrate to v2-alpha (it would break the raw-zod-shape `inputSchema`).
- Tool count (21), tutorials (14), patterns (32) are accurate and consistent.
- The 553→69 Python-count correction from prior versions held.

---

## 7. Remediation themes → maps to implementation plan
1. **Packaging/runtime safety** (C1, C2, C3, M6, M7): publishable + stdio-clean + honest stats.
2. **Version data rewrite** (C7–C13, H4–H8, H13, M2, M4): the headline "bring up to date" work — real 2025, real POP/Vulkan/Python timelines, `YYYY.NNNNN` builds.
3. **Operator data integrity** (C4–C5, H11–H13, M10, M13): re-parse POP params, backfill URLs, normalize schema, add provenance.
4. **Python API tools + data** (C6, H3, H9, H19): fix `returns`/`readonly`/`type`, de-dup OP, expand classes.
5. **Experimental KB accuracy** (C14–C15, H14–H17, M8–M9): make every snippet compile/run; remove fabricated operators.
6. **Coverage gaps** (H18, H19): scrape missing operators/classes from category indexes.
7. **Docs consistency** (H1–H2, M5, M11–M12): one source of truth for every count; fix `.mcp.json`.
8. **Dependencies** (M14, low): SDK update, zod/cheerio/node hygiene.

Detailed, sequenced, self-critiqued plan in `IMPLEMENTATION_PLAN.md`.
