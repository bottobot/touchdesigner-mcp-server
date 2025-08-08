# TD-MCP v2.2 - Pure MCP Server

TouchDesigner Model Context Protocol server for VS Code/Codium integration. Get TouchDesigner operator information directly in your code editor.

**Latest Update (v2.2.0)**: Enhanced terminal awareness and improved documentation structure for better integration with VS Code/Codium environments.

## About

TD-MCP is a lightweight Model Context Protocol server that brings TouchDesigner's comprehensive operator documentation directly into your VS Code/Codium environment. With over 717 operators documented across all categories (TOP, CHOP, SOP, DAT, MAT, COMP, and POP), this server provides instant access to parameter details, usage examples, and workflow patterns without leaving your code editor.

### Key Features:
- **Complete Operator Coverage**: All 717+ TouchDesigner operators including experimental POPs
- **Smart Search**: Context-aware operator discovery with intelligent ranking
- **Workflow Patterns**: 20 pre-built patterns for common TouchDesigner tasks
- **Zero Configuration**: TouchDesigner runs independently - no complex setup required
- **Pure MCP Implementation**: Clean, focused server following Claude.md principles

**Key Principle**: TouchDesigner runs independently. VS Code connects to this MCP server to get operator information while you code.

## Installation

```bash
npm install
```

## Usage

### For VS Code/Codium Users

1. **Start the MCP server:**
   ```bash
   node index.js
   ```

2. **Configure VS Code/Codium** to connect to this MCP server by adding it to your MCP configuration.

3. **Use the tools** in VS Code/Codium to get TouchDesigner operator information while coding.

The server provides 717+ TouchDesigner operators with comprehensive metadata and 20 workflow patterns, including complete coverage of all 91 experimental POP operators.

## Available Tools

### get_operator
Get detailed information about a specific TouchDesigner operator.

**Parameters:**
- `name` (string): Operator name (e.g., 'Noise CHOP', 'Movie File In TOP')

**Example:**
```
Get information about the "Noise TOP" operator
```

### list_operators
List available TouchDesigner operators, optionally filtered by category.

**Parameters:**
- `category` (string, optional): Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP, POP)

**Example:**
```
List all TOP operators
```

### search_operators
Search for operators using contextual analysis and ranking.

**Parameters:**
- `query` (string): Search query
- `category` (string, optional): Filter by category

**Example:**
```
Search for audio-related operators in the CHOP category
```

### get_pop_learning_guide
Get comprehensive learning information about TouchDesigner POPs (Point Operators).

**Example:**
```
Get the POP learning guide
```

## Operator Categories

- **TOP** (Texture Operators): Image and video processing
- **CHOP** (Channel Operators): Audio and data processing  
- **SOP** (Surface Operators): 3D geometry operations
- **DAT** (Data Operators): Text and data manipulation
- **MAT** (Material Operators): 3D rendering materials
- **COMP** (Component Operators): UI and system components
- **POP** (Point Operators): Particle systems

## Features

- **717+ Operators**: Complete TouchDesigner operator database including all POP operators
- **Contextual Search**: Smart operator discovery based on your needs
- **Category Filtering**: Find operators by type (TOP, CHOP, SOP, etc.)
- **Comprehensive Metadata**: Detailed operator information including parameters and usage
- **Workflow Patterns**: 20 common TouchDesigner workflow patterns
- **Learning Resources**: Specialized guides for complex operator families like POPs

## Local Wiki System

TD-MCP now includes a powerful local wiki system that mirrors the official TouchDesigner documentation from docs.derivative.ca directly on your machine. This provides instant, offline access to comprehensive TouchDesigner documentation alongside the MCP tools.

### Wiki Features

- **Complete Documentation Mirror**: Processes and serves all TouchDesigner documentation locally
- **1800+ HTML Documents**: Full coverage of operator documentation, tutorials, and guides
- **1119+ Searchable Operators**: Comprehensive operator search with parameter details
- **URL Compatibility**: Maintains docs.derivative.ca URL structure for easy reference
- **Offline Access**: No internet connection required once documentation is processed
- **MCP Integration**: Seamlessly integrates with VS Code through MCP tools

### How It Works

The wiki system processes TouchDesigner's offline documentation (located in your TouchDesigner installation) and creates a local, searchable database that can be accessed through:

1. **Web Interface**: Browse documentation at http://localhost:3000 with the same URL structure as docs.derivative.ca
2. **MCP Tools**: Access operator information directly in VS Code through enhanced MCP tools
3. **Search API**: Fast, indexed search across all documentation and operator parameters

### Quick Start

1. **Process Documentation** (one-time setup):
   ```bash
   node process-td-docs.js
   ```
   This processes the ~1822 HTM files from your TouchDesigner installation.

2. **Start the Wiki Server**:
   ```bash
   node wiki/server/wiki-server.js
   ```
   Access the wiki at http://localhost:3000

3. **Use with MCP**: The MCP server automatically integrates with the wiki data for enhanced operator information.

### Documentation Location

The system automatically finds TouchDesigner documentation at:
```
C:\Program Files\Derivative\TouchDesigner\Samples\Learn\OfflineHelp\https.docs.derivative.ca\
```

For detailed setup and configuration, see [WIKI-SETUP.md](WIKI-SETUP.md).

## Testing

Test the server startup:
```bash
node index.js
```

You should see:
```
TD-MCP v2.2 Server Starting...
================================
TouchDesigner MCP Server for VS Code/Codium
Following Claude.md principles: Keep it simple
Pure MCP server - no WebSocket complexity

[Metadata] Loaded 717+ operators
[Patterns] Loaded 20 workflow patterns
✓ TD-MCP v2.2 Server is now running
```

## Architecture

Built following Claude.md principles:
- **Keep it simple**: Pure MCP server, no unnecessary complexity
- **Single responsibility**: Serves TouchDesigner documentation to VS Code
- **No premature abstraction**: Straightforward implementation
- **Modular structure**: Clean separation of tools and data

## Files

- `index.js` - Main MCP server
- `package.json` - Dependencies and configuration
- `tools/` - Individual MCP tools (get_operator, search_operators, etc.)
- `data/patterns.json` - Workflow patterns database
- `../metadata/` - Comprehensive operator metadata (shared with v1)

## What This Is NOT

- ❌ Not a WebSocket server
- ❌ Not for direct TouchDesigner integration
- ❌ Not a complex multi-protocol system
- ❌ TouchDesigner doesn't need to connect to anything

## What This IS

- ✅ Pure MCP server for VS Code/Codium
- ✅ TouchDesigner documentation provider
- ✅ Simple, reliable, focused tool
- ✅ Following Claude.md principles: Keep it simple

## Next Steps

Use this MCP server with VS Code/Codium to get TouchDesigner operator information while you code. TouchDesigner runs independently - this server just provides documentation to your code editor.