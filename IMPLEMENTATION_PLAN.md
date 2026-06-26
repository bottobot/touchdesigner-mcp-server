# TouchDesigner MCP Server — Implementation Plan (v2, post-critique)

**Supersedes v1.** Revised to resolve all **14 blockers + 27 majors** from the 6-lens adversarial critique (`wf_752ba04c-289`).
**Derived from:** `AUDIT_REPORT.md` (92 findings, 15 critical).
**Target release:** **v3.0.0**.
**Mode:** Fully autonomous, no human-input actions (no publish/push/auth/AskUserQuestion). Heavy subagent parallelism. Context7 for SDK facts; live docs.derivative.ca (MediaWiki API) for TD facts.

---

## CHANGES FROM v1 — critique resolutions (traceability)

| Critique (lens) | Resolution in v2 |
|---|---|
| **URL prefix (repo-reality vs feasibility, blocker)** | **EMPIRICALLY SETTLED:** `docs.derivative.ca/Accumulate_POP` = 200; `Experimental:Accumulate_POP` = 404. WP4.1 uses **bare Title, stripping any `Experimental-`/`Experimental:` prefix**. 100% of POP/experimental URLs fetch-validated. |
| **POP sanitize is lossy (feasibility/autonomy, blocker)** | WP4.3 deletion heuristic **removed**. Replaced by **deterministic wikitext re-scrape** (WP4.3→WP6.1 merged): real params = `{{Parameter}}`, menu options = `{{ParameterItem}}` nested. Un-scrapable files → `paramsVerified:false` + **output-time suppression**, never blacklist-delete. Only safe deterministic edit retained: blank `"Configure X for the operator"` descriptions. |
| **Scraper used HTML not wikitext (feasibility, major)** | WP6.0 fetches `action=parse&prop=wikitext`; parses on template names. **Verified** templates exist (9 `{{Parameter}}` / 28 `{{ParameterItem}}` on Accumulate POP). |
| **No source URLs / no provenance / no independent check (anti-fab, 3 blockers)** | Added **§S Source-URL table**, **§P provenance schema** (`_provenance:[{fact,url,quote}]`), **independent source-check agent** (WP-VERIFY-SRC), `scripts/check-provenance.js` gate (F.8), and **fabrication-marker scan** gate (F.9). |
| **experimental-builds/operator-compat fabricated wholesale (anti-fab, blocker)** | WP3.3/WP3.4 now **delete-by-default**: every `experimentalOperators`/`pythonApiAdditions`/`breakingChanges`/`changedIn` entry is removed unless re-fetched + quoted. |
| **version-filter 2025-stable vs experimental routing (3 lenses, blocker)** | WP3.6 rewrites `isExperimentalVersion`: bare `YYYY`=stable, only `YYYY.NNNNN`=experimental. Removes `year>=2025→experimental`. Fixes get_version_info 3 sites + get_python_api versionOrder. |
| **console.log scope omits tools/ + processor (3 lenses, blocker)** | WP1.2 scope = **all runtime JS** (index.js, tools/, wiki/ recursive incl processor). Static grep gate + **runtime stdout JSON-RPC-frame gate** (F.7). |
| **python-api member-scrape defect unfixed (completeness, blocker)** | New **WP2.4** (deterministic, not stretch): blank templated `"X member"` descriptions; dedupe/flag duplicate member names. |
| **Verification gates shape-only (verification, 4 blockers)** | §F rebuilt: real **harness** (`scripts/smoke-test.js`) with **fixtures**, **content-level assertions**, **per-critical C1–C15 regression matrix** (mandatory), provenance + fabrication + stdout + count-purge + package-size + schema-contract gates. |
| **search-index path/exclusion (3 lenses, major)** | Disambiguated: 56 MB = `wiki/data/search-index/search-index.json`. WP1.4 disables `loadIndex` **and** the rebuild branch; `.npmignore` excludes it (since `files:[wiki/data/]` is wholesale). Oldid-URL rewrite dropped (index is dead/excluded). |
| **packaging verify too weak (major)** | WP1.1: `wiki/models/` **required**; verify by packing → temp install → import (not name-only). |
| **WP0.1 backup miscount; WP0.2 stray entry (minor)** | Back up **5 version + 7 experimental** JSONs by glob. Stray entry = 0-byte file `processed/experimental` → delete. |
| **H9 dead Python URLs, dead setup branches, .claude stale counts (minor)** | Added WP4.7 (H9), folded dead-branch removal into WP5, WP7.6 corrects `.claude/` instruction files. |
| **WP6.2 unbounded categorymembers (autonomy, minor)** | Hard cap: `cmlimit=500`, single page, no continuation; per-family + total scrape caps; overflow logged as gap. |
| **contentHash no-op (feasibility, minor)** | Drop hashing busywork; leave `""` (no consumer) or fill via existing `WikiEntry.calculateHash`; documented. |

