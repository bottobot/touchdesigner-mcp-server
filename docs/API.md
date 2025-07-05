# TouchDesigner MCP Server API Documentation

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Tools Reference](#tools-reference)
- [Integration Guide](#integration-guide)
- [Examples](#examples)

## Overview

The TouchDesigner MCP Server provides 65+ tools for comprehensive TouchDesigner automation through the Model Context Protocol (MCP). This API documentation covers all available tools, their parameters, and usage examples.

## Installation

```bash
npm install touchdesigner-mcp-server
```

Or clone and build from source:
```bash
git clone https://github.com/yourusername/touchdesigner-mcp-server
cd touchdesigner-mcp-server
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# TouchDesigner Installation Path
TD_INSTALL_PATH=C:/Program Files/Derivative/TouchDesigner/bin

# Communication Ports
TD_OSC_PORT=7000
TD_WEBSOCKET_PORT=9980

# Project Paths
TD_PROJECT_PATH=C:/Users/username/Documents/touchdesigner-projects
TD_MEDIA_PATH=C:/Users/username/Documents/touchdesigner-media
TD_TEMPLATE_PATH=C:/Users/username/Documents/touchdesigner-templates

# Performance Settings
TD_GPU_MEMORY_LIMIT=4096
TD_MAX_THREADS=8
```

### MCP Configuration

Add to your `.roo/mcp.json`:

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "node",
      "args": ["C:/path/to/touchdesigner-mcp-server/dist/index.js"],
      "env": {
        "TD_INSTALL_PATH": "C:/Program Files/Derivative/TouchDesigner/bin"
      }
    }
  }
}
```

## Tools Reference

### Project Management Tools

#### td_create_project
Creates a new TouchDesigner project from a natural language prompt.

**Parameters:**
- `prompt` (string, required): Natural language description of the project
- `name` (string, required): Project name
- `path` (string, optional): Output directory
- `template` (string, optional): Template to use

**Example:**
```javascript
{
  "tool": "td_create_project",
  "arguments": {
    "prompt": "Create an audio-reactive particle system with warm colors",
    "name": "AudioParticles",
    "template": "vj-performance"
  }
}
```

#### td_open_project
Opens an existing TouchDesigner project.

**Parameters:**
- `path` (string, required): Path to the .toe file

**Example:**
```javascript
{
  "tool": "td_open_project",
  "arguments": {
    "path": "C:/projects/myproject.toe"
  }
}
```

### Visual Effects Tools

#### td_create_particle_system
Creates an advanced GPU particle system.

**Parameters:**
- `count` (number, required): Number of particles
- `emitterType` (string): "point", "line", "surface", "volume"
- `physics` (object): Physics settings
  - `gravity` (number): Gravity force
  - `wind` (object): Wind force vector
  - `turbulence` (number): Turbulence amount
- `rendering` (object): Rendering settings
  - `sprite` (string): Sprite texture path
  - `colorRamp` (array): Color gradient points
  - `sizeOverLife` (array): Size animation curve

**Example:**
```javascript
{
  "tool": "td_create_particle_system",
  "arguments": {
    "count": 100000,
    "emitterType": "volume",
    "physics": {
      "gravity": -9.8,
      "wind": {"x": 2, "y": 0, "z": 0},
      "turbulence": 0.5
    },
    "rendering": {
      "colorRamp": [
        {"position": 0, "color": [1, 0.5, 0, 1]},
        {"position": 1, "color": [1, 0, 0, 0]}
      ]
    }
  }
}
```

#### td_create_shader
Creates a custom GLSL shader.

**Parameters:**
- `type` (string, required): "vertex", "fragment", "compute"
- `name` (string, required): Shader name
- `code` (string, optional): GLSL code
- `inputs` (array): Input uniforms
- `outputs` (array): Output variables

**Example:**
```javascript
{
  "tool": "td_create_shader",
  "arguments": {
    "type": "fragment",
    "name": "ChromaticAberration",
    "inputs": [
      {"name": "uAmount", "type": "float", "default": 0.01},
      {"name": "uTexture", "type": "sampler2D"}
    ]
  }
}
```

### Audio Tools

#### td_setup_audio_analysis
Configures advanced audio analysis.

**Parameters:**
- `source` (string, required): Audio input source
- `features` (array, required): Features to extract
  - "spectrum", "mfcc", "onset", "pitch", "loudness", "spectralCentroid"
- `fftSize` (number): FFT window size
- `smoothing` (number): Temporal smoothing (0-1)

**Example:**
```javascript
{
  "tool": "td_setup_audio_analysis",
  "arguments": {
    "source": "audio_in",
    "features": ["spectrum", "onset", "loudness"],
    "fftSize": 2048,
    "smoothing": 0.8
  }
}
```

### Hardware Integration Tools

#### td_setup_kinect
Configures Kinect sensor input.

**Parameters:**
- `version` (string, required): "v1", "v2", "azure"
- `streams` (array, required): Data streams to enable
  - "color", "depth", "infrared", "skeleton", "pointcloud"
- `resolution` (object): Stream resolutions
- `tracking` (object): Tracking settings

**Example:**
```javascript
{
  "tool": "td_setup_kinect",
  "arguments": {
    "version": "azure",
    "streams": ["color", "depth", "skeleton"],
    "resolution": {
      "color": "1920x1080",
      "depth": "640x576"
    },
    "tracking": {
      "maxBodies": 6,
      "smoothing": 0.5
    }
  }
}
```

#### td_setup_dmx
Configures DMX lighting control.

**Parameters:**
- `universe` (number, required): DMX universe number
- `interface` (string, required): Interface type
  - "artnet", "sacn", "usb", "enttec"
- `channels` (array): Channel mappings
- `fixtures` (array): Fixture definitions

**Example:**
```javascript
{
  "tool": "td_setup_dmx",
  "arguments": {
    "universe": 1,
    "interface": "artnet",
    "fixtures": [
      {
        "name": "LED_Par_1",
        "type": "rgb",
        "startChannel": 1,
        "channels": ["red", "green", "blue"]
      }
    ]
  }
}
```

### Network Communication Tools

#### td_setup_osc
Configures OSC communication.

**Parameters:**
- `port` (number, required): OSC port
- `protocol` (string): "udp" or "tcp"
- `addresses` (array): OSC addresses to listen for
- `outputs` (array): OSC output destinations

**Example:**
```javascript
{
  "tool": "td_setup_osc",
  "arguments": {
    "port": 7000,
    "protocol": "udp",
    "addresses": ["/td/play", "/td/stop", "/td/opacity/*"],
    "outputs": [
      {"host": "192.168.1.100", "port": 8000}
    ]
  }
}
```

#### td_setup_ndi
Configures NDI video streaming.

**Parameters:**
- `mode` (string, required): "send", "receive", or "both"
- `sources` (array): NDI sources to receive
- `name` (string): NDI sender name
- `resolution` (string): Output resolution
- `fps` (number): Frame rate

**Example:**
```javascript
{
  "tool": "td_setup_ndi",
  "arguments": {
    "mode": "send",
    "name": "TouchDesigner Output",
    "resolution": "1920x1080",
    "fps": 60
  }
}
```

### Machine Learning Tools

#### td_create_ml_pipeline
Creates a machine learning pipeline.

**Parameters:**
- `model` (string, required): Model type or path
- `inputs` (array, required): Input data sources
- `outputs` (array, required): Output destinations
- `preprocessing` (object): Preprocessing steps
- `postprocessing` (object): Postprocessing steps

**Example:**
```javascript
{
  "tool": "td_create_ml_pipeline",
  "arguments": {
    "model": "pose-detection",
    "inputs": ["video_in"],
    "outputs": ["skeleton_data"],
    "preprocessing": {
      "resize": [640, 480],
      "normalize": true
    }
  }
}
```

## Integration Guide

### Basic Integration

```javascript
// MCP Client Example
const mcp = require('@modelcontextprotocol/sdk');

