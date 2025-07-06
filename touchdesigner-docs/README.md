# TouchDesigner Documentation

This directory contains embedded TouchDesigner documentation for the MCP server.

## Structure

- **operators/** - Documentation for all TouchDesigner operators
  - TOP/ - Texture operators
  - CHOP/ - Channel operators
  - SOP/ - Surface operators
  - MAT/ - Material operators
  - DAT/ - Data operators
  - COMP/ - Component operators
- **tutorials/** - Step-by-step tutorials
- **best-practices/** - Best practices and guidelines
- **performance/** - Performance optimization guides
- **workflows/** - Common workflow patterns
- **examples/** - Example projects and snippets
- **community/** - Community-contributed documentation

## Adding Documentation

1. Place markdown files in the appropriate directory
2. Run `npm run embed-docs` to update the vector database
3. The documentation will be automatically indexed and searchable

## Supported Formats

- Markdown (.md)
- PDF (.pdf)
- HTML (.html)
- Plain text (.txt)
