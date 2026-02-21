# Changelog

All notable changes to the TouchDesigner MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.0] - 2026-02-21

This release adds 9 new MCP tools (bringing the total to 21), introduces the Version System
and Experimental Techniques Knowledge Base, enhances core tools with richer output, and adds
full support for the experimental TouchDesigner build track.

### Added

#### Version System (2 new tools)

- **get_version_info** — Returns detailed information about a specific TouchDesigner version:
  Python version bundled with that release, new operators, key features, Python API additions,
  and any breaking changes. Supports all releases from 099 through 2024.

- **list_versions** — Lists all supported TD versions (099, 2019, 2020, 2021, 2022, 2023, 2024)
  with a quick-reference table showing Python version and support status, detailed highlights,
  and the full Python version timeline.

#### Version System Data Files (wiki/data/versions/)

- **version-manifest.json** — Canonical version registry mapping each TD release to its Python
  version, build range, release year, and support status (legacy / maintenance / active / current).
- **operator-compatibility.json** — Per-operator version compatibility with `addedIn`,
  `changedIn`, and `removedIn` fields for 40+ operators across all operator families.
- **python-api-compatibility.json** — Method-level version tracking for core Python API classes
  documenting when each method and member was introduced.
- **release-highlights.json** — Curated key features, new operators, Python language highlights,
  and breaking changes for each major TD release from 099 through 2024.

#### Version Filter Utility (wiki/utils/version-filter.js)

- **isCompatible(operatorId, version)** — Returns true/false whether an operator is available
  in a given TD version.
- **filterByVersion(operators, version)** — Filters an array of operator objects to those
  compatible with the specified version.
- **getVersionIndex(version)** — Returns the numeric ordering index for a version string.
- **normalizeVersion(version)** — Canonicalises any accepted version format to a consistent
  ID string.
- **getVersionInfo(version)**, **getOperatorCompatInfo(id)**, **getPythonCompatInfo(class, member)**
  — Additional lookup helpers. All version data is loaded lazily and cached in memory.

#### Experimental Techniques Knowledge Base (3 new tools)

- **get_experimental_techniques** — Browse a curated library of advanced TouchDesigner
  techniques by category. Returns descriptions, difficulty ratings, version requirements,
  operator chains, uniform tables, and full working code snippets. Supports category aliases:
  shader/raymarching/sdf -> glsl, gpu/cuda -> gpu-compute, ml/ai -> machine-learning,
  generative/lsystem -> generative-systems, audio/fft -> audio-visual,
  network/osc/ndi -> networking, python/numpy/opencv -> python-advanced.

- **search_experimental** — Full-text search across all 7 technique categories. Results are
  ranked by weighted field scoring (name x5, tags x4, description x3, notes x2, code x1).
  Supports optional category_filter, show_code toggle, and configurable limit (max 30).

- **get_glsl_pattern** — Retrieve specific named GLSL patterns with complete, paste-ready
  shader code. Covers 16 named patterns across raymarching, reaction-diffusion, feedback,
  procedural noise, cellular automata, and GPU particle simulation. Also provides three
  reusable GLSL utility libraries: sdf_primitives, color_utils, math_utils. Use
  `pattern=list` to enumerate all available patterns.

#### Experimental Techniques Data Files (wiki/data/experimental/)

Seven JSON files documenting advanced techniques with working code:

- **glsl.json** — 7 techniques: raymarching with SDF primitives and smooth booleans, SDF
  domain repetition, Gray-Scott reaction-diffusion ping-pong shader, feedback zoom/rotate
  decay, fBm procedural cloud texture, Voronoi/Worley cellular noise, GLSL Multi TOP
  multi-output pass.

- **gpu-compute.json** — 5 techniques: Script TOP numpy buffer read/write, CUDA TOP C++
  plugin skeleton, Shared Memory In/Out TOP inter-process setup, GPU instancing with
  Script CHOP Fibonacci sphere generator, ping-pong particle physics simulation.

- **machine-learning.json** — 6 techniques: Engine COMP / TouchEngine workflow (TD 2022+),
  ONNX Runtime inference in Script TOP, Stable Diffusion via HTTP API, MediaPipe Pose
  landmark extraction, Body Track CHOP skeleton reading, ONNX fast style transfer.

