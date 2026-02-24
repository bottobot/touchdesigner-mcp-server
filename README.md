# TouchDesigner MCP Server

[![npm version](https://img.shields.io/npm/v/@bottobot/td-mcp.svg)](https://www.npmjs.com/package/@bottobot/td-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Model Context Protocol (MCP) server that brings comprehensive TouchDesigner operator documentation, Python API references, and tutorials directly to your AI coding assistant.

I personally use it with VS Code/Codium and the Roo Code Extension alongside my favorite LLMs like Claude Opus and GPT-5. While the server should theoretically work with other applications like Docker or Claude Desktop, I haven't thoroughly tested those integrations yet.

**The Story So Far:** The catalyst for this project was simple -- A few months ago I decided I wanted an AI tool that could develop visuals in TouchDesigner for me. I've been making some basic things in TD for awhile but it has one of the steepest learning curves of any creative software I've ever used. How nice would it be just to ask an LLM "Please make a 720p, animated in realtime, constantly evolving, reaction diffusion simulation in TouchDesigner." and then just have it spit one out? Super duper nice is the answer in my opinion.

Like every project I undertake where I know very little, I thought it would be pretty straight forward! LOL! When I started I had no idea just how much time and tokens I would end up sinking into this one. And I still have a ways to go before I consider it complete with full integration into TouchDesigner itself and very little margin of error.

However as far as querying information about operators and their parameters goes -- it works pretty darn well! The major challenge I face with getting any LLM to use this tool effectively for developing networks with real complexity is that the models tend to forget to use the MCP server and fall back on their outdated trained knowledge of much older TouchDesigner versions. If anyone has suggestions on how to overcome this particular wrinkle, I'd absolutely love to hear your feedback!

## How to Use It (My Current Workflow)

Right now, I'm focused on ensuring the server returns useful and accurate Python API information. Here's my workflow: I describe the network I want to create -- for example, a reaction diffusion visualization -- and then ask the AI to write a Python script that generates the network inside TouchDesigner using the textport. Once that's complete, I get an 'exec' command that lets me copy and paste just one line into the textport, and voila -- a network is generated!

**My ultimate dream**, however, is full integration directly into TouchDesigner itself. I experimented with a web server and WebSocket approach, which sort of worked, but since the LLMs I was testing weren't generating correct Python code and kept hallucinating information while not utilizing the MCP server to its fullest potential, I've temporarily shelved this part of the project. Once it's working reliably and generating solid visualizations or networks, then full integration will be the final step!

## Features

- **630 TouchDesigner Operators** - Complete documentation including 90+ experimental POP operators
- **14 Interactive Tutorials** - Comprehensive TouchDesigner learning guides
- **69 Python API Classes** - Full Python scripting documentation with 1,510+ methods
- **21 MCP Tools** - Across five functional groups: operator reference, tutorials, Python API, version system, and experimental content
- **32 Workflow Patterns** - Curated operator chain patterns with 72 common transitions

### Version System
- **Version History** - All stable TD releases documented from 099 through 2024
- **Compatibility Tracking** - Per-operator and per-method version compatibility data
- **Python Timeline** - Full Python version history bundled with each TD release
- **Release Highlights** - Key features and breaking changes per major release

### Experimental Techniques Knowledge Base
- **7 Technique Categories** - GLSL, GPU compute, machine learning, generative systems, audio-visual, networking, Python advanced
- **2,000+ Lines of Code** - Working, paste-ready code snippets for advanced techniques
- **16 Named GLSL Patterns** - Complete shader code for raymarching, reaction-diffusion, feedback, and more
- **Difficulty Ratings** - Each technique rated with minimum TD version requirements

### Core Enhancements
- **Operator Wiring Guides** - Exact port-level connection instructions for 20+ common operators
- **Network Templates** - Five ready-to-build network templates with Python generation scripts
- **Version-Aware Search** - Filter operators and Python API by TD release compatibility
- **Smart Workflow Suggestions** - Port wiring, complexity ratings, and node count estimates

### Experimental Build Support
- **6 Experimental Build Series** - Documented from builds 20000 through current (2025.10000)
- **Feature Flag Tables** - Opt-in/opt-out flags for each experimental series
- **Graduation Tracking** - Which experimental features graduated into stable releases
- **Breaking Change Logs** - Per-series breaking changes versus the stable baseline

### Core Server Features
- **Smart Search** - Direct search with category filtering, parameter search, and version filtering
- **Zero Configuration** - Works immediately after installation
- **Pure MCP Implementation** - Clean stdio-based server, no web server overhead
- **Local Data Processing** - All documentation served from local JSON files, no network requests

## Installation

### Global Installation (Recommended)
```bash
npm install -g @bottobot/td-mcp
```

### Local Installation
```bash
npm install @bottobot/td-mcp
```

## Quick Start

### Using with VS Code/Codium and Claude

1. **Install the MCP server globally:**
   ```bash
   npm install -g @bottobot/td-mcp
   ```

2. **Configure Claude/MCP in VS Code:**
   Add the server to your MCP settings configuration file:
   ```json
   {
     "td-mcp": {
       "command": "npx",
       "args": ["@bottobot/td-mcp"]
     }
   }
   ```

3. **Start using TouchDesigner tools** in your conversations with Claude!

### Running Standalone

```bash
# If installed globally
td-mcp

# If installed locally
npx @bottobot/td-mcp
```

## Available MCP Tools (21 Total)

### Core Operator Tools

#### get_operator
Get comprehensive details about a specific TouchDesigner operator including all parameters, tips, and code examples.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Operator name (e.g., 'Noise CHOP', 'Movie File In TOP') |
| `show_examples` | boolean | No | Show code examples and usage |
| `show_tips` | boolean | No | Show tips and performance notes |
| `version` | string | No | Include compatibility block showing when the operator was added or changed for this TD version |

```
Example: "Get detailed information about the Noise CHOP operator"
Example: "Get the Engine COMP documentation for TD 2022"
```

#### search_operators
Search for operators using contextual analysis and relevance ranking.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `category` | string | No | Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP, POP) |
| `subcategory` | string | No | Filter by subcategory (e.g., 'Audio', 'Filters') |
| `type` | string | No | Search mode: 'fuzzy' (default), 'exact', or 'tag' |
| `version` | string | No | Filter to operators compatible with a specific TD version (e.g., '2022') |
| `parameter_search` | boolean | No | Search within parameter names and descriptions |
| `show_details` | boolean | No | Show detailed results with keywords |
| `limit` | number | No | Maximum results (default: 10, max: 50) |

```
Example: "Search for audio processing operators in the CHOP category"
Example: "Find operators added in TD 2022"
```

#### list_operators
List available TouchDesigner operators with optional category filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by operator category |

```
Example: "List all TOP operators"
```

#### compare_operators
Compare two operators side by side -- parameters, categories, shared/unique features.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operator_a` | string | Yes | First operator name |
| `operator_b` | string | Yes | Second operator name |
| `compare_parameters` | boolean | No | Include parameter comparison (default: true) |

```
Example: "Compare Blur TOP with Luma Blur TOP"
```

#### get_operator_examples
Get Python code examples, expressions, and usage patterns for a specific operator.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operator` | string | Yes | Operator name |
| `example_type` | string | No | Type: 'all', 'python', 'expressions', or 'usage' |

```
Example: "Get Python examples for Movie File In TOP"
```

#### suggest_workflow
Get workflow suggestions for what operators commonly follow the current operator.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `current_operator` | string | Yes | Current operator name |

```
Example: "What operators typically follow a Movie File In TOP?"
```

### Tutorial Tools

#### get_tutorial
Access detailed TouchDesigner tutorial content with full sections, code, and links.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Tutorial name |
| `include_content` | boolean | No | Include full content sections |
| `include_toc` | boolean | No | Include table of contents |
| `include_links` | boolean | No | Include related links |

```
Example: "Get the 'Write a GLSL TOP' tutorial"
```

#### list_tutorials
List all available TouchDesigner tutorials with optional filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search term to filter tutorials |
| `limit` | number | No | Maximum results |
| `show_details` | boolean | No | Show tutorial summaries and keywords |

```
Example: "List all available tutorials"
```

#### search_tutorials
Search through tutorial content by keyword, topic, or content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `search_content` | boolean | No | Search within section content (default: true) |
| `limit` | number | No | Maximum results (default: 10) |

```
Example: "Search tutorials for GLSL shader examples"
```

### Python API Tools

#### get_python_api
Get documentation for a TouchDesigner Python class including members and methods.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `class_name` | string | Yes | Python class name (e.g., 'CHOP', 'Channel', 'App') |
| `show_members` | boolean | No | Show class members/properties |
| `show_methods` | boolean | No | Show class methods |
| `show_inherited` | boolean | No | Show inherited members and methods |
| `version` | string | No | Annotate each method/member with its introduction version and exclude API added after this TD version |

```
Example: "Get Python documentation for the CHOP class"
Example: "Get Python API for the App class as of TD 2021"
```

#### search_python_api
Search across TouchDesigner Python classes, methods, and members.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `search_in` | string | No | Where to search: 'all', 'classes', 'methods', 'members' |
| `category` | string | No | Filter by category |
| `version` | string | No | Filter classes, methods, and members to those available in the specified TD version |
| `limit` | number | No | Maximum results |

```
Example: "Search Python API for audio methods"
Example: "Find Python API methods available in TD 2020"
```

#### list_python_classes
List all available Python API classes grouped by category.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category (e.g., 'Operator', 'General') |
| `search` | string | No | Search term to filter classes |
| `show_details` | boolean | No | Show member/method counts |

```
Example: "List all Python API classes in the Operator category"
```

### Version System Tools

#### get_version_info
Get detailed information about a specific TouchDesigner stable release: which Python version
it bundles, new operators introduced, key features, Python API additions, and breaking changes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `version` | string | Yes | TD version string (e.g., '2024', '2022', '2019', '099') |

```
Example: "What Python version does TouchDesigner 2022 use?"
Example: "What operators were added in TouchDesigner 2023?"
```

#### list_versions
List all supported TD versions (099, 2019, 2020, 2021, 2022, 2023, 2024) with a quick-reference
table showing the bundled Python version and support status for each release, plus the full
Python version timeline.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| *(none required)* | — | — | Returns all versions with highlights |

```
Example: "List all supported TouchDesigner versions"
Example: "Show the Python version timeline for TouchDesigner"
```

### Experimental Techniques Tools

#### get_experimental_techniques
Browse a curated library of advanced TouchDesigner techniques by category. Returns
descriptions, difficulty ratings, version requirements, operator chains, uniform tables,
and full working code snippets.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | Yes | Technique category. Aliases accepted: 'glsl', 'gpu-compute', 'machine-learning', 'generative-systems', 'audio-visual', 'networking', 'python-advanced' |
| `technique_id` | string | No | ID of a specific technique within the category |

```
Example: "Show me GLSL raymarching techniques in TouchDesigner"
Example: "Get GPU compute techniques using numpy"
```

**Available Categories:**

| Category | Alias(es) | Techniques |
|----------|-----------|-----------|
| glsl | shader, raymarching, sdf | Raymarching, reaction-diffusion, feedback, procedural noise |
| gpu-compute | gpu, cuda | Script TOP numpy, CUDA, Shared Memory, GPU instancing |
| machine-learning | ml, ai | Engine COMP, ONNX, Stable Diffusion, MediaPipe, Body Track |
| generative-systems | generative, lsystem | L-systems, Game of Life, strange attractors, boids |
| audio-visual | audio, fft | FFT geometry, beat detection, granular synthesis, MIDI |
| networking | network, osc, ndi | OSC, WebSocket, NDI, TDAbleton, multi-machine |
| python-advanced | python, numpy, opencv | asyncio, tdu.Dependency, threading, numpy, OpenCV |

#### search_experimental
Full-text search across all 7 experimental technique categories. Results ranked by weighted
field scoring (name, tags, description, notes, code).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `category_filter` | string | No | Restrict search to one category |
| `show_code` | boolean | No | Include code snippets in results |
| `limit` | number | No | Maximum results (default: 10, max: 30) |

```
Example: "Search experimental techniques for reaction diffusion"
Example: "Find GPU instancing examples in the experimental library"
```

#### get_glsl_pattern
Retrieve a specific named GLSL pattern with complete, paste-ready shader code. Covers 16
named patterns across raymarching, reaction-diffusion, feedback, procedural noise, cellular
automata, and GPU particle simulation. Also provides three reusable GLSL utility libraries.
Use `pattern: "list"` to enumerate all available patterns.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | Yes | Pattern name or 'list' to see all available patterns |
| `include_utilities` | boolean | No | Include GLSL utility library code (default: false) |

```
Example: "Get the raymarching GLSL pattern"
Example: "List all available GLSL patterns"
Example: "Get the reaction diffusion shader pattern"
```

### Core Enhancement Tools

#### get_operator_connections
Get a wiring guide for a specific operator: what operators typically connect upstream as
inputs and downstream as outputs, with exact port numbers, rationale, and workflow pattern
names. Covers 20+ common operators across all families.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operator` | string | Yes | Operator name (with or without family suffix; case-insensitive) |

```
Example: "What connects to and from a Render TOP?"
Example: "Show me the typical connections for a Noise CHOP"
```

#### get_network_template
Return a complete, ready-to-use network template for a common TouchDesigner use case.
Each template includes an operator list, a port-level connection table, parameter settings,
and a ready-to-paste Python script that builds the network. Use `template: "list"` to see
all available templates.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `template` | string | Yes | Template name or 'list' to enumerate all templates |

**Available Templates:**

| Template | Description |
|----------|-------------|
| `video-player` | File-based video playback with level and output controls |
| `generative-art` | Noise-driven generative visual network |
| `audio-reactive` | Audio analysis feeding visual parameters |
| `data-visualization` | Table DAT driven chart and display network |
| `live-performance` | Multi-layer compositing setup for live use |

```
Example: "Give me a network template for audio-reactive visuals"
Example: "List all available network templates"
```

### Experimental Build Tools

TouchDesigner ships two parallel release tracks: stable annual releases (2019–2024) and
experimental/beta build series with unreleased features. These tools give you full access
to the experimental track.

#### get_experimental_build
Get detailed information about a specific experimental TD build series or the latest experimental series.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `series_id` | string | No | Experimental series ID (e.g. '2025.10000'). Omit for the latest experimental series. |
| `show_features` | boolean | No | Include new features list (default: true) |
| `show_breaking_changes` | boolean | No | Include breaking changes vs stable (default: true) |
| `show_python_api` | boolean | No | Include Python API additions (default: true) |
| `show_operators` | boolean | No | Include experimental operators (default: true) |

```
Example: "What new features are in the latest experimental TouchDesigner build?"
Example: "Get breaking changes for experimental series 2024.50000"
```

#### list_experimental_builds
List recent experimental TD build series grouped by feature area (rendering, Python API, operators, UI, networking).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `feature_area` | string | No | Filter by area: 'rendering', 'Python API', 'operators', 'UI', 'networking' |
| `stability_status` | string | No | 'experimental' (active) or 'graduated' (became stable) |
| `show_feature_flags` | boolean | No | Include feature flag tables (default: false) |
| `show_operators` | boolean | No | Include experimental operator lists (default: true) |
| `show_breaking_changes` | boolean | No | Include breaking change summaries (default: false) |

```
Example: "List experimental TD builds with rendering changes"
Example: "Which experimental build series introduced the Engine COMP?"
```

**Tracked Experimental Series:**

| Series ID | Year | Status | Headline Feature |
|-----------|------|--------|-----------------|
| 2025.10000 | 2025 | Active Experimental | Vulkan renderer default, Python 3.12, POP GPU Solver |
| 2024.50000 | 2024 | Graduated (TD 2024) | Python 3.11, Engine COMP async, TouchEngine v2 |
| 2023.11000 | 2023 | Graduated (TD 2023) | POP system preview, GLSL 4.50, NVIDIA DLSS TOP |
| 2022.32000 | 2022 | Graduated (TD 2022) | Engine COMP, USD COMP, NDI 5, WebRTC DAT |
| 2021.15000 | 2021 | Graduated (TD 2021) | Body Track CHOP, ONNX Runtime, Python 3.8 |
| 2020.20000 | 2020 | Graduated (TD 2020) | Bullet physics, GPU instancing v2, GLSL 4.40 |

## Operator Categories

| Category | Count | Description |
|----------|-------|-------------|
| **CHOP** | 166 | Channel Operators - Audio, control signals, and data streams |
| **TOP** | 140 | Texture Operators - 2D image and video processing |
| **SOP** | 112 | Surface Operators - 3D geometry creation and manipulation |
| **DAT** | 69 | Data Operators - Text, tables, and data handling |
| **COMP** | 41 | Component Operators - UI elements and containers |
| **MAT** | 13 | Material Operators - 3D rendering materials and shaders |
| **POP** | 90 | Point Operators - Particle systems (experimental) |

## Available Tutorials

### Core Tutorials
- **Anatomy of a CHOP** - Understanding channel operator internals
- **Build a List COMP** - Create dynamic UI lists
- **Introduction to Python Tutorial** - Essential guide for TouchDesigner Python scripting

### Advanced Development
- **Write a GLSL TOP** - Create custom GPU-accelerated image effects
- **Write a GLSL Material** - Custom GLSL materials for rendering
- **Write a C++ CHOP** - Develop native audio/data processing operators
- **Write a C++ TOP** - Build custom texture operators in C++
- **Write a C++ Plugin** - Advanced C++ integration for TouchDesigner plugins
- **Write a CUDA DLL** - GPU programming with CUDA for TouchDesigner

### Inter-Process Communication
- **Write a Shared Memory CHOP** - Inter-process data communication
- **Write a Shared Memory TOP** - Share textures between processes

### Video & Integration
- **Video Streaming User Guide** - Complete guide for video streaming workflows
- **TouchDesigner Video Server Specification Guide** - Professional video server setup
- **TDBitwig User Guide** - Integration with Bitwig Studio DAW

## Python API Documentation

The server includes documentation for **69 Python API classes** with **1,510+ methods** covering:

- Core operator classes (CHOP, TOP, SOP, DAT, MAT, COMP)
- Utility classes (Channel, Cell, Page, etc.)
- System classes (App, Project, Monitor, etc.)
- UI classes (Panel, Widget, etc.)
- Advanced features (WebRTC, NDI, MIDI, OSC, etc.)

## Architecture

The TD-MCP server is built with:
- **Pure MCP Implementation** - Clean stdio-based server following MCP standards
- **Direct Search Algorithm** - Fast, reliable search without external index dependencies
- **OperatorDataManager** - Centralized data management with 630 operators loaded into memory
- **Local Data Processing** - All operator data is processed and served locally
- **Modular Tool System** - Each of the 21 MCP tools is independently maintained
- **Dual Release Track Support** - Stable annual releases (2019–2024) and experimental build series both fully documented

## Project Structure

```
td-mcp/
├── index.js                         # Main MCP server entry point (21 tools)
├── tools/                           # MCP tool implementations (21 tools)
│   ├── get_operator.js              # Full operator documentation
│   ├── search_operators.js          # Operator search with ranking
│   ├── suggest_workflow.js          # Workflow chain suggestions
│   ├── list_operators.js            # List/filter operators
│   ├── get_tutorial.js              # Tutorial content access
│   ├── list_tutorials.js            # Tutorial listing
│   ├── search_tutorials.js          # Tutorial content search
│   ├── get_python_api.js            # Python class documentation
│   ├── search_python_api.js         # Python API search
│   ├── list_python_classes.js       # Python class browsing
│   ├── get_operator_examples.js     # Code examples per operator
│   ├── compare_operators.js         # Side-by-side comparison
│   ├── get_version_info.js          # Stable version details
│   ├── list_versions.js             # All stable versions
│   ├── get_experimental_techniques.js # Advanced technique library
│   ├── search_experimental.js       # Search techniques
│   ├── get_glsl_pattern.js          # Named GLSL shader patterns
│   ├── get_operator_connections.js  # Operator wiring guide
│   ├── get_network_template.js      # Full network templates
│   ├── get_experimental_build.js    # Experimental build series details
│   └── list_experimental_builds.js  # List experimental series by area
├── wiki/                            # Documentation system
│   ├── data/
│   │   ├── processed/               # 630 operator JSON files
│   │   ├── tutorials/               # 14 tutorial JSON files
│   │   ├── python-api/              # 69 Python class JSON files
│   │   ├── experimental/            # 7 advanced technique JSON files
│   │   ├── search-index/            # Search index data
│   │   └── versions/               # Version compatibility data
│   │       ├── version-manifest.json
│   │       ├── operator-compatibility.json
│   │       ├── python-api-compatibility.json
│   │       ├── release-highlights.json
│   │       └── experimental-builds.json  # Experimental track data
│   ├── utils/
│   │   └── version-filter.js        # Version utilities + experimental support
│   ├── operator-data-manager.js     # Core documentation engine
│   └── operator-data-python-api.js  # Python API data manager
├── data/
│   └── patterns.json                # 32 workflow patterns + transitions
├── scripts/                         # Data maintenance scripts
│   ├── clean-operator-data.js       # Clean parameter descriptions
│   └── enrich-top-operators.js      # Add tips/examples to operators
└── package.json
```

## Troubleshooting

### Server won't start
- Ensure Node.js 18.0+ is installed: `node --version`
- Try reinstalling: `npm install -g @bottobot/td-mcp`
- Check for port conflicts if running other MCP servers

### Search returns no results
- Try broader search terms
- Remove category filters
- Enable `parameter_search` to search within parameter names
- Check spelling of operator names

### Operator not found
- Use the full operator name including family: `Noise CHOP` not just `Noise`
- Use `search_operators` first to find the exact name
- Use `list_operators` with a category filter to browse available operators

### LLM not using the MCP tools
- Explicitly mention TouchDesigner in your prompt
- Ask the LLM to "use the td-mcp tools" to look up operator information
- Remind the LLM to check parameters with `get_operator` before generating code

## Requirements

- Node.js 18.0 or higher
- npm package manager
- VS Code/Codium with MCP-compatible extension (e.g., Claude Dev, Roo Code)

## Development

To contribute or modify the server:

```bash
# Clone the repository
git clone https://github.com/bottobot/touchdesigner-mcp-server.git

# Install dependencies
cd touchdesigner-mcp-server
npm install

# Run the server locally
node index.js

# Validate syntax
node --check index.js

# Clean operator data (removes HTML dumps from parameter descriptions)
node scripts/clean-operator-data.js

# Enrich top operators with tips and examples
node scripts/enrich-top-operators.js
```

### Adding a New Tool

1. Create a new file in `tools/` following the existing pattern (export `schema` and `handler`)
2. Import and register the tool in `index.js`
3. Update this README with the tool documentation

### Adding Operator Data

Operator data lives in `wiki/data/processed/` as JSON files. Each file follows the schema with fields: `id`, `name`, `displayName`, `category`, `subcategory`, `description`, `parameters`, `tips`, `warnings`, `pythonExamples`, `codeExamples`, and `version`.

## Support

- **Issues**: [GitHub Issues](https://github.com/bottobot/touchdesigner-mcp-server/issues)
- **Documentation**: [TouchDesigner Official Docs](https://docs.derivative.ca)
- **NPM Package**: [@bottobot/td-mcp](https://www.npmjs.com/package/@bottobot/td-mcp)

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Acknowledgments

- TouchDesigner by [Derivative](https://derivative.ca)
- Model Context Protocol by [Anthropic](https://modelcontextprotocol.io)
- Built for the TouchDesigner community

---

**Current Version**: 2.8.0
**Operators**: 630 (with cleaned parameter descriptions)
**Tutorials**: 14
**Python API Classes**: 69
**MCP Tools**: 21
**Workflow Patterns**: 32
**Experimental Build Series**: 6 (builds 20000-current)
**Last Updated**: February 2026
