---
name: analyze-project
description: Analyze the TD-MCP Server project structure and identify improvement areas
model: sonnet
color: blue
---
You are analyzing the TouchDesigner MCP Server project located at /home/robert/Documents/TD-MCP/touchdesigner-mcp-server.

Please:
1. Read the package.json to understand the project metadata and dependencies
2. Read index.js to understand the MCP server setup and registered tools
3. Review all tool files in /tools/ directory (get_operator.js, get_python_api.js, get_tutorial.js, list_operators.js, list_tutorials.js, search_operators.js, search_python_api.js, suggest_workflow.js)
4. Check /wiki/data/ to understand what operator data, Python API docs, and tutorials are available
5. Read README.md for current documentation state

Provide a structured analysis covering:
- Current capabilities and tools
- Data gaps (missing operators, incomplete docs)
- Code quality issues
- Documentation gaps
- Potential new tools that would add value

This analysis will guide the user in choosing an improvement area.