- **generative-systems.json** — 5 techniques: L-system expander with preset grammars,
  Game of Life GLSL with CA variants, strange attractors as Script SOP point clouds,
  Replicator COMP with Table DAT callback system, GPU boids flocking shader.

- **audio-visual.json** — 5 techniques: FFT to geometry, beat detection with BPM estimation,
  granular synthesis scheduler, MIDI-driven visuals with Event DAT callbacks, spectral
  analysis helpers as Script CHOP.

- **networking.json** — 5 techniques: OSC In/Out DAT with onReceiveOSC routing, WebSocket
  DAT server with JSON dispatch and JavaScript client example, NDI In/Out TOP streaming,
  TDAbleton bridge class, Touch In/Out CHOP/TOP multi-machine show setup.

- **python-advanced.json** — 6 techniques: asyncio background loop with thread-safe URL
  fetch, tdu.Dependency reactive state store with EventBus pattern, threading safety with
  Queue and RWLock, numpy image processing, scipy signal processing with Butterworth IIR
  filter, OpenCV integration with feature detection and optical flow.

#### Core Enhancements (2 new tools)

- **get_operator_connections** — Returns what operators typically connect to/from a named
  operator. Covers 20+ common operators across TOP, CHOP, SOP, DAT, and COMP families.
  Each entry includes upstream inputs with exact port wiring instructions, downstream
  outputs with rationale, common workflow pattern names, and wiring notes explaining port
  semantics. Accepts operator names with or without family suffix; case-insensitive alias
  matching covers common shorthand.

- **get_network_template** — Returns full network templates for five use cases:
  `video-player`, `generative-art`, `audio-reactive`, `data-visualization`, and
  `live-performance`. Each template includes an operator list with IDs, a port-level
  connection table, a parameter settings table, ready-to-paste Python scripts, and setup
  tips. Use `template: "list"` to enumerate all templates.

#### Experimental Build Support (2 new tools)

- **get_experimental_build** — Returns detailed information about a specific experimental
  TD build series or the latest experimental series. Includes new features, experimental
  operators with graduation status, feature flag tables, breaking changes versus the stable
  baseline, and Python API additions with the exact build number where each was introduced.
  Accepts a `series_id` parameter (e.g. `"2025.10000"`) or omits it to return the latest
  experimental series.

- **list_experimental_builds** — Lists recent experimental build series grouped by feature
  area (rendering, Python API, operators, UI, networking). Supports `feature_area` filter,
  `stability_status` filter (`"experimental"` or `"graduated"`), and optional
  `show_feature_flags`, `show_operators`, and `show_breaking_changes` toggles.

#### Experimental Build Data File (wiki/data/versions/experimental-builds.json)

Six experimental build series documented spanning builds 20000 through current:

| Series ID    | Status                     | Headline Feature                                   |
|--------------|----------------------------|----------------------------------------------------|
| 2025.10000   | Active experimental        | Vulkan renderer default, Python 3.12, POP GPU Solver |
| 2024.50000   | Graduated (TD 2024 stable) | Python 3.11, Engine COMP async, TouchEngine v2     |
| 2023.11000   | Graduated (TD 2023 stable) | POP system preview, GLSL 4.50, NVIDIA DLSS TOP     |
| 2022.32000   | Graduated (TD 2022 stable) | Engine COMP, USD COMP, NDI 5, WebRTC DAT           |
| 2021.15000   | Graduated (TD 2021 stable) | Body Track CHOP, ONNX Runtime, Python 3.8          |
| 2020.20000   | Graduated (TD 2020 stable) | Bullet physics, GPU instancing v2, GLSL 4.40       |

Each series documents feature flags, new features, experimental operators, breaking changes
versus the stable baseline, and Python API additions with exact build numbers.

#### Version Filter Utility Additions (wiki/utils/version-filter.js)

- **isExperimentalVersion(version)** — Returns true if a version string identifies an
  experimental build series (YYYY.NNNNN format, "experimental", "latest-experimental",
  or years >= 2025).
- **normalizeExperimentalVersion(version)** — Async. Canonicalises an experimental version
  string to a series ID, resolving "experimental" / "latest-experimental" to the current
  series from the data file.
