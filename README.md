# TouchDesigner MCP Server

A Model Context Protocol (MCP) server that provides instant access to TouchDesigner documentation directly in your AI assistant.

## Overview

TouchDesigner MCP Server (TD-MCP) is a lightweight, efficient MCP server that enables AI assistants to query and retrieve comprehensive documentation for TouchDesigner operators. Built with a direct filesystem approach, it parses TouchDesigner's offline HTML documentation on-demand, providing fast and accurate information without the overhead of a database.

## The Story Behind TD-MCP

This project was born out of necessity and frustration. As a self-described "lazy hack/vibe coder," I needed an AI agent that could build TouchDesigner networks for an interactive piece I was presenting at a festival. What started as a quest for AI-assisted creativity turned into an epic journey through the depths of overengineering.

### The Journey

I began with ambitious goals - integrating directly into TouchDesigner using websocket DATs and OSC IN/OUT CHOPs. Surprisingly, the integration worked well! The AI could actually build networks... except the data it was using was complete garbage. It was simulating data, making things up, and creating all kinds of silliness.

I burned through an insane amount of tokens exploring increasingly complex solutions:
- **ChromaDB** - Vector database for semantic search
- **SQLite3** - Traditional database approaches
- **Algolia** - Cloud-based search integration
- Complex data import pipelines
- Sophisticated caching mechanisms

Each iteration grew more complex, more sophisticated, and somehow... less functional.

### The Breakthrough

Out of sheer frustration, I asked myself: "What if I just read the HTML files directly?"

And that's when this little gem popped out. It turns out that the MCP SDK and cheerio were all I needed. No databases, no complex pipelines, no cloud services - just good old-fashioned HTML parsing.

### What's Next

The simple approach works beautifully for documentation access. The next phase is to explore actual TouchDesigner integration - but this time, keeping it simple from the start.

Sometimes the best solution is the simplest one. Who knew? 🤷‍♂️

## Features

- **Instant Access**: Query any TouchDesigner operator documentation directly from your AI assistant
- **Comprehensive Coverage**: Access documentation for all TouchDesigner operator families (CHOP, TOP, SOP, DAT, MAT, COMP, POP)
- **Smart Search**: Fuzzy matching and intelligent search capabilities to find operators even with inexact names
- **Detailed Information**: Get operator summaries, parameter descriptions, and usage information
- **Zero Database**: Direct HTML parsing means no database setup or maintenance required
- **Memory Efficient**: In-memory caching for optimal performance without excessive resource usage
- **Enhanced Metadata**: Pre-scraped comprehensive metadata for 690+ operators across all categories
- **Dynamic Scraping**: Real-time operator detail scraping from TouchDesigner's offline documentation
- **POP Learning Guide**: Dedicated educational content for Particle Operators with workflow guidance
- **Contextual Search**: Advanced search with relevance ranking based on names, descriptions, keywords, and aliases

## Installation

### Via NPM (Recommended)

```bash
npm install -g @bottobot/td-mcp
```

### Via NPX

```bash
npx @bottobot/td-mcp
```

### From Source

```bash
git clone https://github.com/bottobot/touchdesigner-mcp-server.git
cd touchdesigner-mcp-server
npm install
```

## Prerequisites

- TouchDesigner installed (for offline documentation)
- Node.js 18.0.0 or higher
- An MCP-compatible AI assistant (Claude Desktop, VS Code with Cline extension, etc.)

## Configuration

### For Claude Desktop

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "npx",
      "args": ["@bottobot/td-mcp"]
    }
  }
}
```

### For VS Code (Cline Extension)

Add to your MCP settings:

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "node",
      "args": ["path/to/td-mcp/index.js"],
      "alwaysAllow": [
        "get_operator",
        "list_operators",
        "search_operators"
      ]
    }
  }
}
```

## Available Tools

### `get_operator`
Get detailed information about a specific TouchDesigner operator with enhanced metadata and real-time scraping.

**Parameters:**
- `name` (string): Operator name (e.g., 'Noise CHOP', 'Kinect Azure TOP')

**Features:**
- Returns comprehensive operator details including parameters, inputs, outputs, and attributes
- Enriched metadata with aliases, keywords, use cases, and related operators
- Special educational content for POP operators
- Real-time scraping for the most up-to-date documentation

**Example:**
```
Get information about the Noise CHOP operator
```

### `list_operators`
List available TouchDesigner operators with contextual grouping.

**Parameters:**
- `category` (string, optional): Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP, POP)

