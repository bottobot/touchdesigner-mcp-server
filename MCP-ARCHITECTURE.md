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

The Model Context Protocol is a standard for connecting AI assistants (like Claude) with external tools and data sources. MCP servers expose functionality through a standardized interface that can be consumed by MCP-compatible clients in VS Code/Codium.

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
                   ┌─> Documentation Data
VS Code/Claude <--stdio--> MCP Server <
                   └─> WebSocket --> Application
```

**Characteristics**:
- Multiple data sources
- Mixed operation types
- Complex state management
- Enhanced functionality

---

## TD-MCP Documentation Server

### Overview

A pure MCP server providing comprehensive TouchDesigner documentation, operator information, and tutorials directly in VS Code/Codium.

### Architecture

```
td-mcp/
├── index.js                    # Main MCP server (pure implementation)
├── tools/                      # MCP tool implementations
│   ├── get_operator.js         # Get operator details
│   ├── search_operators.js     # Search with direct algorithm
│   ├── suggest_workflow.js     # Workflow suggestions
│   ├── list_operators.js       # List operators by category
│   ├── get_tutorial.js         # Access tutorials
│   ├── list_tutorials.js       # List available tutorials
│   ├── get_python_api.js       # Python API documentation
│   └── search_python_api.js    # Search Python API
├── wiki/                       # Documentation system
│   ├── operator-data-manager.js # Core documentation engine
│   └── data/                   # Processed operator data
└── data/                       # Configuration & patterns
    └── patterns.json           # Workflow patterns
```

### Key Features

- **629 TouchDesigner Operators**: Complete documentation
- **553 Python API Classes**: Full scripting reference
- **14 Interactive Tutorials**: Learning guides
- **Direct Search Implementation**: Reliable search without indexing
- **Zero Configuration**: Works immediately after installation

### Data Management

#### OperatorDataManager (formerly WikiSystem)

Central documentation engine that:
- Loads operator metadata from JSON files
- Manages tutorial content
- Handles Python API documentation
- Provides search functionality

#### Direct Search Algorithm

```javascript
performDirectSearch(query, options) {
    // Search directly in operator data
    // No dependency on broken indexers
    // Contextual ranking and scoring
}
```

### Available Tools

| Tool | Purpose | Parameters |
|------|---------|------------|
| `get_operator` | Get operator details | name, show_examples, show_tips |
| `search_operators` | Search operators | query, category, parameter_search |
| `list_operators` | List by category | category |
| `suggest_workflow` | Get workflow suggestions | current_operator |
| `get_tutorial` | Access tutorial content | name, include_content |
| `list_tutorials` | List tutorials | search, limit, show_details |
| `get_python_api` | Python class docs | class_name, show_members |
| `search_python_api` | Search Python API | query, search_in, category |

### Installation & Setup

#### Global Installation
```bash
npm install -g @bottobot/td-mcp
```

#### VS Code Configuration
```json
{
  "td-mcp": {
    "command": "npx",
    "args": ["@bottobot/td-mcp"]
  }
}
```

### Version History

- **v2.6.0**: Fixed broken search, removed web server, pure MCP
- **v2.5.0**: Added Python API documentation
- **v2.4.0**: Doubled tutorial content, 24% size reduction
- **v2.0.0**: Complete rewrite as MCP server

---

## TD Control MCP Server

### Overview

An MCP server that exposes tools to control a running TouchDesigner instance through a WebSocket bridge.

### Architecture

```
td-control-mcp/
├── index.js                    # MCP server (stdio transport)
├── package.json               # Node package metadata
└── td-bridge/
    └── webserver_callbacks.py # TouchDesigner WebSocket bridge
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

| Action | Purpose | Parameters |
|--------|---------|------------|
| `get_status` | Get TD status | - |
| `eval` | Evaluate Python expression | expression |
| `run_script` | Execute Python code | code |
| `set_param` | Set operator parameter | path, param, value |
| `pulse` | Pulse parameter | path, param |
| `create_op` | Create operator | parent, type, name |
| `delete_op` | Delete operator | path |
| `connect_ops` | Connect operators | out, into, index |
| `op_info` | Get operator info | path |
| `timeline_play` | Start timeline | - |
| `timeline_stop` | Stop timeline | - |
| `open_project` | Open .toe file | file |
| `save_project` | Save project | file |

### MCP Tools Exposed

| Tool | Purpose | Parameters |
|------|---------|------------|
| `td_connect` | Connect to TD | url, token |
| `td_status` | Get project status | - |
| `td_eval` | Evaluate expression | expression |
| `td_run_script` | Run Python code | code |
| `td_set_param` | Set parameter | path, param, value |
| `td_pulse` | Pulse parameter | path, param |
| `td_create_op` | Create operator | parent, type, name |
| `td_delete_op` | Delete operator | path |
| `td_connect_ops` | Connect operators | out, into, index |
| `td_op_info` | Get operator info | path |
| `td_timeline_play` | Play timeline | - |
| `td_timeline_stop` | Stop timeline | - |
| `td_open_project` | Open project | file |
| `td_save_project` | Save project | file |

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

