# MCP Architecture Documentation

## Table of Contents

1. [MCP Overview](#mcp-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [TD-MCP Documentation Server](#td-mcp-documentation-server)
4. [TD Control MCP Server](#td-control-mcp-server)
5. [Implementation Details](#implementation-details)
6. [Integration Patterns](#integration-patterns)
7. [Development Guidelines](#development-guidelines)
8. [Troubleshooting](#troubleshooting)

---

## MCP Overview

### What is MCP (Model Context Protocol)?

The Model Context Protocol is a standard for connecting AI assistants (like Claude) with external
tools and data sources. MCP servers expose functionality through a standardized interface that can
be consumed by MCP-compatible clients in VS Code/Codium.

### Core Concepts

- **MCP Server**: A service that exposes tools and resources via the MCP protocol
- **MCP Client**: An application (like VS Code with Claude) that connects to MCP servers
- **Transport**: Communication method (stdio, WebSocket, HTTP)
- **Tools**: Functions exposed by the server that can be invoked by the client
- **Resources**: Data sources that can be accessed by the client

### Architecture Benefits

- **Separation of Concerns**: Keep AI tools separate from application logic
- **Stability**: Out-of-process servers for better reliability
- **Flexibility**: Multiple transport options for different use cases
- **Modularity**: Independent tool development and deployment

---

## Architecture Patterns

### Pattern 1: Pure Documentation Server

**Use Case**: Providing reference documentation and search capabilities

```
VS Code/Claude <--stdio--> MCP Server <--local files--> Documentation Data
```

**Characteristics**:
- Read-only operations
- No external dependencies
- Fast, local data access
- Zero configuration

**Example**: TD-MCP Documentation Server

### Pattern 2: Bridge Pattern

**Use Case**: Controlling external applications

```
VS Code/Claude <--stdio--> MCP Server <--WebSocket--> Application Bridge <--API--> Application
```

**Characteristics**:
- Bidirectional communication
- Privileged application access
- Asynchronous operations
- Security considerations

**Example**: TD Control MCP Server

### Pattern 3: Hybrid Pattern

**Use Case**: Combining documentation with control capabilities

```
                   +-> Documentation Data
VS Code/Claude <--stdio--> MCP Server <
                   +-> WebSocket --> Application
```

**Characteristics**:
- Multiple data sources
- Mixed operation types
- Complex state management
- Enhanced functionality

---

## TD-MCP Documentation Server

### Overview

A pure MCP server (v2.8.0) providing comprehensive TouchDesigner documentation: operator
reference, Python API docs, tutorials, advanced technique patterns, version history, and
experimental build tracking — all served from local JSON files with zero network requests.

### Architecture Diagram

```
td-mcp/
├── index.js                              # Main MCP server entry point (21 tools registered)
├── tools/                                # MCP tool implementations (21 files)
│   ├── Operator Tools
│   │   ├── get_operator.js               # Full operator documentation
│   │   ├── search_operators.js           # Search with direct algorithm + version filter
│   │   ├── list_operators.js             # List/filter operators by category
│   │   ├── compare_operators.js          # Side-by-side operator comparison
│   │   ├── get_operator_examples.js      # Python/expression code examples
│   │   ├── suggest_workflow.js           # Workflow chain suggestions with port wiring
│   │   ├── get_operator_connections.js   # Upstream/downstream wiring guide
│   │   └── get_network_template.js       # Complete network templates
│   ├── Tutorial Tools
│   │   ├── get_tutorial.js               # Tutorial content access
│   │   ├── list_tutorials.js             # Tutorial listing with filtering
│   │   └── search_tutorials.js           # Tutorial full-text search
│   ├── Python API Tools
│   │   ├── get_python_api.js             # Python class documentation
│   │   ├── search_python_api.js          # Python API search + version filter
│   │   └── list_python_classes.js        # Python class browser by category
│   ├── Version System Tools
│   │   ├── get_version_info.js           # Stable version details
│   │   └── list_versions.js              # All stable versions with highlights
│   ├── Experimental Techniques Tools
│   │   ├── get_experimental_techniques.js # Advanced technique library by category
│   │   ├── search_experimental.js         # Full-text search across techniques
│   │   └── get_glsl_pattern.js            # Named GLSL shader patterns
│   └── Experimental Build Tools
│       ├── get_experimental_build.js      # Experimental build series details
│       └── list_experimental_builds.js    # List experimental series by feature area
├── wiki/                                  # Documentation system
│   ├── operator-data-manager.js           # Core documentation engine
│   ├── operator-data-python-api.js        # Python API data manager
│   ├── utils/
│   │   └── version-filter.js              # Version utilities + experimental support
│   └── data/
│       ├── processed/                     # 630 operator JSON files
│       ├── tutorials/                     # 14 tutorial JSON files
│       ├── python-api/                    # 69 Python class JSON files
│       ├── experimental/                  # 7 advanced technique JSON files
│       ├── versions/                      # Version compatibility and experimental data
│       └── search-index/                  # Search index data
├── data/
│   └── patterns.json                      # 32 workflow patterns + 72 transitions
└── scripts/
    ├── clean-operator-data.js             # Clean parameter descriptions
    └── enrich-top-operators.js            # Add tips/examples to operators
```

### Key Metrics (v2.8.0)

| Resource                  | Count  | Notes                                      |
|---------------------------|--------|--------------------------------------------|
| MCP Tools                 | 21     | Across 5 functional groups                 |
| Operator JSON files       | 630    | All families: CHOP, TOP, SOP, DAT, COMP, MAT, POP |
| Python API classes        | 69     | 1,510+ methods documented                  |
| Tutorials                 | 14     | Core, advanced dev, IPC, video/integration |
| Workflow patterns         | 32     | With 72 common transitions                 |
| Experimental technique files | 7   | 2,000+ lines of documented code snippets   |
| Stable TD versions        | 7      | 099 through 2024                           |
| Experimental build series | 6      | Builds 20000 through current               |

### Data Inventory

#### wiki/data/processed/ (630 operator JSON files)

Each operator file follows a standard schema with fields: `id`, `name`, `displayName`,
`category`, `subcategory`, `description`, `parameters`, `tips`, `warnings`,
`pythonExamples`, `codeExamples`, and `version`.

Operator families and counts:

| Family | Count | Description                                          |
|--------|-------|------------------------------------------------------|
| CHOP   | 166   | Channel Operators — audio, control signals, data streams |
| TOP    | 140   | Texture Operators — 2D image and video processing    |
| SOP    | 112   | Surface Operators — 3D geometry creation/manipulation |
| DAT    | 69    | Data Operators — text, tables, and data handling     |
| COMP   | 41    | Component Operators — UI elements and containers     |
| POP    | 90    | Point Operators — particle systems (experimental)    |
| MAT    | 13    | Material Operators — 3D rendering materials/shaders  |

#### wiki/data/tutorials/ (14 tutorial JSON files)

- Anatomy of a CHOP, Build a List COMP, Introduction to Python Tutorial
- Write a GLSL TOP, Write a GLSL Material, Write a C++ CHOP, Write a C++ TOP
- Write a C++ Plugin, Write a CUDA DLL
- Write a Shared Memory CHOP, Write a Shared Memory TOP
- Video Streaming User Guide, TouchDesigner Video Server Specification Guide
- TDBitwig User Guide

#### wiki/data/python-api/ (69 Python class JSON files)

Core operator classes (CHOP, TOP, SOP, DAT, MAT, COMP), utility classes (Channel, Cell,
Page), system classes (App, Project, Monitor), UI classes (Panel, Widget), and advanced
feature classes (WebRTC, NDI, MIDI, OSC). Total: 69 classes, 1,510+ methods.

#### wiki/data/versions/ (5 JSON files)

- **version-manifest.json** — Canonical version registry (099 through 2024)
- **operator-compatibility.json** — Per-operator addedIn/changedIn/removedIn fields
- **python-api-compatibility.json** — Method-level version tracking
- **release-highlights.json** — Key features and breaking changes per release
- **experimental-builds.json** — 6 experimental build series (20000 through current)

#### wiki/data/experimental/ (7 JSON files)

Advanced TouchDesigner technique library with working code:

- **glsl.json** — Raymarching, reaction-diffusion, feedback effects, procedural noise
- **gpu-compute.json** — Script TOP numpy, CUDA, Shared Memory, GPU instancing, particles
- **machine-learning.json** — Engine COMP, ONNX Runtime, Stable Diffusion, MediaPipe, Body Track
- **generative-systems.json** — L-systems, cellular automata, strange attractors, Replicator, boids
- **audio-visual.json** — FFT geometry, beat detection, granular synthesis, MIDI visuals
- **networking.json** — OSC, WebSocket, NDI, TDAbleton, multi-machine show setup
- **python-advanced.json** — asyncio, tdu.Dependency, threading, numpy, scipy, OpenCV

### Data Management

#### OperatorDataManager

Central documentation engine (wiki/operator-data-manager.js) that:
- Loads 630 operator JSON files from wiki/data/processed/ at startup
- Manages tutorial content from wiki/data/tutorials/
- Coordinates the Python API data manager
- Provides the direct search algorithm (no external index dependency)
- Caches all data in memory for the process lifetime

#### Python API Data Manager

Separate module (wiki/operator-data-python-api.js) managing:
- 69 Python class definitions with member and method documentation
- Category grouping for list_python_classes browsing
- Search index over class names, methods, members, and descriptions

#### Version Filter Utility

wiki/utils/version-filter.js provides:
- Stable version helpers: isCompatible(), filterByVersion(), getVersionIndex(),
  normalizeVersion(), getVersionInfo(), getOperatorCompatInfo(), getPythonCompatInfo()
- Experimental version helpers: isExperimentalVersion(), normalizeExperimentalVersion(),
  getExperimentalBuildInfo(), loadExperimentalBuilds()
- Lazy loading and in-memory caching of all version data files

#### Direct Search Algorithm

```javascript
performDirectSearch(query, options) {
    // Queries operator data directly without external index dependency
    // Supports fuzzy, exact, and tag search modes
    // Contextual ranking and relevance scoring
    // Optional version filtering via version-filter.js
}
```

### Available Tools (21 Total)

#### Operator Tools (8)

| Tool                      | Purpose                                          | Key Parameters                                          |
|---------------------------|--------------------------------------------------|---------------------------------------------------------|
| `get_operator`            | Full operator documentation                      | name, show_examples, show_tips, version                 |
| `search_operators`        | Search with ranking and filtering                | query, category, type, version, parameter_search, limit |
| `list_operators`          | List operators by category                       | category                                                |
| `compare_operators`       | Side-by-side operator comparison                 | operator_a, operator_b, compare_parameters              |
| `get_operator_examples`   | Python/expression code examples                  | operator, example_type                                  |
| `suggest_workflow`        | Workflow chain suggestions with port wiring      | current_operator                                        |
| `get_operator_connections`| Upstream/downstream connection guide             | operator                                                |
| `get_network_template`    | Complete network templates with Python scripts   | template                                                |

#### Tutorial Tools (3)

| Tool              | Purpose                            | Key Parameters                    |
|-------------------|------------------------------------|-----------------------------------|
| `get_tutorial`    | Full tutorial content access       | name, include_content, include_toc |
| `list_tutorials`  | Browse tutorials with filtering    | search, limit, show_details        |
| `search_tutorials`| Full-text tutorial search          | query, search_content, limit       |

#### Python API Tools (3)

| Tool                  | Purpose                              | Key Parameters                          |
|-----------------------|--------------------------------------|-----------------------------------------|
| `get_python_api`      | Python class documentation           | class_name, show_members, show_methods, version |
| `search_python_api`   | Search across Python API             | query, search_in, category, version, limit |
| `list_python_classes` | Browse Python API classes by category| category, search, show_details          |

#### Version System Tools (2)

| Tool               | Purpose                                         | Key Parameters        |
|--------------------|-------------------------------------------------|-----------------------|
| `get_version_info` | Stable version details, Python version, changes | version               |
| `list_versions`    | All supported TD versions with highlights       | (none required)       |

#### Experimental Techniques Tools (3)

| Tool                           | Purpose                                  | Key Parameters                   |
|--------------------------------|------------------------------------------|----------------------------------|
| `get_experimental_techniques`  | Browse technique library by category     | category, technique_id           |
| `search_experimental`          | Full-text search across all techniques   | query, category_filter, show_code, limit |
| `get_glsl_pattern`             | Named GLSL patterns with complete code   | pattern, include_utilities       |

#### Experimental Build Tools (2)

| Tool                       | Purpose                                          | Key Parameters                                                        |
|----------------------------|--------------------------------------------------|-----------------------------------------------------------------------|
| `get_experimental_build`   | Experimental build series details                | series_id, show_features, show_breaking_changes, show_python_api, show_operators |
| `list_experimental_builds` | List experimental series by feature area         | feature_area, stability_status, show_feature_flags, show_operators, show_breaking_changes |

### Installation and Setup

#### Global Installation
```bash
npm install -g @bottobot/td-mcp
```

#### VS Code / Codium Configuration
```json
{
  "td-mcp": {
    "command": "npx",
    "args": ["@bottobot/td-mcp"]
  }
}
```

#### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "td-mcp": {
      "command": "td-mcp"
    }
  }
}
```

### Version History

| Version | Date       | Key Changes                                                                   |
|---------|------------|-------------------------------------------------------------------------------|
| 2.8.0   | 2026-02-21 | 9 new tools (21 total): version system, experimental KB, core enhancements, experimental builds |
| 2.7.0   | 2026-02-21 | 4 new tools (12 total): search_tutorials, get_operator_examples, list_python_classes, compare_operators |
| 2.6.1   | 2025-01-16 | Critical fix: Python API tools returning correct MCP response format; corrected class count to 69 |
| 2.6.0   | 2025-01-14 | Critical fix: search restored; OperatorDataManager rename; web server removed |
| 2.5.0   | 2025-01-13 | Added Python API tools (get_python_api, search_python_api)                    |
| 2.4.0   | 2025-01-12 | Doubled tutorial content (14 total), 24% size reduction                       |
| 2.0.0   | 2025-01-01 | Complete rewrite as MCP server with 629 operators                             |

---

## TD Control MCP Server

### Overview

An MCP server that exposes tools to control a running TouchDesigner instance through a
WebSocket bridge. This is a separate server from the documentation server and requires
TouchDesigner to be running.

### Architecture

```
td-control-mcp/
├── index.js                    # MCP server (stdio transport)
├── package.json                # Node package metadata
└── td-bridge/
    └── webserver_callbacks.py  # TouchDesigner WebSocket bridge
```

### Communication Flow

```
1. VS Code/Claude sends MCP tool request
2. MCP Server translates to WebSocket message
3. TD Bridge receives and executes in TouchDesigner
4. Response flows back through the chain
```

### Bridge Implementation

The TouchDesigner bridge runs inside TD as a Web Server DAT callbacks script:

```python
# Bridge message contract
Request:  {"id": 1, "action": "set_param", "data": {...}, "token": "..."}
Response: {"id": 1, "ok": true, "result": {...}}
         or {"id": 1, "ok": false, "error": {"message": "..."}}
```

### Available Actions

| Action          | Purpose                    | Parameters               |
|-----------------|----------------------------|--------------------------|
| `get_status`    | Get TD status              | -                        |
| `eval`          | Evaluate Python expression | expression               |
| `run_script`    | Execute Python code        | code                     |
| `set_param`     | Set operator parameter     | path, param, value       |
| `pulse`         | Pulse parameter            | path, param              |
| `create_op`     | Create operator            | parent, type, name       |
| `delete_op`     | Delete operator            | path                     |
| `connect_ops`   | Connect operators          | out, into, index         |
| `op_info`       | Get operator info          | path                     |
| `timeline_play` | Start timeline             | -                        |
| `timeline_stop` | Stop timeline              | -                        |
| `open_project`  | Open .toe file             | file                     |
| `save_project`  | Save project               | file                     |

### MCP Tools Exposed

| Tool               | Purpose               | Parameters              |
|--------------------|-----------------------|-------------------------|
| `td_connect`       | Connect to TD         | url, token              |
| `td_status`        | Get project status    | -                       |
| `td_eval`          | Evaluate expression   | expression              |
| `td_run_script`    | Run Python code       | code                    |
| `td_set_param`     | Set parameter         | path, param, value      |
| `td_pulse`         | Pulse parameter       | path, param             |
| `td_create_op`     | Create operator       | parent, type, name      |
| `td_delete_op`     | Delete operator       | path                    |
| `td_connect_ops`   | Connect operators     | out, into, index        |
| `td_op_info`       | Get operator info     | path                    |
| `td_timeline_play` | Play timeline         | -                       |
| `td_timeline_stop` | Stop timeline         | -                       |
| `td_open_project`  | Open project          | file                    |
| `td_save_project`  | Save project          | file                    |

### Setup Instructions

#### 1. TouchDesigner Bridge Setup

**Option A: Web Server DAT (Recommended)**
1. Create Web Server DAT in TouchDesigner
2. Enable "Allow WebSocket"
3. Create Text DAT with `webserver_callbacks.py` content
4. Set as Callbacks DAT
5. Set port (e.g., 9988) and start

**Option B: WebSocket DAT**
1. Create WebSocket DAT in server mode
2. Create Text DAT with callbacks
3. Set as Callbacks DAT
4. Start server

#### 2. MCP Server Setup

```bash
cd td-control-mcp
npm install
npm start
```

#### 3. Security Configuration (Optional)

Set `SHARED_SECRET` in bridge script or create a `td_control_secret` Text DAT:
```python
SHARED_SECRET = "your-secret-token"
```

### Example Usage Flow

```javascript
// 1. Connect to TouchDesigner
td_connect({ url: "ws://127.0.0.1:9988", token: "secret" })

// 2. Check status
td_status()

// 3. Create operator
td_create_op({ parent: "/project1", type: "noiseTOP", name: "noise1" })

// 4. Set parameter
td_set_param({ path: "/project1/noise1", param: "period", value: 5 })

// 5. Connect operators
td_connect_ops({ out: "/project1/noise1", into: "/project1/comp1" })
```

---

## Implementation Details

### Transport Mechanisms

#### Stdio Transport
- Used for MCP server to VS Code communication
- Synchronous request/response
- JSON-RPC style messaging
- Built into MCP protocol

#### WebSocket Transport
- Used for MCP server to application bridge
- Asynchronous messaging
- Supports remote connections
- Real-time bidirectional communication

### Message Correlation

```javascript
// Request tracking in td-control-mcp
class MessageCorrelator {
    constructor() {
        this.pending = new Map();
        this.nextId = 1;
    }

    send(action, data) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, action, data }));

            setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 5000);
        });
    }
}
```

### Error Handling

```javascript
// Structured error propagation
try {
    const result = await bridge.send('create_op', data);
    return { success: true, result };
} catch (error) {
    return {
        success: false,
        error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message,
            details: error.details
        }
    };
}
```

### State Management

#### Documentation Server
- Stateless operations
- Data loaded once at startup and cached in memory
- No persistence required between requests

#### Control Server
- WebSocket connection state
- Request correlation state
- Optional authentication state

---

## Integration Patterns

### Pattern 1: Documentation-Driven Development

```
User Query -> Claude -> TD-MCP -> Documentation -> Response -> Code Generation
```

**Use Case**: Learning about operators while coding

### Pattern 2: Interactive Control

```
User Command -> Claude -> TD-Control-MCP -> WebSocket -> TouchDesigner -> Visual Output
```

**Use Case**: Building networks through natural language

### Pattern 3: Hybrid Workflow

```
Documentation Query -> TD-MCP -> Information
                                     |
