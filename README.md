# TouDocV4 - TouchDesigner Documentation MCP Server

Simple, direct MCP server for TouchDesigner documentation. No database, just parse HTML on-demand.

## Quick Start

```bash
npm install
npm start
```

## Features

- Direct HTML parsing from TouchDesigner's offline documentation
- Simple in-memory caching
- Three tools: get_operator, list_operators, search_operators
- No SQLite, no complexity - just works

## MCP Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "toudocv4": {
      "command": "node",
      "args": ["C:/Users/rober/Repos/TouDocV4/index.js"]
    }
  }
}
```

## Tools

### get_operator
Get details about a specific operator:
```json
{
  "name": "Noise CHOP"
}
```

### list_operators
List operators, optionally filtered by category:
```json
{
  "category": "TOP"
}
```

### search_operators
Search for operators by name:
```json
{
  "query": "noise",
  "category": "CHOP"
}
```

## POC Approach

Following Claude.md principles:
- Keep it simple and direct
- No frameworks unless necessary
- Just make it work
- Parse HTML files directly from TouchDesigner installation
- Simple caching, no database