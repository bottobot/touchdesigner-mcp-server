---
name: implement-experimental
description: Implement MCP tools for experimental techniques and add experimental operator data
model: sonnet
color: purple
---
You are implementing MCP tools for experimental TouchDesigner techniques.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

Prerequisite: /wiki/data/experimental/ should have been populated by the previous research agent.

Tasks:

1. Create /tools/get_experimental_techniques.js:
InputSchema: {
  category: { type: 'string', enum: ['glsl','gpu-compute','machine-learning','generative-systems','audio-visual','networking','python-advanced'], required: false },
  name: { type: 'string', description: 'Technique name to look up', required: false }
}
Logic: Load /wiki/data/experimental/{category}.json or search all categories if no category given
Return: Full technique details including codeExample

2. Create /tools/search_experimental.js:
InputSchema: {
  query: { type: 'string', required: true, description: 'Search term for experimental techniques' },
  version: { type: 'string', required: false, description: 'Filter by minimum TD version' }
}
Logic: Search across all experimental categories, return matching techniques

3. Create /tools/get_glsl_pattern.js:
InputSchema: {
  pattern: { type: 'string', required: true, description: 'GLSL pattern type (raymarching/reaction-diffusion/feedback/procedural)' },
  includeCode: { type: 'boolean', required: false, default: true }
}
Logic: Return GLSL code examples and setup instructions from the glsl experimental data

4. Add experimental operator data files to /wiki/data/processed/:
- feedback_top.json (Feedback TOP — requires version 099+, key for generative systems)
- noise_top.json (Noise TOP — procedural generation workhorse)
- render_top.json (Render TOP — 3D scene rendering)
- geo_comp.json (Geometry COMP — 3D geometry container)
- script_top.json (ensure it exists with GPU compute info, don't overwrite if already comprehensive)
- null_top.json (Null TOP — pass-through, debugging)
- level_top.json (Level TOP — color grading and correction)
- blur_top.json (Blur TOP — multiple blur algorithms)
- transform_top.json (Transform TOP — 2D transformations)
- composite_top.json (Composite TOP — blending modes)

For each operator file, include versionSupport field.

5. Update /index.js to register: get_experimental_techniques, search_experimental, get_glsl_pattern

6. Update /wiki/data/search-index/search-index.json to include all new experimental operators and techniques

Follow exact code patterns from existing tools for consistency.