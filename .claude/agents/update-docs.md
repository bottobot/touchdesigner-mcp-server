---
name: update-docs
description: Comprehensive documentation overhaul reflecting all new version-aware and experimental capabilities
model: sonnet
color: orange
---
You are updating the documentation for the TouchDesigner MCP Server after major improvements.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

Read current state:
1. Read README.md
2. Read MCP-ARCHITECTURE.md
3. Read CHANGELOG.md
4. Read index.js to get the definitive list of ALL registered tools
5. List files in /tools/ to see all tool files

Tasks:

1. Rewrite README.md with:
## TouchDesigner MCP Server

Full sections covering:
- Project description and use cases
- Version Support section: explain that users can specify TD version (099/2019/2020/2021/2022/2023/2024) to get version-filtered results
- Complete Tools Reference table with ALL tools (original + new): columns = Tool Name | Description | Key Parameters
- Experimental Features section describing GLSL, GPU, ML, generative capabilities
- Installation & Setup guide
- Usage Examples: show real example calls for 5+ tools
- Contributing section

2. Update MCP-ARCHITECTURE.md:
- Add section on version-aware architecture
- Add section on experimental techniques data layer
- Document the /wiki/data/versions/ data structure
- Document the /wiki/data/experimental/ data structure
- Update tools layer diagram

3. Add comprehensive CHANGELOG.md entry for version 2.0.0:
## [2.0.0] - 2026-02-21
### Added
- Version-specific filtering for all search and lookup tools
- New tools: get_version_info, list_versions, get_experimental_techniques, search_experimental, get_glsl_pattern, get_operator_connections, get_network_template
- Experimental techniques knowledge base (GLSL, GPU compute, ML, generative, audio-visual, networking, Python advanced)
- TouchDesigner version compatibility matrix
- 20+ new operator data files
- Rebuilt search index with improved relevance scoring

4. Add JSDoc comments to any tool files missing them (check all /tools/*.js files)

5. Create /wiki/data/tutorials/version_aware_workflow.json:
{
  "title": "Using Version-Aware Features",
  "description": "How to use TD version filtering in the MCP server",
  "steps": [
    { "step": 1, "title": "List Versions", "tool": "list_versions", "example": {} },
    { "step": 2, "title": "Search with Version", "tool": "search_operators", "example": { "query": "noise", "version": "2023" } },
    { "step": 3, "title": "Get Version Info", "tool": "get_version_info", "example": { "version": "2024" } }
  ]
}