async function createAudioVisualizer() {
  const client = new mcp.Client();
  await client.connect('touchdesigner');
  
  // Create project from prompt
  const project = await client.callTool('td_create_project', {
    prompt: 'Audio visualizer with reactive particles',
    name: 'MyVisualizer'
  });
  
  // Setup audio analysis
  await client.callTool('td_setup_audio_analysis', {
    source: 'audio_in',
    features: ['spectrum', 'onset'],
    fftSize: 1024
  });
  
  // Create particle system
  await client.callTool('td_create_particle_system', {
    count: 50000,
    emitterType: 'point'
  });
}
```

### Advanced Workflows

```javascript
// Multi-tool workflow for live performance
async function setupLivePerformance() {
  // Setup MIDI control
  await client.callTool('td_setup_midi', {
    device: 'APC40',
    mappings: [
      {control: 'fader1', parameter: '/opacity'},
      {control: 'knob1', parameter: '/blur/amount'}
    ]
  });
  
  // Setup Ableton Link sync
  await client.callTool('td_setup_ableton_link', {
    enabled: true,
    quantum: 4
  });
  
  // Configure multi-display output
  await client.callTool('td_create_mapping', {
    displays: [
      {name: 'Main', resolution: '1920x1080', position: [0, 0]},
      {name: 'Side', resolution: '1080x1920', position: [1920, 0]}
    ]
  });
  
  // Setup NDI output for streaming
  await client.callTool('td_setup_ndi', {
    mode: 'send',
    name: 'Performance Output'
  });
}
```

## Examples

### Example 1: Interactive Installation

```javascript
// Complete interactive installation setup
async function createInteractiveInstallation() {
  // Create base project
  await client.callTool('td_create_project', {
    prompt: 'Interactive wall with body tracking and particles',
    name: 'InteractiveWall',
    template: 'installation'
  });
  
  // Setup Kinect for body tracking
  await client.callTool('td_setup_kinect', {
    version: 'azure',
    streams: ['depth', 'skeleton'],
    tracking: {maxBodies: 10}
  });
  
  // Create reactive particle system
  await client.callTool('td_create_particle_system', {
    count: 200000,
    emitterType: 'surface',
    physics: {
      gravity: 0,
      attractors: 'skeleton_joints'
    }
  });
  
  // Add post-processing effects
  await client.callTool('td_create_effect_chain', {
    effects: [
      {type: 'bloom', intensity: 1.5},
      {type: 'chromatic_aberration', amount: 0.01},
      {type: 'vignette', amount: 0.3}
    ]
  });
  
  // Configure projection mapping
  await client.callTool('td_create_mapping', {
    type: 'projection',
    surfaces: [{
      name: 'wall',
      corners: [[0,0], [1920,0], [1920,1080], [0,1080]]
    }]
  });
}
```

### Example 2: VJ Performance System

```javascript
// Professional VJ setup with Ableton integration
async function setupVJSystem() {
  // Create multi-channel VJ system
  await client.callTool('td_create_project', {
    prompt: 'VJ system with 8 channels and effects',
    name: 'VJPerformance',
    template: 'vj-8channel'
  });
  
  // Setup Ableton Link
  await client.callTool('td_setup_ableton_link', {
    enabled: true
  });
  
  // Configure MIDI control
  await client.callTool('td_setup_midi', {
    device: 'AKAI APC40',
    mappings: generateVJMappings()
  });
  
  // Setup Spout output for Resolume
  await client.callTool('td_setup_spout', {
    name: 'TD_Output',
    resolution: '1920x1080',
    fps: 60
  });
  
  // Create audio-reactive effects
  for (let i = 1; i <= 8; i++) {
    await client.callTool('td_create_audio_visualizer', {
      channel: i,
      style: 'geometric',
      reactive: true
    });
  }
}
```

### Example 3: Data Visualization Dashboard

```javascript
// Real-time data visualization
async function createDataDashboard() {
  // Create dashboard project
  await client.callTool('td_create_project', {
    prompt: 'Real-time data dashboard with 3D charts',
    name: 'DataViz',
    template: 'dashboard'
  });
  
  // Setup data sources
  await client.callTool('td_setup_tcpip', {
    mode: 'client',
    host: 'data.server.com',
    port: 5000,
    format: 'json'
  });
  
  // Create visualizations
  await client.callTool('td_create_data_visualization', {
    type: '3d-scatter',
    dataSource: 'tcp_in',
    axes: {
      x: 'timestamp',
      y: 'value',
      z: 'category'
    }
  });
  
  // Add UI controls
  await client.callTool('td_create_ui', {
    controls: [
      {type: 'slider', parameter: 'timeRange'},
      {type: 'dropdown', parameter: 'dataSource'},
      {type: 'button', action: 'export'}
    ]
  });
  
  // Setup auto-export
  await client.callTool('td_export_movie', {
    path: 'exports/dashboard_%date%.mov',
    codec: 'ProRes',
    fps: 30,
    duration: 60,
    schedule: 'hourly'
  });
}
```

## Error Handling

All tools return consistent error responses:

```javascript
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Parameter 'count' must be a positive integer",
    "details": {
      "parameter": "count",
      "provided": -100,
      "expected": "positive integer"
    }
  }
}
```

Common error codes:
- `TOUCHDESIGNER_NOT_FOUND`: TouchDesigner installation not found
- `INVALID_PARAMETER`: Invalid parameter provided
- `CONNECTION_FAILED`: Failed to connect to TouchDesigner
- `RESOURCE_UNAVAILABLE`: Required resource not available
- `OPERATION_FAILED`: Operation failed to complete

## Performance Considerations

1. **Batch Operations**: Use batch tools when possible
2. **Async Processing**: All tools support async operation
3. **Resource Management**: Monitor GPU memory with performance tools
4. **Network Optimization**: Use appropriate protocols for your use case

## Best Practices

1. **Project Organization**: Use consistent naming and folder structure
2. **Version Control**: Enable Git integration for projects
3. **Performance Monitoring**: Regular profiling with built-in tools
4. **Modular Design**: Create reusable components with TOX export
5. **Documentation**: Use the built-in documentation generator

## Support

- GitHub Issues: https://github.com/yourusername/touchdesigner-mcp-server/issues
- Documentation: https://touchdesigner-mcp.readthedocs.io
- Discord: https://discord.gg/touchdesigner-mcp