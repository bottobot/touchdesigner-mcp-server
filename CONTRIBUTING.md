# Contributing to TouchDesigner MCP Server

Thank you for your interest in contributing to the TouchDesigner MCP Server! This document provides guidelines and instructions for contributing.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Expected Behavior
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/yourusername/touchdesigner-mcp-server.git
   cd touchdesigner-mcp-server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your TouchDesigner paths
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Development Setup

### Prerequisites
- Node.js 20.x or higher
- TypeScript 5.x
- TouchDesigner (latest version recommended)
- Git

### Development Workflow
1. Create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
   ```bash
   npm run dev  # Run in development mode with hot reload
   ```

3. Test your changes
   ```bash
   npm test
   npm run lint
   ```

4. Commit your changes
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

## How to Contribute

### Reporting Bugs
1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information
   - Error logs

### Suggesting Features
1. Check existing feature requests
2. Use the feature request template
3. Explain:
   - Use case
   - Proposed solution
   - Alternative solutions considered

### Adding New Tools
To add a new MCP tool:

1. **Define the Schema** in `src/index.ts`:
   ```typescript
   const YourToolSchema = z.object({
     param1: z.string(),
     param2: z.number().optional()
   });
   ```

2. **Register the Tool**:
   ```typescript
   server.addTool({
     name: 'td_your_tool',
     description: 'Clear description of what it does',
     inputSchema: YourToolSchema
   });
   ```

3. **Implement the Handler**:
   ```typescript
   case 'td_your_tool': {
     const params = YourToolSchema.parse(args);
     // Your implementation
     return {
       content: [{
         type: 'text',
         text: 'Success message'
       }]
     };
   }
   ```

4. **Add Documentation**:
   - Update `docs/API.md` with tool details
   - Add example usage
   - Include parameter descriptions

5. **Write Tests**:
   ```typescript
   describe('td_your_tool', () => {
     it('should perform expected action', async () => {
       // Your test
     });
   });
   ```

## Coding Standards

### TypeScript Style Guide
- Use 2 spaces for indentation
- Use single quotes for strings
- Add types for all parameters and return values
- Use meaningful variable names
- Keep functions small and focused

### File Organization
```
src/
├── index.ts              # Main server file
├── generators/           # File generators
├── utils/               # Utility modules
└── types/               # TypeScript type definitions
```

### Naming Conventions
- **Files**: `camelCase.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **MCP Tools**: `td_snake_case`

### Code Quality
- No `any` types without justification
- Handle all errors appropriately
- Add JSDoc comments for public APIs
- Keep cyclomatic complexity low
- Follow DRY principles

## Testing

### Test Structure
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Testing Guidelines
- Write unit tests for all new functions
- Maintain >80% code coverage
- Test edge cases and error conditions
- Use meaningful test descriptions
- Mock external dependencies

### Running Tests
```bash
npm test           # Run all tests
npm test:watch     # Run tests in watch mode
npm test:coverage  # Generate coverage report
```

## Documentation

### Code Documentation
- Add JSDoc comments for public functions
- Include parameter descriptions
- Document return types
- Add usage examples

Example:
```typescript
/**
 * Creates a TouchDesigner project from a natural language prompt
 * @param prompt - Natural language description of the project
 * @param options - Additional configuration options
 * @returns Path to the created project file
 * @example
 * const projectPath = await createProject('Audio visualizer', { 
 *   template: 'vj-performance' 
 * });
 */
```

### README Updates
- Update feature list when adding tools
- Keep installation instructions current
- Add relevant examples
- Update compatibility information

## Pull Request Process

### Before Submitting
1. **Update Documentation**
   - API docs for new features
   - README if needed
   - Code comments

2. **Test Thoroughly**
   - All tests pass
   - Manual testing completed
   - No linting errors

3. **Update Changelog**
   - Add entry under "Unreleased"
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

### PR Guidelines
1. **Title Format**: 
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `refactor:` for code changes
   - `test:` for test additions
   - `chore:` for maintenance

2. **Description Template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Manual testing completed
   - [ ] Documentation updated

   ## Screenshots (if applicable)
   ```

3. **Review Process**:
   - Maintainers will review within 48 hours
   - Address feedback promptly
   - Squash commits before merge
   - Ensure CI passes

### After Merge
- Delete your feature branch
- Pull latest main to your fork
- Consider tackling another issue!

## Community

### Getting Help
- Check documentation first
- Search existing issues
- Ask in discussions
- Join our Discord server

### Recognition
Contributors are recognized in:
- README.md contributors section
- Release notes
- Project website

## License
By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to TouchDesigner MCP Server! 🎨✨