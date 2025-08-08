# Changelog

All notable changes to the TouchDesigner MCP Server will be documented in this file.

## [2.3.1] - 2025-01-08

### Changed
- Cleaned up repository by removing all development, test, and temporary files
- Removed 84 unnecessary files and 5 legacy directories
- Package now contains only essential files for production use
- Reduced package size significantly by removing development artifacts

### Improved
- Cleaner repository structure for better maintainability
- Optimized package size for faster installation
- Production-ready distribution without development clutter

## [2.3.0] - 2025-01-08

### Added
- Full support for 90 experimental POP (Particle Operators) with 3,327 parameters
- Tutorial support with 7 comprehensive TouchDesigner tutorials
- New MCP tools: `get_tutorial` and `list_tutorials` for accessing tutorial content
- Complete operator documentation in markdown format (TOUCHDESIGNER_ALL_OPERATORS.md)
- Comprehensive test suite for all MCP tools
- Detailed parameter extraction from experimental operator HTML files
- Tutorial parser for HTM files with full content extraction

### Changed
- Filtered operator list to remove deprecated operators, class documentation, and tutorial entries
- Improved operator count from 717 to 629 actual operators
- Enhanced wiki system to support tutorials as separate entities
- Better organization of operators by category
- Improved search indexer with detailed logging

### Fixed
- Auto-save feature that was overwriting rebuilt index with empty data
- Hardcoded operator display limits (was 50/100, now unlimited)
- Missing experimental POP operators now properly parsed with parameters
- Proper filtering of non-operator entries

### Technical
- Total operators: 629 (including 90 experimental POPs)
- Total tutorials: 7 with 222 content items
- Categories covered: CHOP (166), TOP (139), SOP (112), DAT (69), MAT (13), COMP (40), POP (90)

## [2.2.0] - Previous Release

### Added
- Initial MCP server implementation
- Basic operator documentation
- Search functionality
- Workflow suggestions

## [2.1.0] - Previous Release

### Added
- Core MCP functionality
- Basic TouchDesigner operator support

---

For more information, visit the [GitHub repository](https://github.com/bottobot/touchdesigner-mcp-server)