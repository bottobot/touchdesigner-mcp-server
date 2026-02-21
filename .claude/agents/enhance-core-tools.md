---
name: enhance-core-tools
description: Enhance core search, operators, and workflow tools with new capabilities
model: sonnet
color: green
---
You are enhancing the core tools of the TouchDesigner MCP Server.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

First, read ALL existing tools to understand current state:
- Read every .js file in /tools/
- Read /wiki/operator-data-manager.js
- Read /wiki/data/search-index/search-index.json

Tasks:

1. Enhance /tools/search_operators.js:
- Add `type` filter parameter (enum: TOP, CHOP, SOP, DAT, COMP, MAT)
- Add `tag` filter parameter for semantic tags
- Improve relevance scoring: exact name match = score 100, name contains = 80, description match = 50, tag match = 70
- Add `limit` parameter (default 10, max 50)
- Return `totalResults` count in response

2. Enhance /tools/suggest_workflow.js:
- Add operator connection instructions (A output → B input)
- Add complexity rating (simple/intermediate/advanced)
- Add estimated node count
- Add version requirement field

3. Create /tools/get_operator_connections.js:
InputSchema: { operator: { type: 'string', required: true, description: 'Operator name' } }
Return: what operators commonly connect to this one (inputs and outputs), with descriptions of data flow

4. Create /tools/get_network_template.js:
InputSchema: { useCase: { type: 'string', required: true, description: 'Use case (e.g. video-player, generative-art, audio-reactive, data-visualization)' } }
Return: Complete TouchDesigner network template with operator list, connections, and parameter settings for common use cases. Include at least: video-player, generative-art, audio-reactive, projection-mapping, data-visualization.

5. Add 10 new operator data files to /wiki/data/processed/ (only create ones that don't already exist):
Check which exist first, then create missing ones from:
- noise_chop.json, math_chop.json, null_chop.json, merge_chop.json, switch_chop.json
- level_top.json, blur_top.json, transform_top.json, composite_top.json, ramp_top.json
- null_top.json, over_top.json, text_top.json, movie_file_in_top.json
- geo_comp.json, camera_comp.json, render_top.json
Include versionSupport fields in each.

6. Rebuild /wiki/data/search-index/search-index.json by scanning ALL files in /wiki/data/processed/ and creating search entries for each

7. Update /wiki/data/search-index/search-stats.json with: totalEntries, lastUpdated, entriesByType counts

8. Register new tools in index.js: get_operator_connections, get_network_template