Set `SHARED_SECRET` in bridge script or create `td_control_secret` Text DAT:
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
- Used for MCP server ↔ VS Code communication
- Synchronous request/response
- JSON-RPC style messaging
- Built into MCP protocol

#### WebSocket Transport
- Used for MCP server ↔ Application bridge
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
- Data loaded once at startup
- No persistence required

#### Control Server
- WebSocket connection state
- Request correlation state
- Optional authentication state

---

## Integration Patterns

### Pattern 1: Documentation-Driven Development

```
User Query → Claude → TD-MCP → Documentation → Response → Code Generation
```

**Use Case**: Learning about operators while coding

### Pattern 2: Interactive Control

```
User Command → Claude → TD-Control-MCP → WebSocket → TouchDesigner → Visual Output
```

**Use Case**: Building networks through natural language

### Pattern 3: Hybrid Workflow

```
Documentation Query → TD-MCP → Information
                                    ↓
Control Command → TD-Control-MCP → TouchDesigner Action
```

**Use Case**: Look up operator, then create and configure it

### Pattern 4: Validation Pipeline

```
User Code → Claude → TD-MCP (validate) → TD-Control-MCP (execute) → Result
```

**Use Case**: Validate parameters before execution

---

## Development Guidelines

### Creating New MCP Tools

#### 1. Define Tool Interface
```javascript
{
    name: 'tool_name',
    description: 'What this tool does',
    parameters: {
        type: 'object',
        properties: {
            param1: { type: 'string', description: 'Parameter description' }
        },
        required: ['param1']
    }
}
```

#### 2. Implement Tool Handler
```javascript
async function handleToolName(params) {
    // Validate parameters
    if (!params.param1) {
        throw new Error('param1 is required');
    }
    
    // Execute tool logic
    const result = await performOperation(params);
    
    // Return structured response
    return {
        success: true,
        data: result
    };
}
```

#### 3. Register with MCP Server
```javascript
server.addTool('tool_name', toolDefinition, handleToolName);
```

### Best Practices

#### Error Handling
- Always validate input parameters
- Provide meaningful error messages
- Include error codes for programmatic handling
- Log errors for debugging

#### Performance
- Cache frequently accessed data
- Use async operations for I/O
- Implement request timeouts
- Batch operations when possible

#### Security
- Validate all inputs
- Use authentication for privileged operations
- Sanitize paths and expressions
- Limit operation scope

#### Documentation
- Document all tool parameters
- Provide usage examples
- Include error scenarios
- Maintain changelog

---

## Troubleshooting

### Common Issues

#### TD-MCP Documentation Server

**Issue**: Search returns no results
- **Cause**: Search functionality was broken in versions before 2.6.0
- **Solution**: Update to v2.6.0 or later

**Issue**: Server won't start
- **Check**: Node.js version (requires 18.0+)
- **Check**: Run `npm install` to ensure dependencies
- **Check**: Verify data files exist in wiki/data/

**Issue**: VS Code can't connect
- **Check**: MCP configuration in VS Code settings
- **Check**: Server path is correct
- **Check**: No port conflicts

#### TD Control MCP Server

**Issue**: "Not connected to TD bridge"
- **Check**: Run `td_connect` first
- **Check**: TouchDesigner Web Server DAT is running
- **Check**: Port matches configuration
- **Check**: Firewall settings

**Issue**: Parameter not found
- **Check**: Exact parameter name (lowercase)
- **Check**: Operator path is absolute
- **Check**: Parameter exists on operator type

**Issue**: Timeouts
- **Check**: Network connectivity
- **Check**: TouchDesigner is responsive
- **Check**: Increase timeout in send() method

### Diagnostic Commands

#### Test TD-MCP Documentation
```bash
# Test server startup
npx @bottobot/td-mcp

# Should show:
# Loaded 629 operators
# Loaded 14 tutorials
# Loaded 553 Python API classes
```

#### Test TD Control MCP
```javascript
// Test connection
td_connect({ url: "ws://127.0.0.1:9988" })

// Test status
td_status()
// Should return project info

// Test evaluation
td_eval({ expression: "op('/').name" })
// Should return project name
```

### Debug Logging

#### Enable MCP Debug Output
```bash
export MCP_DEBUG=true
npm start
```

#### TouchDesigner Bridge Logging
```python
# In webserver_callbacks.py
DEBUG = True  # Enable debug output

def log_debug(msg):
    if DEBUG:
        print(f"[TD-Bridge] {msg}")
```

### Performance Monitoring

#### Documentation Server Metrics
- Startup time: < 2 seconds
- Search response: < 100ms
- Memory usage: < 150MB

#### Control Server Metrics
- Connection time: < 500ms
- Command latency: < 50ms
- Timeout threshold: 5000ms

---

## Conclusion

The MCP architecture provides a robust foundation for integrating TouchDesigner with AI assistants. The separation between documentation (TD-MCP) and control (TD-Control-MCP) servers allows for:

1. **Modularity**: Use either or both servers as needed
2. **Stability**: Documentation queries don't affect control operations
3. **Security**: Control operations can be secured independently
4. **Scalability**: Add new tools without affecting existing ones
5. **Flexibility**: Support multiple transport and deployment options

The architecture follows established patterns from other DCC integrations while providing TouchDesigner-specific optimizations and features.