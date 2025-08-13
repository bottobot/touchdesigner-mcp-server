# Changelog

All notable changes to the TouchDesigner MCP Server will be documented in this file.

## [2.4.0] - 2025-01-13

### Added
- 🎓 **7 New Tutorials** - Doubled tutorial content from 7 to 14 tutorials
  - Introduction to Python Tutorial
  - Write a C++ Plugin
  - Write a CUDA DLL
  - Write a GLSL Material
  - Video Streaming User Guide
  - TouchDesigner Video Server Specification Guide
  - TDBitwig User Guide
- 🛠️ **Tutorial Integration Script** - New automated tool at `scripts/integrate-tutorials.js` for adding future tutorials
- 📚 **Expanded Learning Resources** - Comprehensive coverage of Python, C++, CUDA, GLSL, and video workflows

### Changed
- 📦 **Optimized Server Size** - Reduced from 177MB to 135MB (24% reduction)
- 🧹 **Cleaned Architecture** - Removed redundant experimental parsers and test files
- ⚡ **Improved Performance** - Faster initialization with streamlined codebase

### Fixed
- Removed duplicate and experimental HTM parser implementations
- Cleaned up unnecessary downloaded documentation files
- Optimized wiki system structure

## [2.3.1] - 2025-01-08

### Added
- Initial release with 629 TouchDesigner operators
- 7 core tutorials
- Smart search functionality
- Workflow suggestions
- Full parameter documentation for 3,327+ parameters

### Features
- Complete coverage of all TouchDesigner operator categories (TOP, CHOP, SOP, DAT, MAT, COMP, POP)
- Experimental POP operators with full documentation
- Zero-configuration setup for VS Code/Codium
- MCP-compatible tool system

---

For more information, visit the [GitHub repository](https://github.com/bottobot/touchdesigner-mcp-server)