- **getExperimentalBuildInfo(seriesId)** — Async. Returns the full experimental build series
  object for a given series ID or dynamic alias.
- **loadExperimentalBuilds()** — Async. Loads and caches experimental-builds.json for the
  process lifetime.
- **normalizeVersion()** updated to accept experimental version strings alongside existing
  stable version formats.

### Enhanced

#### search_operators

- New optional `version` parameter filters results to operators compatible with the
  specified TD release.
- New `type` enum parameter with three modes: `fuzzy` (default, existing behaviour),
  `exact` (restricts to operators whose name contains the query as a substring), and
  `tag` (searches only operator tags and keywords arrays).
- New `totalResults` count returned in every response Search Statistics section.
- `_meta` object included for programmatic consumers:
  `{ totalResults, displayed, searchType, limit }`.
- `limit` parameter now correctly enforces max of 50 via `Math.min(Math.max(limit, 1), 50)`
  in all code paths.

#### get_operator

- New optional `version` parameter adds a compatibility block to the output showing when
  the operator was added, any changes up to that version, and a warning if the operator
  was not yet available in the requested release.

#### search_python_api

- New optional `version` parameter filters classes, methods, and members to those available
  in the specified TD release.

#### get_python_api

- New optional `version` parameter annotates each method and member with its introduction
  version and excludes API added after the target version.

#### suggest_workflow

- Connection port instructions — each suggestion now shows the exact wiring string (e.g.
  `Movie File In TOP output 0 -> Level TOP input 0`) derived from a static transition map
  with 30+ pre-defined transitions.
- Complexity rating — each suggestion tagged `simple`, `medium`, or `complex`.
- Estimated node count — range string (e.g. `6-12`) reflecting the typical full workflow
  size for the inferred complexity level.
- Minimum TD version — per-suggestion minimum TD version string inferred from operator name
  patterns (Engine COMP -> 2022, POP -> 2022, NDI -> 2021, default 2019).
- Workflow summary table added at the top of every response.
- Footer cross-references `get_operator_connections` and `get_network_template`.

#### Enriched Wiki Data (wiki/data/processed/)

Four operator files fully rewritten with complete parameters, practical tips, warnings,
Python code examples, and cross-references:

- **feedback_top.json** — Full parameter set; 10 tips; 4 warnings; 4 Python examples.
- **render_top.json** — Full parameter set; 10 tips; 6 warnings; 4 Python examples.
- **geometry_comp.json** — Full parameter set; 10 tips; 5 warnings; 3 Python examples.
- **camera_comp.json** — Full parameter set; 10 tips; 5 warnings; 4 Python examples.

### Fixed

- **Python class count corrected** — Documentation and server startup messages now correctly
  report 69 Python API classes (was incorrectly stated as 553 in some earlier messages).
- **suggest_workflow confidence overflow** — Confidence scores no longer exceed 100%.
- **get_tutorial error message** — Now correctly references `search_tutorials` tool.
- **Stale TODO comments removed** — Cleaned up outdated wiki integration TODO comments
  from index.js.

### Tool Count

Total registered MCP tools: **21** (up from 12 in v2.7.0).

---

## [2.7.0] - 2026-02-21

### New MCP Tools (4 added, 12 total)
- **search_tutorials** — Search through tutorial content by keyword/topic with relevance ranking
- **get_operator_examples** — Get Python code examples, expressions, and usage patterns for any operator
- **list_python_classes** — Browse all 69 Python API classes grouped by category
- **compare_operators** — Side-by-side comparison of two operators including shared/unique parameters

### Operator Data Quality
- Cleaned 620 operator files — removed raw HTML dumps from parameter descriptions
- Removed 4,247 duplicate parameters across operators
- Enriched 15 key operators with tips, warnings, version info, and Python examples
- Added data cleanup scripts: scripts/clean-operator-data.js and scripts/enrich-top-operators.js

### Workflow Patterns Expanded
- 32 workflow patterns (up from 20)
- 72 common transitions (up from 54)
- 20 operator purposes (up from 15)

### Bug Fixes
- Fixed suggest_workflow confidence score overflow (was dividing by 10 instead of 15)
- Fixed get_tutorial error message to reference search_tutorials correctly
- Removed stale TODO comments from index.js

