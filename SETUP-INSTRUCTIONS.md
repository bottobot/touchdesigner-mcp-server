# TD-MCP Setup Instructions

This guide covers installing and configuring the TouchDesigner MCP Server (v2.8.0) for use with
VS Code/Codium and Claude Desktop. Read the [README](README.md) for a feature overview and full
tool reference.

## Requirements

- Node.js 18.0 or higher - download from [nodejs.org](https://nodejs.org)
- npm (bundled with Node.js)
- An MCP-compatible client:
  - VS Code or VS Codium with an MCP extension (Roo Code, Claude Dev, etc.), **or**
  - Claude Desktop (macOS or Windows)

## Installation

### Option A: Global npm install (recommended)

```bash
npm install -g @bottobot/td-mcp
```

After installation, `td-mcp` is available as a command on your PATH.

### Option B: npx (no install required)

Use `npx @bottobot/td-mcp` in place of `td-mcp` in all configuration examples below.
npx downloads the package on first use and caches it locally.

### Option C: Run from source

```bash
git clone https://github.com/bottobot/touchdesigner-mcp-server.git
cd touchdesigner-mcp-server
npm install
```

Use `node /absolute/path/to/touchdesigner-mcp-server/index.js` in place of `td-mcp`
in all configuration examples below.

## Configure Your MCP Client

### Claude Desktop

The configuration file location depends on your operating system:

| Platform | Path |
|----------|------|
| macOS    | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows  | `%APPDATA%\Claude\claude_desktop_config.json` |

Add the server entry inside the `"mcpServers"` object:

**Global install:**
```json
{
  "mcpServers": {
    "td-mcp": {
      "command": "td-mcp"
    }
  }
}
```

**npx (no install):**
```json
{
  "mcpServers": {
    "td-mcp": {
      "command": "npx",
      "args": ["@bottobot/td-mcp"]
    }
  }
}
```

Restart Claude Desktop after saving the file.

### VS Code / Codium with MCP Extensions

Add to your MCP settings (`.vscode/mcp.json` or the extension's settings UI):

```json
{
  "td-mcp": {
    "command": "npx",
    "args": ["@bottobot/td-mcp"]
  }
}
```

Reload the VS Code window after changing MCP settings.

### Any MCP-compatible client

The server uses the MCP stdio transport. Point your client at the `td-mcp` binary
(global install) or `npx @bottobot/td-mcp`. The server does **not** open a network
port — it communicates exclusively over stdin/stdout.

## Verify the Installation

### Test server startup

```bash
td-mcp
```

You should see output similar to:

```
TD-MCP v2.8.0 Server Starting...
================================
TouchDesigner MCP Server for VS Code/Codium

[Server] Initializing operator data manager...
[Server] Initialization took 843ms (0.84s)
[Patterns] Loaded 32 workflow patterns

[Server] TD MCP v2.8.0 initialized successfully
[Server] Ready with 629 operators, 14 tutorials, and 69 Python classes
[Server] All 21 tools registered
```

Press Ctrl+C to stop. When launched by your MCP client, this output goes to the
client's log, not your terminal.

### Test from your AI assistant

Try one of these prompts:
- "List all available TouchDesigner tutorials"
- "Get the documentation for the Noise CHOP operator"
- "Search for audio analysis operators"
- "Compare Blur TOP with Luma Blur TOP"
- "What operators were added in TouchDesigner 2022?"
- "Show me a network template for an audio-reactive visualization"
- "What new features are in the latest experimental TouchDesigner build?"

## Available Tools (21 Total)

### Operator Tools

| Tool                       | Description                                              |
|----------------------------|----------------------------------------------------------|
| `get_operator`             | Full documentation for a specific operator               |
| `search_operators`         | Search operators with ranking and filtering              |
| `list_operators`           | List operators by category                               |
| `compare_operators`        | Side-by-side operator comparison                         |
| `get_operator_examples`    | Python code examples per operator                        |
| `suggest_workflow`         | Related operator suggestions with port wiring            |
| `get_operator_connections` | Upstream and downstream wiring guide for an operator     |
| `get_network_template`     | Complete network templates with Python scripts           |

### Tutorial Tools

| Tool               | Description                            |
|--------------------|----------------------------------------|
| `get_tutorial`     | Full tutorial content                  |
| `list_tutorials`   | Browse all tutorials                   |
| `search_tutorials` | Search tutorial content                |

### Python API Tools

| Tool                   | Description                            |
|------------------------|----------------------------------------|
| `get_python_api`       | Python class documentation             |
| `search_python_api`    | Search Python API                      |
| `list_python_classes`  | Browse Python API classes by category  |

### Version System Tools

| Tool               | Description                                                |
|--------------------|------------------------------------------------------------|
| `get_version_info` | Python version, new operators, and highlights for a TD release |
| `list_versions`    | All supported TD versions (099 through 2024) with highlights   |

### Experimental Techniques Tools

| Tool                          | Description                                            |
|-------------------------------|--------------------------------------------------------|
| `get_experimental_techniques` | Advanced technique library by category with code       |
| `search_experimental`         | Full-text search across all technique categories       |
| `get_glsl_pattern`            | Named GLSL shader patterns, paste-ready                |

### Experimental Build Tools

| Tool                       | Description                                                   |
|----------------------------|---------------------------------------------------------------|
| `get_experimental_build`   | Details for a specific experimental TD build series           |
| `list_experimental_builds` | List experimental series grouped by feature area              |

See the [README](README.md) for full parameter documentation for each tool.

## Upgrading from Earlier Versions

### From v2.7.0

No breaking changes. The 9 new tools are additive. All existing tool names and parameters
remain unchanged. Optional new parameters have been added to `search_operators`,
`get_operator`, `suggest_workflow`, `search_python_api`, and `get_python_api` — these only
affect output when the new optional parameters are provided.

### From v2.6.x

No breaking changes when upgrading to v2.8.0. Restart your MCP client after upgrading.

## Troubleshooting

### Server won't start
- Verify Node.js version: `node --version` must show 18.0.0 or higher
- Run `npm install` if running from source
- Check that `wiki/data/` contains JSON files

### MCP client can't connect
- Verify your MCP configuration JSON is valid (no trailing commas)
- Reload VS Code window after configuration changes
- Check the Output panel for MCP-related error messages
- Confirm `td-mcp` is on your PATH: `which td-mcp` (or `where td-mcp` on Windows)

### Search returns no results
- Try simpler, shorter search terms
- Remove category filters
- Enable `parameter_search: true`

### Startup says "limited functionality"
- Check preceding log lines for the specific error
- Common causes: corrupted JSON in `wiki/data/`, Node.js below v18

### Python API tool returns no results
- Class names are case-sensitive: use `CHOP`, `TOP`, `SOP`, not lowercase
- Use `list_python_classes` first to see exact available class names

### get_experimental_build returns an error
- Use `list_experimental_builds` first to see valid series IDs
- Valid series IDs follow the format `YYYY.NNNNN` (e.g., `2025.10000`)
- Omit the `series_id` parameter to get the latest experimental series

## How the Server Works

This is a pure MCP stdio server. Your MCP client:

1. Spawns `td-mcp` as a child process
2. Sends JSON-RPC messages over stdin
3. Reads responses from stdout
4. The process stays alive for the session
5. When the session ends, the client terminates the process

The server reads all documentation from local JSON files bundled with the package.
It makes no network requests. TouchDesigner does not need to be installed or running.

## Support

- [GitHub Issues](https://github.com/bottobot/touchdesigner-mcp-server/issues)
- [TouchDesigner Docs](https://docs.derivative.ca)
- [NPM Package](https://www.npmjs.com/package/@bottobot/td-mcp)
