---
name: research-td-versions
description: Research all TouchDesigner versions and create version compatibility data
model: sonnet
color: cyan
---
You are researching TouchDesigner version history to build a comprehensive version compatibility system for the MCP server.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

TouchDesigner major versions to document: 099, 2019, 2020, 2021, 2022, 2023, 2024

Tasks:
1. Read all HTML files in /wiki/docs/python/ looking for any version annotations or deprecation notices
2. Read the Python API JSON files in /wiki/data/python-api/ looking for any version fields
3. Read existing operator files in /wiki/data/processed/ for any version data

Based on your knowledge of TouchDesigner version history, create the directory /wiki/data/versions/ and the following files:

a) /wiki/data/versions/version-manifest.json — master list of versions:
{
  "versions": [
    { "id": "099", "label": "TouchDesigner 099", "year": 2018, "status": "legacy", "pythonVersion": "3.5" },
    { "id": "2019", "label": "TouchDesigner 2019", "year": 2019, "status": "legacy", "pythonVersion": "3.5" },
    { "id": "2020", "label": "TouchDesigner 2020", "year": 2020, "status": "supported", "pythonVersion": "3.7" },
    { "id": "2021", "label": "TouchDesigner 2021", "year": 2021, "status": "supported", "pythonVersion": "3.9" },
    { "id": "2022", "label": "TouchDesigner 2022", "year": 2022, "status": "supported", "pythonVersion": "3.9" },
    { "id": "2023", "label": "TouchDesigner 2023", "year": 2023, "status": "current", "pythonVersion": "3.11" },
    { "id": "2024", "label": "TouchDesigner 2024", "year": 2024, "status": "latest", "pythonVersion": "3.11" }
  ],
  "default": "2023",
  "latest": "2024"
}

b) /wiki/data/versions/operator-compatibility.json — version support for operators:
{
  "operators": {
    "noise_top": { "addedIn": "099", "removedIn": null, "changedIn": ["2021", "2023"], "notes": {} },
    "feedback_top": { "addedIn": "2020", "removedIn": null, "changedIn": [], "notes": {} },
    "touchengine_chop": { "addedIn": "2022", "removedIn": null, "changedIn": [], "notes": { "2022": "New in 2022.x — TouchEngine integration" } }
  }
}
Populate with at least 30 operators using your knowledge of TD version history.

c) /wiki/data/versions/python-api-compatibility.json — version support for Python API:
{
  "classes": {
    "OP": { "addedIn": "099", "methods": { "copyOp": { "addedIn": "2021" }, "changeType": { "addedIn": "2020" } } }
  }
}
Populate with key API changes across versions.

d) /wiki/data/versions/release-highlights.json — key features per version:
{
  "2024": ["TouchEngine improvements", "New ML TOP operators", "Vulkan renderer updates"],
  "2023": ["Python 3.11 upgrade", "New SOPs", "Performance improvements"]
}

Use your knowledge of TouchDesigner history to populate these files accurately and comprehensively.