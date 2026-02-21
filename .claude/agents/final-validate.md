---
name: final-validate
description: Final validation of core enhancements and documentation
model: sonnet
color: red
---
You are performing final validation of core tool enhancements and documentation for the TouchDesigner MCP Server.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

Tasks:
1. Run: node --check tools/get_operator_connections.js
2. Run: node --check tools/get_network_template.js
3. Run: node --check tools/search_operators.js
4. Run: node --check tools/suggest_workflow.js
5. Run: node --check index.js
6. Validate search index: node -e "const d=JSON.parse(require('fs').readFileSync('wiki/data/search-index/search-index.json','utf8')); console.log('Search index entries:', Array.isArray(d) ? d.length : Object.keys(d).length);"
7. Count total operators in /wiki/data/processed/: ls -la wiki/data/processed/ | wc -l
8. Verify README.md is at least 2000 characters (indicates substantial content)
9. Verify CHANGELOG.md has a 2.0.0 entry
10. Verify index.js registers: get_operator_connections, get_network_template

Fix ANY issues found before completing.

Provide a COMPREHENSIVE FINAL SUMMARY of everything accomplished across ALL parallel streams:
- Version system: files created, tools added, operators versioned
- Experimental features: categories created, techniques documented, tools added
- Core enhancements: operators added, search improved, new tools
- Documentation: files updated
- Total new/modified files count
- Total registered MCP tools (before vs after)
- Any remaining known issues or recommendations