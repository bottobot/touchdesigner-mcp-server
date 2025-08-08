# TouchDesigner MCP Server

[![npm version](https://img.shields.io/npm/v/@bottobot/td-mcp.svg)](https://www.npmjs.com/package/@bottobot/td-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides comprehensive TouchDesigner operator documentation and tutorials directly in VS Code/Codium through Claude or other MCP-compatible assistants.

## Features

- 🎯 **629 TouchDesigner Operators** - Complete documentation including 90+ experimental POP operators
- 📚 **7 Interactive Tutorials** - Step-by-step TouchDesigner learning guides
- 🔍 **Smart Search** - Advanced contextual search with intelligent ranking
- 🔄 **Workflow Suggestions** - Get operator recommendations based on your current workflow
- 🚀 **Zero Configuration** - Works immediately after installation
- 📖 **Full Parameter Documentation** - Detailed information for 3,327+ operator parameters

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

### 🔍 search_operators
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

- **Write a GLSL TOP** - Create custom GPU-accelerated image effects
- **Write a C++ CHOP** - Develop native audio/data processing operators
- **Write a C++ TOP** - Build custom texture operators in C++
- **Anatomy of a CHOP** - Understanding channel operator internals
- **Build a List COMP** - Create dynamic UI lists
- **Write a Shared Memory CHOP** - Inter-process data communication
- **Write a Shared Memory TOP** - Share textures between processes

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
- **Pure MCP Implementation** - Clean, focused server following MCP standards
- **Local Data Processing** - All operator data is processed and served locally
- **Efficient Search Index** - Fast, contextual search across all documentation
- **Modular Tool System** - Each MCP tool is independently maintained

## Project Structure

```
td-mcp/
├── index.js              # Main MCP server
├── tools/                # MCP tool implementations
│   ├── get_operator.js
│   ├── search_operators.js
│   ├── suggest_workflow.js
│   ├── list_operators.js
│   ├── get_tutorial.js
│   └── list_tutorials.js
├── wiki/                 # Documentation system
│   ├── data/            # Processed operator & tutorial data
│   └── wiki-system.js   # Core documentation engine
└── data/                # Configuration & patterns
    └── patterns.json    # Workflow patterns
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

**Current Version**: 2.3.1  
**Operators**: 629  
**Tutorials**: 7  
**Last Updated**: January 2025