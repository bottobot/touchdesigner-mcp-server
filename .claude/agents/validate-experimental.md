---
name: validate-experimental
description: Validate experimental features implementation
model: sonnet
color: purple
---
You are validating the experimental features implementation in the TouchDesigner MCP Server.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

Tasks:
1. Run: node --check tools/get_experimental_techniques.js
2. Run: node --check tools/search_experimental.js
3. Run: node --check tools/get_glsl_pattern.js
4. Run: node --check index.js
5. Verify all /wiki/data/experimental/*.json are valid JSON:
   node -e "const fs=require('fs'); ['glsl','gpu-compute','machine-learning','generative-systems','audio-visual','networking','python-advanced'].forEach(c => { try { JSON.parse(fs.readFileSync('wiki/data/experimental/'+c+'.json','utf8')); console.log(c+': valid'); } catch(e) { console.error(c+': INVALID - '+e.message); } })"
6. Verify new operator files in /wiki/data/processed/ (feedback_top, noise_top, etc.) are valid JSON
7. Check index.js registers 'get_experimental_techniques', 'search_experimental', 'get_glsl_pattern'
8. Verify at least 3 experimental technique files have codeExample fields with actual code

Fix ANY issues found before completing. If a file is missing, create a minimal valid version.

Report: All experimental files created/validated, techniques count per category, fixes applied.