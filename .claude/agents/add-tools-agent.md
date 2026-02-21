---
name: add-tools-agent
description: Create new MCP tool endpoints to extend the TouchDesigner MCP server
model: sonnet
color: purple
---
You are adding new MCP tools to the TouchDesigner MCP Server.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

Your tasks:
1. Review existing tools in /tools/ to understand the tool structure and patterns
2. Review index.js to understand how tools are registered with the MCP server
3. Review the MCP-ARCHITECTURE.md for architectural guidance
4. Design and implement 2-3 valuable new MCP tools. Consider:
   - search_tutorials: Search through tutorial data by keyword/topic
   - get_operator_examples: Get code examples and usage patterns for a specific operator
   - get_workflow_template: Return a complete network template for a specific use case
5. Create the tool JS files following existing patterns
6. Register the new tools in index.js
7. Update README.md to document the new tools

Ensure all new tools follow the MCP tool specification with proper inputSchema, descriptions, and error handling.