---

## A. Non-negotiable principles (unchanged + hardened)
1. **Anti-fabrication (enforced, not aspirational).** Every factual write is (a) deterministic from verified data, (b) sourced with `_provenance{url,quote}` from a fetched page, or (c) omitted. Enforced by gates F.8 (provenance present) + F.9 (fabrication-marker scan) + an **independent** source-check agent distinct from the author.
2. **Deterministic-first.** Mechanical fixes before scraping.
3. **Disjoint parallelism.** Subagents write non-overlapping files; shared files (`index.js`, `package.json`, `README.md`, `MCP-ARCHITECTURE.md`, `CHANGELOG.md`, `version-filter.js`, the 2 experimental-build tool files) edited only by Lane M.
4. **Verify every package** — and gates are **executable assertions in a harness**, not prose. No WP done until its mapped assertions pass.
5. **Reversible.** `git checkout -- <path>` for tracked files; `.modernization-backup/` for the 12 version/experimental JSONs. No commit/push unless trivially safe.
6. **Honest scope.** Tiers 0–5 + WP4 + version rewrite + WP6.1 (POP re-scrape) complete fully. Tier 6.2/6.3 (new operators / python class expansion) are **bounded**; unreached items logged as explicit gaps, never faked.

---

## B. Ground truth (single source of truth — verified)
- Operators on disk: **629** JSON (CHOP 165 / TOP 139 / SOP 112 / DAT 70 / MAT 13 / COMP 40 / POP 90). Stray `wiki/data/processed/experimental` = **0-byte file → delete**.
- Python classes: **68 distinct** (de-dup `OP`/`Op`).
- TD latest official: **2025.30000 series**, build **2025.32820 (2026-05-06)**, **Python 3.11.10**. **No TD 2024 ever.**
- TD latest experimental: **2025.30000 series** (2025.30060→2025.31310), **Python 3.11.10** (not 3.12).
- POPs: announced **2024-05-19**, shipped **2025**.
- Vulkan: experimental 2021 (2021.38110); sole API since **2022.20000**.
- TD 2021 official Python: **3.7.2**.
- Build format: **`YYYY.NNNNN`**.
- **URL: bare `https://docs.derivative.ca/<Title>` (NO Experimental prefix)** — verified. Python = `<Name>_Class`.
- SDK v1.x API correct; update 1.17.1→`^1.29`; zod floor `^3.25.0`; cheerio→devDeps `^1.1.2`; node `>=20`.
- Wikitext params: `{{Parameter|parName=…}}` = real param; `{{ParameterItem|parName=…|…}}` = menu option of that param.

---

## S. Source-URL table (mandatory — every version fact pins here; agents MUST WebFetch these, never invent URLs)
| Fact | Source URL(s) to fetch |
|---|---|
| Release archive / build numbers (all series) | `https://derivative.ca/download/archive` |
| TD 2025 official (Python 3.11.10, flagship POPs) | `https://derivative.ca/community-post/2025-official-update/73153` ; `https://docs.derivative.ca/Release_Notes/2025.30000` |
| 2025 experimental series / Python 3.11.10 | `https://docs.derivative.ca/Release_Notes/2025.30000/experimental` |
| POPs introduction (2024-05-19) | `https://derivative.ca/community-post/pops-new-operator-family-touchdesigner/69468` |
| Vulkan sole API @2022.20000 | `https://docs.derivative.ca/Release_Notes/2022.20000` ; `https://derivative.ca/community-post/2022-official-update/66222` |
| 2021 Python 3.7.2 / 2021.38110 → 3.9.5 | `https://docs.derivative.ca/Release_Notes` (2021 series) ; `https://derivative.ca/release/experimental-202138110/65595` |
| Per-version Python/build (2019–2023) | each `https://docs.derivative.ca/Release_Notes/<series>` + archive |
| Operator pages (params/desc/url) | `https://docs.derivative.ca/api.php?action=parse&page=<Title>&prop=wikitext&format=json` |
| Category membership (coverage diff) | `https://docs.derivative.ca/api.php?action=query&list=categorymembers&cmtitle=Category:<Fam>s&cmlimit=500&format=json` |

