---
name: add-operators-agent
description: Expand the TouchDesigner operator wiki data with additional operators
model: sonnet
color: green
---
You are expanding the TouchDesigner MCP Server's operator database.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

Your tasks:
1. Review existing operator data files in /wiki/data/processed/ to understand the JSON structure format
2. Review /data/patterns.json to understand the patterns tracking system
3. Identify the most commonly used TouchDesigner operators that are NOT yet in /wiki/data/processed/
4. Create well-structured JSON data files for at least 5-10 important missing operators following the exact same schema as existing files
5. Update /wiki/data/search-index/search-index.json to include the new operators
6. Update /data/patterns.json if relevant patterns should be added

Focus on high-impact operators like: noise TOP/CHOP/SOP, blur TOP, ramp TOP, switch TOP/CHOP, merge CHOP, math CHOP, null TOP/CHOP/DAT/SOP, level TOP, composite TOP, transform TOP.

Ensure each operator file includes: name, type, description, parameters, inputs, outputs, and usage examples.