### Documentation
- Complete README rewrite with all 12 tools documented and parameter tables
- Removed PM2 section (not applicable to stdio MCP servers)
- Updated project structure to reflect all new files and tools
- Added developer guide for adding new tools and operator data

---

## [2.6.1] - 2025-01-16

### Fixed
- get_python_api tool now returns proper MCP content format (was returning no response)
- search_python_api tool now works correctly (was returning no response)
- Both Python API tools now wrapped in required `content: [{ type: "text", text: "..." }]` format
- Enhanced error handling — user-friendly error messages in proper MCP format
- Corrected Python API class count from incorrect 553 to accurate 69 classes

---

## [2.6.0] - 2025-01-14

### Fixed
- search_operators tool fully operational (was completely broken, returning zero results)
- Removed broken search indexer that was never properly synchronized with operator data

### Changed
- Renamed WikiSystem to OperatorDataManager throughout the codebase
- Removed DocumentationWebServer component (not needed for pure MCP implementation)
- Implemented direct search algorithm querying operator data without index dependency
- All references to WikiSystem updated to OperatorDataManager

### Removed
- Broken search indexer dependency
- DocumentationWebServer component and web server initialization
- Web server port configuration and shutdown handlers

---

## [2.5.0] - 2025-01-13

### Added
- Python API documentation tools (get_python_api, search_python_api)
- 69 Python API classes documentation with 1,510+ methods

### Improved
- Operator categorization system
- Search result ranking algorithm
- Parameter documentation coverage

---

## [2.4.0] - 2025-01-12

### Added
- 7 new comprehensive tutorials (doubled tutorial content from 7 to 14)
- Tutorials: Write a C++ CHOP, Write a C++ TOP, Write a C++ Plugin
- Tutorials: Write a CUDA DLL, Write a Shared Memory CHOP/TOP, TDBitwig User Guide

### Improved
- 24% package size reduction (optimized from 177MB to 135MB)
- Clean architecture with removed redundant files

### Fixed
- Tutorial loading issues
- Memory optimization for large documentation files

---

## [2.3.0] - 2025-01-10

### Added
- 90+ experimental POP (Point Operators) documentation
- Particle system operator support
- Enhanced operator workflow patterns

### Improved
- Search algorithm with contextual ranking
- Operator suggestion accuracy

---

## [2.2.0] - 2025-01-08

### Added
- suggest_workflow MCP tool
- Operator relationship mapping
- 20 common workflow patterns database

---

## [2.1.0] - 2025-01-05

### Added
- Full parameter documentation for all operators
- Advanced search with parameter matching
- Operator example code snippets
- Performance tips and best practices

### Fixed
- Search result relevance scoring
- Category filtering edge cases

---

## [2.0.0] - 2025-01-01

### Added
- Complete rewrite as MCP server
- 629 TouchDesigner operators documentation
- 14 comprehensive tutorials
- Smart contextual search
- Zero-configuration setup
- VS Code/Codium integration

### Changed
- Architecture from standalone app to MCP server
- Documentation format to JSON-based system

### Removed
- Legacy web interface and standalone desktop application

---

## [1.0.0] - 2024-12-15

### Added
- Initial release
- Basic operator documentation
- Simple search functionality
- Web-based interface

---

## Migration Guide

### From v2.7.0 to v2.8.0

No breaking changes. All 9 new tools are additive. Existing tool parameters and responses
are unchanged except for the optional enhancements to search_operators, get_operator,
suggest_workflow, search_python_api, and get_python_api — these only affect output when
the new optional parameters are supplied.

### From v2.6.0 to v2.7.0

No breaking changes. The four new tools are additive and don't affect existing functionality.

### From v2.6.0 to v2.6.1

Critical patch that fixes the broken Python API tools. No migration steps required — update
and restart your MCP server.

### From v2.5.0 to v2.6.0

Critical update that fixes broken search functionality. No migration steps required — update
and restart your MCP server.

### From v1.x to v2.x

Major architecture change from standalone application to MCP server:

1. Uninstall the old standalone application
2. Install via npm: `npm install -g @bottobot/td-mcp`
3. Configure in VS Code MCP settings
4. Remove old configuration files (no longer needed)

---

For more information, see the [README](README.md) or visit the
[GitHub repository](https://github.com/bottobot/touchdesigner-mcp-server).