If a listed URL 404s/redirects, the agent records the failure and **omits** the fact (verify-or-omit) — it does not substitute a guessed URL.

## P. Provenance schema (mandatory on every rewritten/scraped data file)
- Version/highlights/experimental files: top-level `"_provenance": [ { "fact": "<short claim>", "url": "<fetched url>", "quote": "<verbatim text from page>" } ]`.
- Scraped operator files: `"sourceUrl": "<wikitext api url>"`, `"sourceFetchedAt": "<ts passed in>"`, plus the existing `url` (bare doc page).
- `scripts/check-provenance.js` (gate F.8) fails if any rewritten version record or scraped operator lacks non-empty provenance with a `docs.derivative.ca`/`derivative.ca` URL.

---

## C. Execution model
- **Lane M (coordinator):** shared-file edits, sequencing, gates, tracker.
- **Lane W (parallel workflows):** disjoint fan-outs.
- Batches: **A** = version rewrite (5 author agents + 1 independent source-checker); **B** = experimental-KB (7 agents, 1/file); **C** = operator-data deterministic scripts (Lane M); **D** = scrape (POP re-scrape 90 + missing ops, 1 agent/op, capped); **VERIFY** = harness + regression matrix.

---

## D. Work packages

### Tier 0 — Baseline & ground truth (Lane M)
- **WP0.1** Copy `wiki/data/versions/*.json` (5) + `wiki/data/experimental/*.json` (7) → `.modernization-backup/` (glob, not hardcoded). Confirm clean tracked tree.
- **WP0.2** `git rm` the 0-byte `wiki/data/processed/experimental` file. Write `scripts/recount.js` → prints by-family + total + python-distinct + contamination counts (single-char/numeric/type-token param names; `Configure X for the operator` descriptions; duplicate python member names). This is the canonical recounter for all gates.

