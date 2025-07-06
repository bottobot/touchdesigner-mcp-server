# TouchDesigner MCP Server v2.0 🎨✨

The most comprehensive MCP (Model Context Protocol) server for TouchDesigner, featuring **65+ tools** that enable AI-powered project generation, real-time control, and complete workflow automation. Create perfect TouchDesigner projects from natural language prompts!

## 🚀 Features

### 🎯 Core Capabilities

- **AI-Powered Project Generation**: Create complete `.toe` files from natural language descriptions
- **Real-time Control**: OSC, WebSocket, MIDI, DMX, and more
- **Media Processing**: Automatic optimization for all media types
- **Performance Monitoring**: Advanced profiling and optimization
- **Template System**: Professional templates for any use case
- **Complete Hardware Integration**: From Kinect to VR to lasers

### 🛠️ 65+ Available Tools

#### 📁 Project & File Management
- `td_create_project` - Generate complete projects from prompts
- `td_open_project` - Open existing projects
- `td_generate_from_prompt` - Generate node networks
- `td_export_movie` - Export high-quality movies
- `td_export_tox` - Create reusable components
- `td_capture_frame` - Capture still images
- `td_export_point_cloud` - Export 3D data
- `td_manage_presets` - Save/load parameter presets
- `td_git_operation` - Version control integration

#### 🎨 Visual & Effects
- `td_create_shader` - Custom GLSL shaders
- `td_create_effect_chain` - Chain visual effects
- `td_create_visualizer` - Audio visualizers
- `td_create_text_effect` - Advanced text animations
- `td_create_time_effect` - Time-based effects
- `td_create_lut` - Color lookup tables
- `td_create_compute_shader` - GPU compute shaders
- `td_create_particle_system` - Advanced particle systems
- `td_create_mapping` - Projection/LED mapping

#### 🎵 Audio & Music
- `td_setup_osc` - OSC communication
- `td_send_osc` - Send OSC messages
- `td_setup_midi` - MIDI input/output
- `td_send_midi` - Send MIDI messages
- `td_setup_ableton_link` - Tempo sync
- `td_create_audio_filter` - Audio processing
- `td_setup_audio_analysis` - Advanced analysis
- `td_analyze_audio` - Extract audio features

#### 🎮 Input Devices & Sensors
- `td_setup_kinect` - Kinect v1/v2/Azure
- `td_setup_leap_motion` - Hand tracking
- `td_setup_video_input` - Camera devices
- `td_setup_serial` - Arduino/microcontrollers
- `td_setup_oculus_hand_tracking` - VR hand tracking
- `td_setup_motion_capture` - Professional mocap
- `td_setup_haptic` - Haptic feedback

#### 🌐 Networking & Communication
- `td_websocket_command` - WebSocket control
- `td_setup_tcpip` - TCP/IP networking
- `td_setup_ndi` - NDI video streaming
- `td_setup_spout` - GPU texture sharing
- `td_setup_webrtc` - WebRTC streaming
- `td_network_sync` - Multi-machine sync
- `td_setup_render_network` - Distributed rendering

#### 💡 Lighting & Output
- `td_setup_dmx` - DMX lighting control
- `td_send_dmx` - Control DMX channels
- `td_setup_laser_control` - Laser projection

#### 🎭 3D & Geometry
- `td_create_geometry` - 3D primitives
- `td_create_instancing` - Geometry instancing
- `td_setup_vr` - VR headset configuration

#### 📊 Data & Visualization
- `td_create_data_visualization` - Data viz tools
- `td_manage_variables` - TouchDesigner variables
- `td_create_ml_pipeline` - Machine learning

#### 🔧 Development & Scripting
- `td_execute_python` - Run Python scripts
- `td_manage_scripts` - Script management
- `td_create_custom_operator` - Custom operators
- `td_manage_extensions` - Extension management
- `td_debug_operator` - Performance debugging
- `td_batch_process` - Batch operations

#### 🎬 Media Processing
- `td_import_media` - Smart media import
- `td_optimize_media` - Media optimization

#### ⏱️ Timeline & Animation
- `td_animate_parameter` - Keyframe animation
- `td_manage_timeline` - Timeline control

#### 🖥️ UI & Controls
- `td_create_ui` - Generate UI elements
- `td_create_component` - Custom components
- `td_manage_palette` - Palette management

#### 📈 Monitoring & Analysis
- `td_get_performance` - Performance metrics
- `td_analyze_project` - Project analysis

## 📦 Installation

