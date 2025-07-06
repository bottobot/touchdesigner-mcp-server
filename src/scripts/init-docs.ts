import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from 'dotenv';

config();

const TD_DOCS_PATH = process.env.TD_DOCS_PATH || './touchdesigner-docs';

async function initializeDocumentationStructure() {
  console.log('🚀 Initializing TouchDesigner documentation structure...');
  
  try {
    // Create main documentation directory
    await fs.mkdir(TD_DOCS_PATH, { recursive: true });
    
    // Create subdirectories for different documentation types
    const subdirs = [
      'operators/TOP',
      'operators/CHOP',
      'operators/SOP',
      'operators/MAT',
      'operators/DAT',
      'operators/COMP',
      'tutorials',
      'best-practices',
      'performance',
      'workflows',
      'examples',
      'community'
    ];
    
    for (const dir of subdirs) {
      const dirPath = path.join(TD_DOCS_PATH, dir);
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dirPath}`);
    }
    
    // Create example documentation files
    const readmeContent = `# TouchDesigner Documentation

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
2. Run \`npm run embed-docs\` to update the vector database
3. The documentation will be automatically indexed and searchable

## Supported Formats

- Markdown (.md)
- PDF (.pdf)
- HTML (.html)
- Plain text (.txt)
`;
    
    await fs.writeFile(path.join(TD_DOCS_PATH, 'README.md'), readmeContent);
    console.log('✅ Created README.md');
    
    // Create a sample operator documentation
    const sampleOperatorDoc = `# Noise TOP

## Overview
The Noise TOP generates various types of procedural noise patterns that can be used for textures, displacement maps, or as input to other operators.

## Parameters

### Noise Type
- **Sparse** - Generates sparse convolution noise
- **Hermite** - Smooth interpolated noise
- **Harmon Summation** - Fractal noise with harmonic frequencies
- **Perlin** - Classic Perlin noise
- **Simplex** - Improved Perlin noise variant
- **Worley** - Cellular/Voronoi noise
- **Alligator** - Turbulent noise pattern

### Transform
- **Translate** - Move the noise pattern in X, Y, Z
- **Rotate** - Rotate the noise pattern
- **Scale** - Scale the noise pattern

### Output
- **Monochrome** - Single channel output
- **Color** - RGB output

## Common Use Cases

1. **Texture Generation**
   - Create organic textures for materials
   - Generate displacement maps for geometry
   - Create animated backgrounds

2. **Motion Graphics**
   - Drive particle systems
   - Create organic animations
   - Generate random variations

3. **Data Visualization**
   - Create heat maps
   - Visualize data patterns
   - Generate test patterns

## Performance Tips

- Use lower resolutions when possible
- Cache static noise patterns
- Consider using Simplex over Perlin for better performance
- Limit the number of octaves for fractal noise

## Examples

### Basic Noise Setup
\`\`\`
# Create a Noise TOP
noise = op('noise1')
noise.par.type = 'simplex'
noise.par.period = 4
noise.par.phase = absTime.seconds * 0.1
\`\`\`

### Animated Turbulence
\`\`\`
# Animate noise for turbulent effect
noise.par.transform = 1
noise.par.translate = [0, absTime.seconds * 0.2, 0]
noise.par.harmonicgain = 0.5
noise.par.harmonicoctaves = 4
\`\`\`
`;
    
    await fs.writeFile(
      path.join(TD_DOCS_PATH, 'operators/TOP/noise_top.md'),
      sampleOperatorDoc
    );
    console.log('✅ Created sample operator documentation');
    
    // Create a sample tutorial
    const sampleTutorial = `# Creating Audio-Reactive Visuals

## Introduction
This tutorial will guide you through creating audio-reactive visuals in TouchDesigner.

## Prerequisites
- Basic understanding of TouchDesigner interface
- Audio input device or audio file

## Steps

### 1. Audio Input Setup
1. Create an **Audio Device In CHOP** or **Audio File In CHOP**
2. Set the device to your audio input
3. Monitor the audio levels in the CHOP viewer

### 2. Audio Analysis
1. Add an **Analyze CHOP** after your audio input
2. Set Function to "RMS Power" for overall volume
3. Add an **Audio Spectrum CHOP** for frequency analysis

### 3. Visual Generation
1. Create a **Circle SOP** for the base geometry
2. Add a **Noise TOP** for texture
3. Create a **Render TOP** to render the geometry

### 4. Connect Audio to Visuals
1. Use a **CHOP to SOP** to drive circle radius with RMS
2. Reference spectrum data to drive noise parameters
3. Map frequency bands to color channels

### 5. Fine-tuning
- Add **Lag CHOP** for smoother motion
- Use **Math CHOP** to scale values appropriately
- Add **Feedback TOP** for trails effect

## Advanced Techniques
- Use multiple frequency bands for complex reactions
- Implement beat detection with **Beat CHOP**
- Create particle systems driven by audio
- Add post-processing effects

## Performance Optimization
- Limit resolution to necessary size
- Use instancing for multiple objects
- Cache static elements
- Monitor GPU usage
`;
    
    await fs.writeFile(
      path.join(TD_DOCS_PATH, 'tutorials/audio_reactive_visuals.md'),
      sampleTutorial
    );
    console.log('✅ Created sample tutorial');
    
    // Create embedding metadata
    const metadata = {
      version: '1.0.0',
      created: new Date().toISOString(),
      touchdesignerVersion: '2023.11290',
      totalDocuments: 0,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(TD_DOCS_PATH, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    console.log('✅ Created metadata file');
    
    console.log('\n✨ Documentation structure initialized successfully!');
    console.log(`📁 Documentation directory: ${path.resolve(TD_DOCS_PATH)}`);
    console.log('\nNext steps:');
    console.log('1. Add your TouchDesigner documentation files to the appropriate directories');
    console.log('2. Run `npm run embed-docs` to generate vector embeddings');
    console.log('3. Start the MCP server to use documentation-aware tools');
    
  } catch (error) {
    console.error('❌ Error initializing documentation structure:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDocumentationStructure();