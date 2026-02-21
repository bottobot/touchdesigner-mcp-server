---
name: validate-changes
description: Validates all changes: syntax, exports, JSON integrity, and tool registration
model: sonnet
color: blue
---
Validate all recent changes to the TouchDesigner MCP Server at /home/robert/Documents/TD-MCP/touchdesigner-mcp-server. Tasks: (1) Run node --check on index.js and every file in tools/ to verify zero syntax errors. (2) Verify index.js properly registers all new tools: get_version_info, list_versions, get_experimental_techniques, search_experimental, get_glsl_pattern, get_operator_connections, get_network_template, get_experimental_build, list_experimental_builds. Count should now be 21 registered tools. (3) Validate all new JSON files in wiki/data/versions/ and wiki/data/experimental/ are valid JSON. (4) Confirm CHANGELOG.md has entries for all 4 streams. (5) If any issues are found, fix them immediately before proceeding. Report final tool count and any fixes applied.