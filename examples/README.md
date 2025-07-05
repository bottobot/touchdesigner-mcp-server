# TouchDesigner MCP Server Examples

This directory contains practical examples demonstrating how to use the TouchDesigner MCP Server for various creative and technical applications.

## Quick Start

```javascript
const { TouchDesignerMCP } = require('touchdesigner-mcp-server');

// Initialize the MCP client
const td = new TouchDesignerMCP();
await td.connect();

// Create a simple project
await td.createProject({
  prompt: "Create a simple audio visualizer",
  name: "MyFirstVisualizer"
});
```

## Example Categories

### 🎨 [Creative Projects](./creative/)
- Audio visualizers
- Generative art
- Interactive installations
- VJ performance setups

### 🛠️ [Technical Workflows](./technical/)
- Multi-display setups
- Network streaming
- Hardware integration
- Performance optimization

### 📊 [Data Visualization](./dataviz/)
- Real-time dashboards
- 3D data representation
- IoT sensor visualization
- Financial data displays

### 🎮 [Interactive Experiences](./interactive/)
- Motion tracking applications
- Touch interfaces
- Game-like experiences
- AR/VR integrations

### 🎬 [Production Tools](./production/)
- Broadcast graphics
- Live event visuals
- Virtual production
- Content pipelines

## Running Examples

1. **Install Dependencies**
   ```bash
   cd examples
   npm install
   ```

2. **Configure Environment**
   Copy `.env.example` to `.env` and update paths:
   ```env
   TD_INSTALL_PATH=C:/Program Files/Derivative/TouchDesigner/bin
   TD_PROJECT_PATH=C:/TouchDesigner/Projects
   ```

3. **Run an Example**
   ```bash
   node creative/audio-visualizer.js
   ```

## Example Structure

Each example follows this structure:
- **Description**: What the example demonstrates
- **Requirements**: Hardware/software needed
- **Configuration**: Required settings
- **Code**: Complete implementation
- **Customization**: How to modify for your needs

## Featured Examples

### 1. Audio-Reactive Particle System
Creates a stunning particle system that responds to music in real-time.
```javascript
// See creative/audio-particles.js
await td.createProject({
  prompt: "Audio-reactive particle system with warm colors",
  name: "AudioParticles"
});
```

### 2. Multi-Screen Installation
Sets up a synchronized multi-display system for installations.
```javascript
// See technical/multi-display.js
await td.setupMultiDisplay({
  displays: 4,
  resolution: "1920x1080",
  sync: "framelock"
});
```

### 3. Live Performance VJ System
Professional VJ setup with MIDI control and effects.
```javascript
// See creative/vj-system.js
await td.createVJSystem({
  channels: 8,
  midi: "APC40",
  output: "spout"
});
```

### 4. IoT Sensor Dashboard
Real-time visualization of IoT sensor data.
```javascript
// See dataviz/iot-dashboard.js
await td.createDashboard({
  dataSource: "mqtt",
  visualizations: ["line", "bar", "3d-scatter"]
});
```

### 5. Interactive Kinect Wall
Body-tracking interactive wall with particles.
```javascript
// See interactive/kinect-wall.js
await td.createInteractiveWall({
  sensor: "kinect-azure",
  effects: ["particles", "trails", "ripples"]
});
```

## Best Practices

1. **Error Handling**: Always wrap MCP calls in try-catch blocks
2. **Resource Management**: Monitor GPU memory usage
3. **Performance**: Use appropriate resolution and FPS settings
4. **Organization**: Keep projects modular with TOX components
5. **Version Control**: Enable Git integration for projects

## Troubleshooting

### Common Issues

**TouchDesigner Not Found**
```javascript
// Specify custom path
const td = new TouchDesignerMCP({
  installPath: "D:/TouchDesigner/bin"
});
```

**Connection Failed**
```javascript
// Increase timeout for slower systems
const td = new TouchDesignerMCP({
  timeout: 30000
});
```

**Performance Issues**
```javascript
// Optimize for your hardware
await td.setPerformance({
  gpuMemoryLimit: 2048,
  cpuThreads: 4
});
```

## Contributing Examples

We welcome new examples! To contribute:

1. Create a new example in the appropriate category
2. Follow the existing structure
3. Include comprehensive comments
4. Test on multiple systems
5. Submit a pull request

## Resources

- [TouchDesigner Documentation](https://docs.derivative.ca)
- [MCP Protocol Spec](https://modelcontextprotocol.io)
- [Community Forum](https://forum.derivative.ca)
- [Video Tutorials](https://youtube.com/TouchDesigner)

## License

All examples are MIT licensed and free to use in your projects.