**Features:**
- Smart result limiting to prevent overwhelming output
- Category-based grouping when no filter is specified
- Shows operator counts per category

**Example:**
```
List all CHOP operators
```

### `search_operators`
Search for operators using contextual analysis and ranking.

**Parameters:**
- `query` (string): Search query
- `category` (string, optional): Filter by category

**Features:**
- Relevance-based ranking (1.0 = exact name match, 0.9 = keyword/alias match, 0.8 = description match)
- Searches across operator names, descriptions, keywords, aliases, and subcategories
- Returns relevance scores for transparency

**Example:**
```
Search for operators related to "kinect"
```

### `get_pop_learning_guide`
Get comprehensive learning information about TouchDesigner POPs (Point Operators).

**Parameters:** None

**Features:**
- Overview of the particle system architecture
- Detailed category explanations (Generators, Forces, Modifiers, etc.)
- Common attributes and workflow guidance
- Best practices for particle system development
- Links to example packages

**Example:**
```
Show me the POP learning guide
```

## Usage Examples

Once configured, you can ask your AI assistant questions like:

- "Show me documentation for the Noise CHOP"
- "What parameters does the Kinect Azure TOP have?"
- "List all available TOP operators"
- "Search for operators related to audio"
- "How do I use the Script CHOP?"

## Technical Details

### Architecture

The server uses a simple, efficient architecture:

1. **On-demand Parsing**: HTML documentation is parsed only when requested
2. **Memory Caching**: Parsed results are cached to avoid redundant processing
3. **Fuzzy Matching**: Intelligent name matching handles variations in operator names
4. **Direct Filesystem Access**: No database required - works directly with TouchDesigner's offline docs

### File Structure

```
touchdesigner-mcp-server/
├── index.js          # Main server implementation
├── package.json      # NPM package configuration
├── README.md         # This file
├── test.js           # Basic test suite
└── test-comprehensive.js  # Comprehensive test suite
```

### Performance

- Initial operator discovery: ~2-5 seconds (indexes 1800+ operators)
- Subsequent queries: <100ms (from cache)
- Memory usage: ~50-100MB depending on cache size

## Development

### Running Tests

```bash
# Basic tests
npm test

# Comprehensive tests
node test-comprehensive.js
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/bottobot/touchdesigner-mcp-server.git
cd touchdesigner-mcp-server

# Install dependencies
npm install

# Run the server
npm start
```

## Troubleshooting

### Server not finding documentation
Ensure TouchDesigner is installed in the default location:
- Windows: `C:/Program Files/Derivative/TouchDesigner/`
- The server looks for docs at: `.../Samples/Learn/OfflineHelp/https.docs.derivative.ca`

### Operators not found
- Check that operator names are spelled correctly
- Try searching with partial names
- Use the `list_operators` tool to see available operators

### Performance issues
- The first query after startup indexes all operators (normal)
- Subsequent queries should be fast (cached)
- If consistently slow, check disk access to documentation files

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Maintain the simple, database-free architecture
2. Ensure backward compatibility
3. Add tests for new features
4. Update documentation as needed

## License

MIT License - see LICENSE file for details

## Author

Robert Spring ([@bottobot](https://github.com/bottobot))

## Acknowledgments

- Derivative Inc. for TouchDesigner and its comprehensive documentation
- The MCP team for the Model Context Protocol specification
- The TouchDesigner community for inspiration and feedback

## Version History

- **1.2.0** - The "Context7" release - Major enhancements:
  - Added comprehensive pre-scraped metadata for 690+ operators
  - Implemented dynamic real-time scraping for detailed operator information
  - Added full POP (Particle Operators) support with 127 operators
  - Created dedicated POP learning guide with educational content
  - Enhanced search with contextual relevance ranking
  - Improved operator discovery with aliases and keywords
  - Added parameter, input, output, and attribute information
  - Implemented smart result limiting for better UX

- **1.1.0** - Repository rename and polish
  - Renamed from TouDocV4 to TD-MCP for clarity
  - Updated all repository URLs and documentation

- **1.0.0** - The "Eureka!" release - Direct filesystem approach, no database needed
- **0.x** - The overengineered era:
  - ChromaDB experiments (too complex)
  - SQLite implementations (worked but heavy)
  - Algolia integration attempts (overkill)
  - TouchDesigner direct integration with websockets & OSC (worked but data was garbage)
  - Multiple database schemas and import pipelines (why did I do this?)
  
*Lesson learned: Sometimes the simplest solution is the best solution.*

---

*This project is not affiliated with or endorsed by Derivative Inc., the makers of TouchDesigner.*