# TD-MCP v2.1 - Pure MCP Server

TouchDesigner Model Context Protocol server for VS Code/Codium integration. Get TouchDesigner operator information directly in your code editor.

**Latest Update (v2.1.0)**: Enhanced POP operator support with comprehensive documentation for all 91 experimental POP operators.

## What This Is

A clean, simple MCP server that provides TouchDesigner operator documentation to VS Code/Codium through the Model Context Protocol. No WebSocket complexity, no TouchDesigner integration scripts - just a pure MCP server.

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

## Testing

Test the server startup:
```bash
node index.js
```

You should see:
```
TD-MCP v2.1 Server Starting...
================================
TouchDesigner MCP Server for VS Code/Codium
Following Claude.md principles: Keep it simple
Pure MCP server - no WebSocket complexity

[Metadata] Loaded 717+ operators
[Patterns] Loaded 20 workflow patterns
✓ TD-MCP v2.1 Server is now running
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