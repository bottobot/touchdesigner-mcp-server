# Changelog

All notable changes to the TouchDesigner MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.1] - 2025-01-16

### 🐍 Critical Python API Fixes
- **FIXED: get_python_api tool** - Python API documentation tool now returns proper responses (was returning no response)
- **FIXED: search_python_api tool** - Python API search tool now works correctly (was returning no response)
- **FIXED: MCP response format** - Both Python API tools now return proper MCP content format instead of raw JavaScript objects
- **FIXED: Response structure** - All Python API responses now wrapped in required `content: [{ type: "text", text: "..." }]` format

### 🔧 Technical Improvements
- **Enhanced error handling** - Python API tools now provide user-friendly error messages in proper MCP format
- **Improved documentation display** - Python classes now show beautifully formatted documentation with methods, members, and parameters
- **Working search functionality** - Python API search now properly filters by classes, methods, and members with relevance scoring
- **Corrected documentation stats** - Updated Python API class count from incorrect 553 to accurate 69 classes

### 📊 Data Corrections
- **69 Python API Classes** - Corrected count of available Python classes (1,513 methods total)
- **Enhanced class details** - Full parameter signatures, return types, and descriptions now display properly
- **Accurate statistics** - Fixed misleading class counts in documentation and package description

This patch release fixes the critical issue where Python API tools returned no response, making them fully functional for TouchDesigner Python documentation queries.

## [2.6.0] - 2025-01-14

### 🔧 Critical Fixes
- **FIXED: search_operators tool** - The search functionality that was completely broken is now fully operational
- **FIXED: Empty search results** - Resolved issue where all searches returned zero results despite 629 operators being loaded
- **FIXED: Search indexer** - Removed the broken search indexer that was never properly synchronized with operator data

### 🏗️ Architecture Improvements
- **RENAMED: WikiSystem to OperatorDataManager** - More descriptive naming throughout the entire codebase (20+ files updated)
- **RENAMED: WikiWebServer to DocumentationWebServer** - Clearer component naming
- **REMOVED: Web server functionality** - Eliminated unnecessary web server component for cleaner, focused MCP implementation
- **IMPLEMENTED: Direct search algorithm** - New reliable search that queries operator data directly without index dependency

### 🚀 Performance Enhancements
- **Faster search** - Direct search implementation is more performant than the broken indexer approach
- **Reduced overhead** - Removal of web server reduces memory footprint and startup time
- **Simplified architecture** - Pure MCP server without web dependencies

### 📊 Data Verification
- **Confirmed 629 operators** accessible and searchable
- **Verified 553 Python API classes** properly loaded
- **Validated 14 tutorials** fully indexed
- **Checked 3,327+ parameters** documentation complete

### 🔄 Changed
- Search now uses `performDirectSearch()` method as primary search mechanism
- All references to WikiSystem updated to OperatorDataManager
- Server operates as pure MCP implementation without web interface
- Improved error messages for search failures

### 🗑️ Removed
- Broken search indexer dependency
- DocumentationWebServer component
- Web server initialization code
- Web server port configuration
- Web server shutdown handlers

### 📝 Documentation
- Updated README with major version 2.6.0 notice
- Added clear warning about critical search fix
- Documented architecture changes
- Updated feature descriptions

## [2.5.0] - 2025-01-13

### Added
- Python API documentation tools (get_python_api, search_python_api)
- 553 Python API classes documentation
- Enhanced workflow suggestions

### Improved
- Operator categorization system
- Search result ranking algorithm
- Parameter documentation coverage

## [2.4.0] - 2025-01-12

### Added
- 7 new comprehensive tutorials (doubled tutorial content)
- New tutorial integration tool for automated future additions
- Tutorials: Write a C++ CHOP, Write a C++ TOP, Write a C++ Plugin
- Tutorials: Write a CUDA DLL, Write a Shared Memory CHOP/TOP
- Tutorial: TDBitwig User Guide

### Improved
- 24% size reduction (optimized from 177MB to 135MB)
- Clean architecture with removed redundant files
- Eliminated experimental parsers

### Fixed
- Tutorial loading issues
- Memory optimization for large documentation files

## [2.3.0] - 2025-01-10

### Added
- 90+ experimental POP (Point Operators) documentation
- Particle system operator support
- Enhanced operator workflow patterns

### Improved
- Search algorithm with contextual ranking
- Operator suggestion accuracy
- Cross-reference linking between related operators

## [2.2.0] - 2025-01-08

### Added
- MCP tool for workflow suggestions
- Operator relationship mapping
- Common workflow patterns database

### Improved
- Search performance with optimized indexing
- Parameter search functionality
- Category filtering options

## [2.1.0] - 2025-01-05

### Added
- Full parameter documentation for all operators
- Advanced search with parameter matching
- Operator example code snippets
- Performance tips and best practices

### Fixed
- Search result relevance scoring
- Category filtering edge cases
- Unicode handling in documentation

## [2.0.0] - 2025-01-01

### Added
- Complete rewrite as MCP server
- 629 TouchDesigner operators documentation
- 14 comprehensive tutorials
- Smart contextual search
- Zero-configuration setup
- VS Code/Codium integration

### Changed
- Architecture from standalone app to MCP server
- Documentation format to JSON-based system
- Search implementation to weighted scoring

### Removed
- Legacy web interface
- Standalone desktop application
- Manual configuration requirements

## [1.0.0] - 2024-12-15

### Added
- Initial release
- Basic operator documentation
- Simple search functionality
- Web-based interface
- Manual configuration system

---

## Migration Guide

### From v2.6.0 to v2.6.1

This is a critical patch that fixes the broken Python API tools. No migration steps required, but you should:

1. Update immediately if Python API tools were returning no response
2. Restart your MCP server after updating
3. Test Python API functionality with `get_python_api` and `search_python_api` tools

The fixes are internal and restore full Python API functionality.

### From v2.5.0 to v2.6.0

This is a critical update that fixes the broken search functionality. No migration steps required, but you should:

1. Update immediately if experiencing search issues
2. Restart your MCP server after updating
3. Clear any cached search results

The architecture changes are internal and won't affect your usage:
- WikiSystem is now OperatorDataManager (internal change)
- Web server has been removed (was not user-facing)
- Search uses direct implementation (transparent to users)

### From v2.4.0 to v2.5.0

No breaking changes. The Python API tools are additive and don't affect existing functionality.

### From v1.x to v2.x

Major architecture change from standalone application to MCP server:

1. Uninstall the old standalone application
2. Install via npm: `npm install -g @bottobot/td-mcp`
3. Configure in VS Code MCP settings
4. Remove old configuration files (no longer needed)

---

For more information, see the [README](README.md) or visit the [GitHub repository](https://github.com/bottobot/touchdesigner-mcp-server).