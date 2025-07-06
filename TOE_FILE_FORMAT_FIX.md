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

