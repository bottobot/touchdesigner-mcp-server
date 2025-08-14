# TouchDesigner MCP Server

[![npm version](https://img.shields.io/npm/v/@bottobot/td-mcp.svg)](https://www.npmjs.com/package/@bottobot/td-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides comprehensive TouchDesigner operator documentation and tutorials directly in VS Code/Codium through Claude or other MCP-compatible assistants.

## 🚨 Major v2.6.0 Update - Critical Search Fix

**The search functionality that was completely broken in previous versions is now fully operational!**

## Features

- 🎯 **629 TouchDesigner Operators** - Complete documentation including 90+ experimental POP operators
- 📚 **14 Interactive Tutorials** - Comprehensive TouchDesigner learning guides
- 🐍 **553 Python API Classes** - Full Python scripting documentation
- 🔍 **FIXED Smart Search** - Direct search implementation (previously broken indexer removed)
- 🔄 **Workflow Suggestions** - Get operator recommendations based on your current workflow
- 🚀 **Zero Configuration** - Works immediately after installation
- 📖 **Full Parameter Documentation** - Detailed information for 3,327+ operator parameters
- ⚡ **Optimized Architecture** - Removed web server overhead, pure MCP implementation

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

## Available MCP Tools

### 🔧 get_operator
Get comprehensive details about a specific TouchDesigner operator.

**Parameters:**
- `name` (string): Operator name (e.g., 'Noise CHOP', 'Movie File In TOP')
- `show_examples` (boolean, optional): Show usage examples
- `show_tips` (boolean, optional): Show performance tips

**Example:** "Get detailed information about the Noise TOP operator"

### 🔍 search_operators (NOW WORKING!)
Search for operators using advanced contextual analysis and ranking.

**Parameters:**
- `query` (string): Search query
- `category` (string, optional): Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP, POP)
- `parameter_search` (boolean, optional): Search within parameters
- `show_details` (boolean, optional): Show detailed results

**Example:** "Search for audio processing operators"

### 📋 list_operators
List available TouchDesigner operators with optional category filtering.

**Parameters:**
- `category` (string, optional): Filter by category

**Example:** "List all TOP operators"

### 🔄 suggest_workflow
Get workflow suggestions for what operators commonly follow the current operator.

**Parameters:**
- `current_operator` (string): Current operator name

**Example:** "What operators typically follow a Movie File In TOP?"

### 📚 get_tutorial
Access detailed TouchDesigner tutorial content.

**Parameters:**
- `name` (string): Tutorial name
- `include_content` (boolean, optional): Include full content sections
- `include_toc` (boolean, optional): Include table of contents
- `include_links` (boolean, optional): Include related links

**Example:** "Get the 'Write a GLSL TOP' tutorial"

### 📖 list_tutorials
List all available TouchDesigner tutorials.

**Parameters:**
- `search` (string, optional): Search term to filter tutorials
- `limit` (number, optional): Maximum results
- `show_details` (boolean, optional): Show tutorial summaries

**Example:** "List all available tutorials"

### 🐍 get_python_api
Get documentation for a TouchDesigner Python class.

**Parameters:**
- `class_name` (string): Python class name (e.g., 'CHOP', 'Channel', 'App')
- `show_members` (boolean, optional): Show class members/properties
- `show_methods` (boolean, optional): Show class methods
- `show_inherited` (boolean, optional): Show inherited members and methods

**Example:** "Get Python documentation for the CHOP class"

### 🔎 search_python_api
Search across TouchDesigner Python classes, methods, and members.

**Parameters:**
- `query` (string): Search query for Python API
- `search_in` (string, optional): Where to search: 'all', 'classes', 'methods', 'members'
- `category` (string, optional): Filter by category
- `limit` (number, optional): Maximum results

**Example:** "Search Python API for audio methods"

## Operator Categories

The server provides comprehensive coverage across all TouchDesigner operator families:

| Category | Count | Description |
|----------|-------|-------------|
| **CHOP** | 166 | Channel Operators - Audio, control signals, and data streams |
| **TOP** | 139 | Texture Operators - 2D image and video processing |
| **SOP** | 112 | Surface Operators - 3D geometry creation and manipulation |
| **DAT** | 69 | Data Operators - Text, tables, and data handling |
| **COMP** | 40 | Component Operators - UI elements and containers |
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

The server includes comprehensive Python API documentation with **553 classes** covering:

- Core operator classes (CHOP, TOP, SOP, DAT, MAT, COMP)
- Utility classes (Channel, Cell, Page, etc.)
- System classes (App, Project, Monitor, etc.)
- UI classes (Panel, Widget, etc.)
- Advanced features (WebRTC, NDI, MIDI, OSC, etc.)

## PM2 Process Management

For production deployments, you can use PM2 to manage the MCP server:

```bash
# Install PM2 globally
npm install -g pm2

# Start the server with PM2
pm2 start td-mcp

# View server status
pm2 status td-mcp

# View logs
pm2 logs td-mcp

# Restart server
pm2 restart td-mcp

# Stop server
pm2 stop td-mcp
```

## Architecture

The TD-MCP server is built with:
- **Pure MCP Implementation** - Clean, focused server following MCP standards (web server removed in v2.6.0)
- **Direct Search Algorithm** - Fast, reliable search without dependency on broken indexers
- **OperatorDataManager** - Centralized data management system (renamed from WikiSystem)
- **Local Data Processing** - All operator data is processed and served locally
- **Modular Tool System** - Each MCP tool is independently maintained

## Project Structure

```
td-mcp/
├── index.js                    # Main MCP server (web server removed)
├── tools/                      # MCP tool implementations
│   ├── get_operator.js
│   ├── search_operators.js     # Fixed with direct search
│   ├── suggest_workflow.js
│   ├── list_operators.js
│   ├── get_tutorial.js
│   ├── list_tutorials.js
│   ├── get_python_api.js      # Python API documentation
│   └── search_python_api.js   # Python API search
├── wiki/                       # Documentation system
│   ├── data/                  # Processed operator & tutorial data
│   └── operator-data-manager.js # Core documentation engine (renamed)
└── data/                      # Configuration & patterns
    └── patterns.json          # Workflow patterns
```

## Requirements

- Node.js 18.0 or higher
- npm or yarn package manager
- VS Code/Codium with MCP-compatible extension (e.g., Claude Dev)

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
```

## Support

- **Issues**: [GitHub Issues](https://github.com/bottobot/touchdesigner-mcp-server/issues)
- **Documentation**: [TouchDesigner Official Docs](https://docs.derivative.ca)
- **NPM Package**: [@bottobot/td-mcp](https://www.npmjs.com/package/@bottobot/td-mcp)

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Acknowledgments

- TouchDesigner by [Derivative](https://derivative.ca)
- Model Context Protocol by [Anthropic](https://modelcontextprotocol.io)
- Built for the TouchDesigner community 🎨

---

**Current Version**: 2.6.0
**Operators**: 629
**Tutorials**: 14
**Python API Classes**: 553
**Last Updated**: January 2025

### What's New in v2.6.0 (Major Fix Release)

#### 🔧 Critical Fixes
- **FIXED Search Functionality** - The search_operators tool that was completely broken is now working!
- **Removed Broken Indexer** - Eliminated the non-functional search indexer that was causing search failures
- **Direct Search Implementation** - New reliable search algorithm that searches operator data directly

#### 🏗️ Architecture Improvements
- **Renamed WikiSystem to OperatorDataManager** - Clearer, more descriptive naming throughout codebase
- **Removed Web Server** - Eliminated unnecessary web server component for cleaner architecture
- **Pure MCP Server** - Now operates as a focused MCP server without web dependencies
- **Improved Performance** - Direct search is faster than the broken indexer approach

#### 📊 Data Completeness
- **629 Operators Verified** - All operators confirmed accessible
- **553 Python API Classes** - Full Python documentation included
- **14 Tutorials** - All tutorials properly indexed and searchable
- **3,327+ Parameters** - Complete parameter documentation

This is a critical update that fixes the core search functionality. Users who experienced search returning zero results should update immediately.

### Previous Version Notes

#### v2.5.0
- Added Python API documentation tools
- Improved operator categorization
- Enhanced workflow suggestions

#### v2.4.0
- 🎓 **Doubled Tutorial Content** - Added 7 new comprehensive tutorials
- 📦 **24% Size Reduction** - Optimized server from 177MB to 135MB
- 🛠️ **New Tutorial Integration Tool** - Automated script for adding future tutorials
- 🧹 **Clean Architecture** - Removed redundant files and experimental parsers