### Tier 1 — Ship-blockers (Lane M, deterministic)
- **WP1.1 (C1)** `package.json` `files`: add `wiki/operator-data-manager.js`, `wiki/operator-data-python-api.js`, `wiki/utils/`, `wiki/models/` (all confirmed in the runtime import closure from `index.js`→manager→{python-api, processor/*, models/wiki-entry}; tools→utils/version-filter). Add `.npmignore` excluding `wiki/data/search-index/`, `.modernization-backup/`, `AUDIT_REPORT.md`-style working docs as appropriate, and one-shot build scripts. **Verify (F-pack):** `npm pack` → extract tarball to temp dir → `node --input-type=module -e "import('<temp>/index.js')"` resolves with **no ERR_MODULE_NOT_FOUND**; tarball excludes the 56 MB index + build scripts; unpacked size < 5 MB.
- **WP1.2 (C3)** Convert `console.log`→`console.error` across **all runtime JS**: `index.js`, `tools/*.js`, `wiki/operator-data-manager.js`, `wiki/operator-data-python-api.js`, `wiki/utils/*.js`, `wiki/models/*.js`, `wiki/processor/*.js`. No stdout writes after `server.connect`. **Verify:** `grep -rn 'console.log' index.js tools/ wiki/ --include='*.js'` → 0; **plus runtime gate F.7** (spawn server, send `initialize`, assert every stdout line is a valid JSON-RPC frame).
- **WP1.3 (C2, M6)** Stats: in `loadProcessedEntries` set `this.stats.totalEntries = this.entries.size` (and recompute category counts) — or compute on-demand in `getSystemStats`. Distinguish ENOENT vs real errors in the catch; on hard init failure exit non-zero / mark degraded (tool handlers report it). **Verify:** harness boot banner prints `Ready with 629 operators` (read dynamically from `entries.size`, not a literal).
- **WP1.4 (M7)** Disable both `searchIndexer.loadIndex()` (manager:109) **and** the rebuild-if-empty branch (manager:~827–843) behind a flag; keep `performDirectSearch`. Exclude `wiki/data/search-index/` via `.npmignore`. **Verify:** boot reads neither index nor re-indexes (timing/log check); search harness returns >0 results.

### Tier 2 — Python tools + data (Lane M code; small data pass)
- **WP2.1 (C6 reads)** `get_python_api.js` & `search_python_api.js`: read `method.returns` (strip trailing `" :"`), fallback `returnType`; `member.readOnly ?? member.readonly`; `member.returnType ?? member.type`; `description` optional. Remove dead async `addedIdx` + unused imports. **Verify (content):** `get_python_api('CHOP')` output contains `**Returns:** Channel`, no trailing `" :"`, rendered-Returns count == method count.
- **WP2.2 (H3)** De-dup `OP`/`Op` in `python-api/index.json` + loader guard; ensure stubs/HTML don't re-add `Op`. **Verify (loaded-map):** after `initialize()`, `getPythonClasses().length === 68`, exactly one case-insensitive `op`; re-load doesn't reintroduce `Op`.
- **WP2.3 (low)** try/catch in `list_tutorials.js`, `get_tutorial.js`; optional-chain `getTutorial` in manager.
- **WP2.4 (C6 data side — NEW, blocker resolution)** Deterministic verify-or-omit pass over `wiki/data/python-api/*.json`: blank templated `"<name> member"` descriptions (→`""`); where member names duplicate within a class, derive the true name from the member `id`/bodyContent if recoverable, else mark `unverified:true`. Never leave duplicated invented names. **Verify:** 0 files with `"X member"` templated descriptions; 0 within-class duplicate member names (or all flagged unverified).

### Tier 3 — Version data rewrite (Lane W Batch A — 5 disjoint authors + independent checker)
Each author **WebFetches the §S URLs**, writes `_provenance`, and **deletes-by-default** any legacy entry it cannot source.
- **WP3.1** `version-manifest.json`: remove phantom 2024; add **2025** (Python 3.11.10, build `2025.30000`–`2025.32820`, status `current`); fix 2021 Python→3.7.2; **fetch-verify every** `pythonVersion`+`buildRange` (2019–2023 too) or mark unverified; builds as `YYYY.NNNNN`; update `versionOrder`/`pythonVersionMap`/`currentStable="2025"`.
- **WP3.2** `release-highlights.json`: add **2025** block — **only** features individually fetched+quoted from the §S 2025 pages; remove POPs from 2021/2022; fix Vulkan (sole API @2022.20000) and Engine/USD COMP (2022). Strip any legacy highlight not sourceable.
- **WP3.3** `experimental-builds.json`: real **2025.30000** series, Python 3.11.10; `YYYY.NNNNN` ranges; **DELETE every** `experimentalOperators`/`pythonApiAdditions`/`breakingChanges` across **all** series unless re-fetched+quoted; rewrite `trackInfo`.
- **WP3.4** `operator-compatibility.json`: **DELETE every** `changedIn` entry unless sourced; `body_track_chop.addedIn`→2022 (sourced); set POP `addedIn`→**2025** (they were 2022/2023/2024 — all wrong).
- **WP3.5** `python-api-compatibility.json`: **verify-or-mark-unverified** (not "leave as-is"); flag the python-api member-scrape defect handled by WP2.4.
- **WP3.6 (Lane M) — version routing fix:** rewrite `isExperimentalVersion` so bare `YYYY` (2025/2026)=**stable**, only `YYYY.NNNNN`=experimental; remove the `year>=2025→experimental` branches (version-filter.js ~150/184); add 2025/2026 to the stable whitelist/`versionOrder`. Fix **all three** hardcoded version lists in `get_version_info.js` (lines 26, 54, 67) → `…2022, 2023, 2025`; add experimental redirect via `isExperimentalVersion()`. Add 2025 to `get_python_api.js` versionOrder (~line 83). Sweep `2025.10000`/`currentExperimentalSeries` references across `tools/get_experimental_build.js`, `tools/list_experimental_builds.js`, `version-filter.js` → real series (after WP3.3 lands). **Verify:** `get_version_info('2025')`→stable (Python 3.11.10, current), no redirect; `get_version_info('2025.30000')`→redirect; `isExperimentalVersion('2025')===false`; `grep '2024' get_version_info.js`→0.
- **WP-VERIFY-SRC (independent checker agent, ≠ authors):** re-fetch each `_provenance.url` and confirm the written value is substantiated on the page; auto-strip/flag any unsubstantiated fact. Hard gate F.8.

### Tier 4 — Operator data integrity (Lane W Batch C — deterministic scripts)
- **WP4.1 (H10/H11)** `scripts/backfill-urls.js`: for every operator file set `url = https://docs.derivative.ca/<Title>` where Title = id→family-suffix-cased Title (e.g. `accumulate_pop`→`Accumulate_POP`), **stripping any `Experimental-`/`Experimental:`**. **Verify:** 629/629 non-empty `url`; **fetch-validate 100% of the 90 POP + 7 experimental-namespace ops** (the risky subset) HTTP 200 + page title matches displayName; stratified ≥5/family for the rest; non-200s logged as gaps. (Oldid-rewrite dropped — search-index is dead/excluded.)
- **WP4.2** Emit `url` (`**Docs:**` line) in `get_operator.js` + `get_python_api.js` output, gated on non-empty.
- **WP4.3 (C4/C5 — merged into WP6.1 re-scrape)** Safe deterministic now: blank `"Configure X for the operator"` descriptions (→`""`) across the 89 affected files; set `paramsVerified:false` on files whose params are not yet re-scraped. **No name-blacklist deletion.** Param correction happens via WP6.1.
- **WP4.4 (H12)** `scripts/normalize-schema.js`: backfill missing top-level keys on cluster-2/3 files so all 629 share the rich schema, operating on **on-disk JSON** (not in-memory WikiEntry). `contentHash`: leave `""` (no consumer) or fill via `WikiEntry.calculateHash`; documented. **Verify:** each `processed/*.json` literally contains the key set.
- **WP4.5 (H13)** The 4 hand-curated `versionSupport` files: **strip** unsourced `changedIn` specifics unless re-fetched+quoted (default omit); record provenance for any kept.
- **WP4.6 (low/M13)** Fix 3 `*_Class` leftover descriptions (re-scrape or blank); separate `workflowPatterns` slugs from operator refs.
- **WP4.7 (H9 — NEW)** Repoint `python-api/PythonOp.json`→`OP_Class`, `ScriptOp.json`→a live per-family `Script_*` page; 200-OK checked, sourced.

### Tier 5 — Experimental KB accuracy (Lane W Batch B — 7 disjoint agents, audit-specified)
- **WP5.1** `glsl.json`: add `layout(location=0) out vec4 fragColor;` to all fragment snippets; raymarch aspect `res.z/res.w`; list all aliases.
- **WP5.2** `machine-learning.json`: Body Track→NVIDIA Maxine AR SDK + real params/channels (max 8); replace `TouchEngine CHOP/TOP`→Engine COMP + In/Out ops; merge double `onSetupParameters`; add bottom-left-origin `np.flipud` notes (ONNX/MediaPipe/style snippets); reframe ONNX version gate; drop Face Track SOP from body tracking.
- **WP5.3** `networking.json`: relabel TDAbleton example as AbletonOSC (or rewrite to real components); NDI→Vizrt; substantiate/remove license caveat.
- **WP5.4** `gpu-compute.json`: instancing→`instancing`/`instanceop`; force-field→`sTD2DInputs[1]` (drop custom sampler); add GLSL output decl; `np.flipud` for opencv/numpy snippets.
- **WP5.5** `generative-systems.json`: Replicator→`onCreate`/`onRemoveReplicant` (drop `numreplicants`); GLSL output decls (game_of_life/boids).
- **WP5.6** `audio-visual.json`: correct Audio Spectrum CHOP (magnitude/phase channels, bins=samples, FFT default 8192).
- **WP5.7** `python-advanced.json`: drop `td.asyncio`.
- **Lane M:** `search_experimental.js` shares `CATEGORY_ALIASES` (M3); `get_glsl_pattern.js` lists all aliases; **remove dead `setup.chain`/`setup.steps` branches** in `get_experimental_techniques.js`. **Verify:** all 7 JSON parse; `search_experimental(category_filter:'ml')` works; fabrication-marker scan (F.9) clean.

### Tier 6 — Coverage scrape (Lane W Batch D — wikitext, bounded, provenance-gated)
- **WP6.0** `scripts/scrape-operator.js`: fetch `action=parse&prop=wikitext`; emit one param per `{{Parameter}}` (keyed by `parName`), nest `{{ParameterItem}}` as `menuItems` of the matching parent; description from `{{...Summary}}`/section 0; set `url` (bare) + `sourceUrl` + provenance. **HARD GATE before fan-out:** validate parity on ≥1 op per family (POP/TOP/CHOP/DAT/COMP/SOP/MAT) — assert NO menu-option value appears as a top-level param name, and param count within tolerance of the live `{{Parameter}}` count.
- **WP6.1 (C4/C5 root fix)** Re-scrape **all 90 POP** files → correct params (the fabricated entries vanish, being `{{ParameterItem}}` not `{{Parameter}}`). One agent per op. **Verify:** each re-scraped file passes the contamination scan (0 single-char/numeric/type-token top-level params except allowlisted; 0 template descriptions); `paramsVerified:true`.
- **WP6.2** Scrape missing operators (named first): PBR TOP; RenderStream Out CHOP; TCP/IP, UDT In, UDT Out, Web, Serial Devices DAT; Field, GlTF In, GlTF Out COMP; missing POPs (Alembic In/Out, Triangulate, Trace, Text, Plane, Line Resample, Force Radial, GLSL Create, OAK Select, ZED, Line Thick, File Out); then **capped** `categorymembers` diff per family (`cmlimit=500`, single page, **no continuation**; cap = N/family, M total; overflow logged as gap). One agent per op; failures skip-and-log, never fake.
- **WP6.3 (stretch, capped)** Expand high-value Python classes (`timerCHOP`, `moviefileinTOP`, `bodytrackCHOP`, `actorCOMP`, `ParCollection`, `ParGroupCollection`, `Color`, …) via the `_Class` wikitext pages. Document coverage; cap; never fake.

### Tier 7 — Docs + deps + version bump (Lane M, LAST)
- **WP7.1 (H1/H2)** Re-scan **every tracked file** (not just the 4 docs) for stale counts; regenerate family tables from `recount.js`; replace fabricated sample outputs with real banner; fix `index.js:65`. **Gate:** grep all docs → 0 occurrences of stale `630`/`631`/`649`/`69`(as op/python miscount); correct per-family table present verbatim.
- **WP7.2 (M12)** Replace `.mcp.json` with a minimal correct `npx @bottobot/td-mcp` example (pre-decided: replace, not delete); ensure excluded from tarball.
- **WP7.3 (M14)** `package.json`: SDK `^1.29.0`; `zod ^3.25.0`; move `cheerio ^1.1.2`→`devDependencies`; `engines.node >=20.0.0`. `npm install` to refresh lockfile **if** the registry is reachable (no auth); if offline, edit ranges only and log. **Verify:** `node --check`; pack clean.
- **WP7.4** Bump to **3.0.0**; write `CHANGELOG.md [3.0.0]` (Added/Changed/Fixed/Removed); fix phantom `v2.9–2.11` comments (M5); standardize `processingVersion`.
- **WP7.5** README/ARCH narrative: real TD 2025 support, honest coverage %, KB accuracy note.
- **WP7.6 (drift guard)** Correct stale `69`→`68` and TD-2024→2025 facts in `.claude/agents/update-documentation.md` + `.claude/commands/td-mcp-improvement.md`, OR list them in §H as out-of-scope (pre-decided: **correct them** to prevent future-run regression).

### Tier 8 — Final validation (Lane M, harness-driven)
- **WP8.1** Run `scripts/smoke-test.js` (the harness) + `scripts/check-provenance.js` + fabrication-marker scan + the **per-critical regression matrix** (mandatory). Re-fetch a sample of URLs. Record before/after counts.
- **WP8.2** Update `MODERNIZATION_TRACKER.md` with per-WP evidence; completion summary + `.remember/remember.md` handoff. Leave changes as reviewable `git diff`.

---

## E. Sequencing
```
Tier0 ─> { Tier1 | Tier2 | BatchA(Tier3)+VERIFY-SRC | BatchB(Tier5) | BatchC(Tier4) } ─> BatchD(Tier6) ─> Tier7 ─> Tier8
```
Tier 6 before Tier 7 (final counts). Tier 8 last. `_provenance` + fabrication gates run continuously and in Tier 8.

## F. Verification gates (executable; harness `scripts/smoke-test.js` unless noted) — ALL must pass
1. `node --check` every `.js` → 0 errors.
2. `JSON.parse` every data file → 0 errors.
3. `scripts/recount.js` → counts match docs; **count-purge**: grep all docs → 0 stale 630/631/649/miscounted-69; per-family table verbatim.
4. Reference map → 0 unresolved `relatedOperators`; **URL correctness**: 100% POP/experimental urls 200 + title match; ≥5/family elsewhere.
5. **Content smoke test** (fixtures table): each of 21 handlers called with realistic params exercising the fixed path, asserting specific substrings (e.g. `get_version_info('2025')` contains `Python 3.11.10` + `POP`; `get_python_api('CHOP')` contains `**Returns:** Channel`; `get_operator('Noise CHOP', show_parameters)` no template descriptions).
6. `npm pack` → includes JS data layer; **excludes** 56 MB index + build scripts + `.mcp.json`; temp-install import → no ERR_MODULE_NOT_FOUND; unpacked size < 5 MB.
7. **Runtime stdout gate:** spawn server, send `initialize` JSON-RPC, every stdout line is a valid JSON-RPC frame (no banner text).
8. **Provenance gate** (`scripts/check-provenance.js`): every rewritten version record + scraped operator has non-empty `_provenance`/`sourceUrl` on a derivative.ca URL.
9. **Fabrication-marker scan:** grep tree for fingerprints (`for the operator`, `2025.10000`, `Python 3.12`, `TouchEngine CHOP`, `TouchEngine TOP`, `POPGPU`, `asyncCook`, `sForceField`, `numreplicants`, `onReplicatorPulse`, `currentStable":"2024`) → 0 hits.
10. **Schema-contract gate:** each rewritten manifest/highlights entry exposes the exact keys handlers read; `get_version_info('2025')` output contains no literal `undefined` and a `2025.\d{5}` build string.
11. **Per-critical regression matrix (C1–C15):** one explicit assertion each (e.g. C7: `manifest.currentStable==='2025'` && no `id==='2024'`; C11: series `2025.30…` && no `Python 3.12`; C1: pack includes `operator-data-manager.js`+`version-filter.js`; C2: banner `629`; C14: every GLSL fragment snippet declares `out vec4 fragColor`). Tier not done until its criticals assert true.

## G. Risks & mitigations
- **R1 New fabrication** → §S URLs + §P provenance + independent checker + F.8/F.9.
- **R2 Scrape volume/time** → deterministic backbone first; WP6.1 (90 POPs) prioritized; WP6.2/6.3 capped; gaps logged.
- **R3 Collisions** → disjoint ownership; Lane M for shared files; `2025.10000` sweep sequenced after WP3.3.
- **R4 docs.derivative.ca variance/limit** → wikitext parse validated per-family before fan-out; modest concurrency; skip-and-log, never fake.
- **R5 npm install offline** → ranges-only fallback.
- **R6 Schema assumptions** → load-time default-filler + schema-contract gate F.10.

## H. Out of scope (pre-decided)
- npm publish / git push (auth).
- SDK v2-alpha migration.
- Full Python API parity beyond WP6.3's capped set (remaining logged as gap).