Control Command -> TD-Control-MCP -> TouchDesigner Action
```

**Use Case**: Look up operator details, then create and configure it

### Pattern 4: Validation Pipeline

```
User Code -> Claude -> TD-MCP (validate) -> TD-Control-MCP (execute) -> Result
```

**Use Case**: Validate parameters before execution

---

## Development Guidelines

### Creating New MCP Tools

#### 1. Define Tool Interface
```javascript
export const schema = {
    name: 'tool_name',
    description: 'What this tool does',
    inputSchema: {
        type: 'object',
        properties: {
            param1: { type: 'string', description: 'Parameter description' }
        },
        required: ['param1']
    }
};
```

#### 2. Implement Tool Handler
```javascript
export async function handler(params, dataManager) {
    // Validate parameters
    if (!params.param1) {
        throw new Error('param1 is required');
    }

    // Execute tool logic
    const result = await performOperation(params, dataManager);

    // Return structured MCP response
    return {
        content: [{ type: 'text', text: result }]
    };
}
```

#### 3. Register with MCP Server in index.js
```javascript
import { schema as toolSchema, handler as toolHandler } from './tools/tool_name.js';
// Add to the tools array in the ListToolsRequestSchema handler
// Add to the switch statement in the CallToolRequestSchema handler
```

### Best Practices

#### Error Handling
- Always validate input parameters
- Provide meaningful, user-readable error messages
- Return errors in proper MCP content format
- Log errors for debugging

#### Performance
- Cache frequently accessed data at module level (not per-request)
- Use async operations for all file I/O
- Keep tool response sizes reasonable (use limits on list tools)

#### Security
- Validate all inputs before processing
- Sanitize paths when constructing file paths
- Do not expose internal file system structure in error messages

#### Documentation
- Document all tool parameters in this file and in README.md
- Provide usage examples in tool descriptions
- Keep CHANGELOG.md up to date with each change

### Adding Operator Data

Operator data lives in `wiki/data/processed/` as JSON files. Each file follows the schema:

```json
{
  "id": "noise_chop",
  "name": "Noise CHOP",
  "displayName": "Noise",
  "category": "CHOP",
  "subcategory": "Generate",
  "description": "...",
  "parameters": [
    {
      "name": "Period",
      "type": "float",
      "default": "1",
      "description": "..."
    }
  ],
  "tips": ["..."],
  "warnings": ["..."],
  "pythonExamples": ["..."],
  "codeExamples": ["..."],
  "version": "2019+"
}
```

---

## Troubleshooting

### Common Issues — TD-MCP Documentation Server

**Issue**: Search returns no results
- Try simpler, shorter search terms
- Remove category filters
- Enable `parameter_search: true`
- Verify Node.js 18.0+ is installed

**Issue**: Server won't start
- Check Node.js version: `node --version` (requires 18.0+)
- Run `npm install` to ensure dependencies are installed
- Verify that `wiki/data/` contains JSON files

**Issue**: VS Code can't connect
- Verify MCP configuration JSON is valid (no trailing commas)
- Reload the VS Code window after changing MCP settings
- Confirm `td-mcp` is on your PATH: `which td-mcp`

**Issue**: Tool returns "class not found" for Python API
- Use list_python_classes to see exact class names
- Class names are case-sensitive (e.g., "CHOP" not "Chop")

### Common Issues — TD Control MCP Server

**Issue**: "Not connected to TD bridge"
- Run `td_connect` before other tools
- Confirm TouchDesigner's Web Server DAT is running
- Verify the port matches the configuration

**Issue**: Parameter not found
- Verify the exact parameter name (case-sensitive)
- Confirm the operator path is absolute (e.g., `/project1/noise1`)

**Issue**: Request timeouts
- Check that TouchDesigner is responsive
- Verify network connectivity to the bridge port

### Diagnostic Commands

#### Test TD-MCP Documentation Server startup
```bash
npx @bottobot/td-mcp
# Expected output includes:
# Loaded 630 operators
# Loaded 14 tutorials
# Loaded 69 Python API classes
# All 21 tools registered
```

#### Test TD Control MCP
```javascript
// Test connection
td_connect({ url: "ws://127.0.0.1:9988" })

// Test evaluation
td_eval({ expression: "op('/').name" })
// Should return the project name
```

### Performance Targets

| Metric                    | Target     |
|---------------------------|------------|
| Server startup time       | < 2 seconds |
| Search response time      | < 100ms    |
| Memory usage              | < 200MB    |
| Tool response (operator)  | < 50ms     |

---

## Conclusion

The MCP architecture provides a robust foundation for integrating TouchDesigner with AI
assistants. The separation between documentation (TD-MCP, 21 tools) and control
(TD-Control-MCP) servers allows for:

1. **Modularity**: Use either or both servers as needed
2. **Stability**: Documentation queries don't affect control operations
3. **Security**: Control operations can be secured independently
4. **Scalability**: Add new tools without affecting existing ones
5. **Flexibility**: Support multiple transport and deployment options

The TD-MCP documentation server (v2.8.0) now covers the complete TouchDesigner ecosystem:
stable operator documentation, Python scripting reference, interactive tutorials, version
history, advanced technique patterns, and experimental build tracking — all accessible
through 21 MCP tools with no external dependencies.