1. **Clone the repository:**
```bash
cd code_projects/touchdesigner-mcp-server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

4. **Configure environment variables:**
Create a `.env` file:
```env
TD_INSTALL_PATH=C:/Program Files/Derivative/TouchDesigner/bin
TD_OSC_PORT=7000
TD_WEBSOCKET_PORT=9980
TD_PROJECT_PATH=C:/Users/talla/Documents/touchdesigner-projects
TD_MEDIA_PATH=C:/Users/talla/Documents/touchdesigner-media
```

## 🔧 MCP Configuration

The server is already configured in your `.roo/mcp.json`. To activate it:

1. Install dependencies and build (see above)
2. Reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")
3. The TouchDesigner tools will be available in Roo Cline!

## 🔌 TouchDesigner WebSocket Setup

The MCP server communicates with TouchDesigner via WebSocket on port 9980. **TouchDesigner doesn't provide a WebSocket server by default** - you need to manually set it up:

### Quick Setup Steps

1. **Open TouchDesigner**
2. **Add a WebSocket DAT**:
   - Press `Tab` → type "websocket" → select `WebSocket DAT`
3. **Configure as Server**:
   - Set `Network Type` to `Server`
   - Set `Network Port` to `9980`
   - Turn `Active` to `On`
4. **Save your project** - The WebSocket server is now ready!

### Detailed WebSocket DAT Configuration

| Parameter | Value | Description |
|-----------|--------|-------------|
| **Network Type** | `Server` | Makes TD listen for connections |
| **Network Port** | `9980` | Must match TD_WEBSOCKET_PORT in .env |
| **Active** | `On` | Enables the WebSocket server |
| **Format** | `Text` | For JSON message exchange |
| **Auto-reconnect** | `On` | Handles connection drops |

### Testing the Connection

Once configured, the MCP server will automatically connect and the error messages will stop. You'll see:
- "WebSocket connected successfully!" in the MCP server terminal
- Connection status in the WebSocket DAT info

### Advanced Setup (Optional)

For production environments, you may want to:
- Add error handling with a `DAT Execute` connected to the WebSocket DAT
- Parse incoming JSON messages with a `JSON DAT`
- Route commands to different parts of your project
- Send status updates back to the MCP server
📚 **[Full WebSocket Setup Documentation](docs/WEBSOCKET_SETUP.md)** - Detailed guide with code examples, troubleshooting, and best practices

## 🎨 Usage Examples

### Create Complex Projects
```
"Create an audio-reactive particle system with warm colors that responds to bass frequencies, includes Kinect interaction, and outputs to both a projection mapping setup and NDI stream"
```

### Professional VJ Setup
```
"Build a complete VJ performance system with 8 channels, MIDI control from Ableton, beat-synced effects, and Spout output to Resolume"
```

### Interactive Installation
```
"Design an interactive art installation using Azure Kinect body tracking, real-time particle effects that follow visitors, generative soundscapes, and DMX-controlled lighting that responds to movement"
```

### Data Visualization Dashboard
```
"Create a real-time data visualization dashboard that connects to a SQL database, displays live analytics with animated 3D charts, includes weather data integration, and exports reports as movies"
```

### AI-Powered Generative Art
```
"Generate a machine learning-powered generative art system that analyzes incoming video, creates style transfer effects, and outputs to multiple 4K displays with frame synchronization"
```

## 🏗️ Architecture

### Comprehensive Feature Coverage
- **65+ MCP Tools** covering every aspect of TouchDesigner
- **Natural Language Understanding** for intuitive project creation
- **Hardware Abstraction** for seamless device integration
- **Performance Optimization** built into every operation
- **Professional Workflow** tools for production environments

### Integration Capabilities
- **OSC** - Open Sound Control
- **MIDI** - Musical Instrument Digital Interface
- **DMX** - Digital Multiplex lighting
- **NDI** - Network Device Interface
- **Spout/Syphon** - GPU texture sharing
- **WebSocket** - Real-time bidirectional communication
- **WebRTC** - Video streaming
- **TCP/IP** - Network protocols
- **Serial** - Hardware communication
- **Ableton Link** - Tempo synchronization

### Supported Hardware
- **Sensors**: Kinect v1/v2/Azure, Leap Motion, RealSense
- **VR**: Oculus, Vive, Index, Pico
- **Motion Capture**: OptiTrack, Vicon, Xsens
- **Controllers**: MIDI devices, OSC controllers, game controllers
- **Lighting**: DMX, ArtNet, sACN
- **Lasers**: EtherDream, Helios, LaserOS
- **Microcontrollers**: Arduino, ESP32, Raspberry Pi

## 🚀 Advanced Capabilities

### AI Integration
- Natural language to node network generation
- Intelligent parameter optimization
- Pattern recognition for common workflows
- Automatic performance optimization

### Professional Features
- Multi-machine synchronization
- Distributed rendering
- Git integration
- Performance profiling
- Automated testing
- Documentation generation

### Creative Tools
- GPU particle systems with physics
- Compute shader support
- Machine learning pipelines
- Projection mapping
- LED mapping
- Audio analysis and visualization
- Time-based effects

## 🛡️ Best Practices

1. **Start Simple**: Use templates for common setups
2. **Optimize Early**: Use performance monitoring tools
3. **Modular Design**: Create reusable components
4. **Version Control**: Use Git integration for projects
5. **Document**: Generate documentation for complex setups

## 🤝 Contributing

This server represents the most comprehensive TouchDesigner automation toolkit available. Contributions welcome for:
- Additional hardware support
- New effect templates
- Performance optimizations
- Documentation improvements

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- TouchDesigner by Derivative
- MCP SDK by Anthropic
- Built with TypeScript and Node.js

---

**Note**: This server requires TouchDesigner to be installed on your system. It provides comprehensive automation and control but does not replace the TouchDesigner application itself.