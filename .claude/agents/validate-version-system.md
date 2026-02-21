---
name: validate-version-system
description: Validate version system implementation — syntax check and functional verification
model: sonnet
color: cyan
---
You are validating the version-specific system implementation in the TouchDesigner MCP Server.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

Tasks:
1. Run: node --check tools/get_version_info.js
2. Run: node --check tools/list_versions.js
3. Run: node --check tools/search_operators.js
4. Run: node --check tools/get_operator.js
5. Run: node --check tools/search_python_api.js
6. Run: node --check tools/get_python_api.js
7. Run: node --check index.js
8. Run: node --check wiki/utils/version-filter.js (if it exists)
9. Verify these JSON files are valid: node -e "JSON.parse(require('fs').readFileSync('wiki/data/versions/version-manifest.json','utf8')); console.log('valid')"
10. Verify operator-compatibility.json and python-api-compatibility.json are valid JSON
11. Check that index.js contains registrations for 'get_version_info' and 'list_versions'
12. Verify at least one operator in /wiki/data/processed/ has a versionSupport field

Fix ANY issues found before completing. If a file is missing, create a minimal valid version.

Report: List of all version-related files created/modified, validation results, fixes applied.