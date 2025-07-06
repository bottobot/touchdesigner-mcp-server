# TouchDesigner .toe File Format Issue & Solution

## The Fatal Flaw

The current MCP server implementation has a **critical flaw** in how it attempts to create TouchDesigner projects:

### What's Wrong

In `TOEGenerator.ts`, the code incorrectly assumes:
```typescript
// TOE files are essentially compressed TouchDesigner XML
const compressed = await gzip(toeContent);
await fs.writeFile(projectFile, compressed);
```

**This is completely wrong!**

### Why It's Wrong

TouchDesigner .toe files are **NOT** simple compressed XML files. They are:
- **Proprietary binary format** files
- Contain compiled shader code
- Include binary asset data
- Have internal TouchDesigner-specific data structures
- May include encrypted or obfuscated content
- Can only be created and properly saved by TouchDesigner itself

## The Solution

There are three valid approaches to programmatically create TouchDesigner projects:

### 1. Python Script Generation (Recommended)

Generate Python scripts that TouchDesigner executes to build projects:

```python
# Generated script example
import td

# Create nodes
noise = op('/').create(noiseTOP, 'noise1')
noise.par.period = 4
noise.par.type = 'sparse'

blur = op('/').create(blurTOP, 'blur1')
blur.par.size = 10

# Connect nodes
blur.inputConnectors[0].connect(noise.outputConnectors[0])

# Save project
project.save('myproject.toe')
```

### 2. Template-Based Approach

Use pre-made .toe template files and modify them:

```typescript
// Copy template
await fs.copyFile('templates/basic.toe', 'newproject.toe');

// Generate Python script to modify the template
const modifyScript = `
import td
# Modify existing project
op('/noise1').par.seed = ${customSeed}
project.save()
`;

// Execute via TouchDesigner
exec(`TouchDesigner.exe -nogui "${modifyScript}"`);
```

### 3. TouchDesigner CLI Automation

Use TouchDesigner's command-line interface:

```bash
# Create empty project
TouchDesigner.exe -nogui -cmd "project.save('empty.toe')"

# Execute generator script
TouchDesigner.exe "empty.toe" -cmd "python generator.py"
```

## Implementation Fix

The `TOEGeneratorFixed.ts` implements the correct approach:

1. **Generates Python scripts** instead of trying to create binary .toe files
2. **Uses TouchDesigner CLI** to execute the scripts
3. **Falls back to manual execution** if CLI is unavailable
4. **Provides clear documentation** about the limitation

## Required Changes to MCP Server

1. **Replace TOEGenerator with TOEGeneratorFixed**
2. **Create template .toe files** for common project types
3. **Update all tools** to use Python script generation
4. **Add proper error handling** for TouchDesigner CLI failures
5. **Document the limitation** clearly in the README

## Template Directory Structure

```
templates/
├── blank.toe          # Empty project
├── audio-reactive.toe # Audio visualization template
├── interactive.toe    # Interactive/Kinect template
├── generative.toe     # Generative art template
└── data-viz.toe       # Data visualization template
```

## Creating Templates

To create proper template files:

1. Open TouchDesigner
2. Create a minimal project with basic structure
3. Save as template (File → Save As)
4. Place in templates directory

## Error Messages to Update

When project creation fails, provide clear guidance:

```
TouchDesigner project creation requires TouchDesigner to be installed.

The generated Python script has been saved to:
  project_name_generator.py

To create your project:
1. Open TouchDesigner
2. Create a new empty project
3. Open the Textport (Alt+T)
4. Run: run("path/to/project_name_generator.py")
```

## Testing the Fix

1. Test with TouchDesigner installed and CLI available
2. Test without TouchDesigner (should save script with instructions)
3. Test with corrupted templates (should fall back gracefully)
4. Verify generated Python scripts create valid projects

## Long-term Solution

Consider implementing:
- WebSocket connection to running TouchDesigner instance
- Direct Python API integration via TouchDesigner's built-in server
- REST API that TouchDesigner polls for commands
- Native TouchDesigner extension that connects to MCP

## Conclusion

The fundamental issue is that .toe files cannot be created outside of TouchDesigner. The MCP server must work **with** TouchDesigner, not try to replace its file generation capabilities. This fix ensures proper project creation while maintaining the automation benefits of the MCP server.