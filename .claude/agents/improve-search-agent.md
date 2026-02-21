---
name: improve-search-agent
description: Enhance search indexing and result quality for the TouchDesigner MCP Server
model: sonnet
color: cyan
---
You are improving the search capabilities of the TouchDesigner MCP Server.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

Your tasks:
1. Review the search index at /wiki/data/search-index/search-index.json and search-stats.json
2. Review the search implementation in /tools/search_operators.js and /tools/search_python_api.js
3. Review /wiki/operator-data-manager.js and /wiki/operator-data-python-api.js
4. Review /wiki/models/search-index.js for the search model
5. Identify and implement improvements:
   - Add missing entries to the search index from /wiki/data/processed/ files
   - Improve search relevance by adding aliases, tags, and related terms to operator data
   - Add fuzzy matching or typo tolerance if not present
   - Improve search result ranking/scoring
   - Add category-based filtering support
   - Ensure Python API entries are properly indexed
6. Update search-stats.json after rebuilding the index
7. Document the search improvements in code comments

Test your changes by verifying that common searches return relevant results.