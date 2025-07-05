# TouchDesigner MCP Server Architecture

## Overview

The TouchDesigner MCP Server is built with a modular, event-driven architecture that provides comprehensive automation and control capabilities for TouchDesigner through the Model Context Protocol (MCP).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client (Roo Cline)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ MCP Protocol
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TouchDesigner MCP Server                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Core Services                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │  Tool    │  │  Schema  │  │  Error   │  │  Config  │  │ │
│  │  │ Handler  │  │Validator │  │ Handler  │  │  Manager │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Tool Categories                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ Project  │  │  Visual  │  │  Audio   │  │ Hardware │  │ │
│  │  │  Tools   │  │  Tools   │  │  Tools   │  │  Tools   │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ Network  │  │   Data   │  │   Dev    │  │   Media  │  │ │
│  │  │  Tools   │  │  Tools   │  │  Tools   │  │  Tools   │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Utility Modules                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │   TOE    │  │   Node   │  │    AI    │  │   OSC    │  │ │
│  │  │Generator │  │ Library  │  │  Parser  │  │ Manager  │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │WebSocket │  │  Media   │  │ Template │  │Performance│ │ │
│  │  │ Manager  │  │Processor │  │  Engine  │  │ Monitor  │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Multiple Protocols
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        TouchDesigner                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   OSC    │  │WebSocket │  │   TCP    │  │  Python  │       │
│  │ Receiver │  │ Server   │  │  Server  │  │ Scripts  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MCP Server Core (`src/index.ts`)
The main entry point that:
- Initializes the MCP server with 65+ tools
- Handles tool registration and schema validation
- Routes tool requests to appropriate handlers
- Manages server lifecycle

### 2. Tool Categories

#### Project Management Tools
- **td_create_project**: AI-powered project generation
- **td_open_project**: Project file management
- **td_export_***: Various export formats (movie, TOX, images)

#### Visual Effects Tools
- **td_create_shader**: GLSL shader creation
- **td_create_particle_system**: GPU particle systems
- **td_create_effect_chain**: Effect composition

#### Audio Tools
- **td_setup_audio_analysis**: Advanced audio feature extraction
- **td_create_audio_visualizer**: Audio-reactive visuals
- **td_setup_ableton_link**: Tempo synchronization

#### Hardware Integration
- **td_setup_kinect**: Kinect sensor integration
- **td_setup_dmx**: DMX lighting control
- **td_setup_midi**: MIDI device integration

#### Network Communication
- **td_setup_osc**: OSC protocol
- **td_websocket_command**: WebSocket control
- **td_setup_ndi**: NDI video streaming

### 3. Utility Modules

#### TOE Generator (`src/generators/TOEGenerator.ts`)
Generates TouchDesigner project files:
- XML-based project structure
- Node creation and layout
- Connection management
- Parameter configuration

#### Node Library (`src/utils/NodeLibrary.ts`)
Complete TouchDesigner operator reference:
- All operator types (TOP, CHOP, SOP, DAT, MAT, COMP)
- Parameter specifications
- Connection rules
- Default values

#### AI Prompt Parser (`src/utils/AIPromptParser.ts`)
Natural language processing:
- Intent recognition
- Parameter extraction
- Style interpretation
- Template matching

#### Communication Managers
- **OSCManager**: Bidirectional OSC communication
- **WebSocketManager**: Real-time WebSocket control
- **TCP/IP**: Network protocol handling

## Data Flow

### 1. Request Processing
```
MCP Client Request
    ↓
Tool Schema Validation
    ↓
Parameter Extraction
    ↓
Handler Selection
    ↓
Utility Module Invocation
    ↓
TouchDesigner Communication
    ↓
Response Generation
    ↓
MCP Client Response
```

### 2. Project Generation Flow
```
Natural Language Prompt
    ↓
AI Prompt Parser
    ↓
Template Selection
    ↓
Node Graph Generation
    ↓
Parameter Configuration
    ↓
TOE File Creation
    ↓
Project Launch
```

### 3. Real-time Control Flow
```
Control Command
    ↓
Protocol Selection (OSC/WebSocket/TCP)
    ↓
Message Formatting
    ↓
Network Transmission
    ↓
TouchDesigner Processing
    ↓
Feedback Response
```

## Design Patterns

### 1. Command Pattern
Each tool is implemented as a command with:
- Schema validation
- Parameter processing
- Execution logic
- Response formatting

### 2. Factory Pattern
Node creation uses factory methods:
- Operator type selection
- Parameter initialization
- Connection establishment

### 3. Observer Pattern
Real-time communication uses observers:
- OSC message listeners
- WebSocket event handlers
- Performance monitors

### 4. Strategy Pattern
Multiple communication strategies:
- Protocol selection based on use case
- Adaptive parameter optimization
- Performance-based routing

## Performance Considerations

### 1. Asynchronous Operations
- All network operations are async
- Non-blocking file I/O
- Concurrent request handling

### 2. Resource Management
- GPU memory monitoring
- Thread pool management
- Connection pooling

### 3. Caching
- Template caching
- Node library indexing
- Connection state caching

### 4. Optimization Strategies
- Batch operations for multiple nodes
- Lazy loading of resources
- Efficient XML generation

## Security

### 1. Input Validation
- Schema-based validation
- Parameter sanitization
- Path traversal prevention

### 2. Network Security
- Configurable port binding
- IP whitelisting support
- Rate limiting

### 3. File System Safety
- Sandboxed file operations
- Permission checking
- Safe path resolution

## Extensibility

### 1. Adding New Tools
```typescript
// 1. Define schema
const NewToolSchema = z.object({
  param1: z.string(),
  param2: z.number()
});

// 2. Add to tool list
server.addTool({
  name: 'td_new_tool',
  description: 'Description',
  inputSchema: NewToolSchema
});

// 3. Implement handler
case 'td_new_tool': {
  const params = NewToolSchema.parse(args);
  // Implementation
}
```

### 2. Custom Operators
- Extend NodeLibrary
- Add parameter definitions
- Update connection rules

### 3. Protocol Extensions
- Implement new communication protocols
- Add to protocol factory
- Update routing logic

## Error Handling

### 1. Error Categories
- **ValidationError**: Invalid parameters
- **CommunicationError**: Network failures
- **TouchDesignerError**: TD-specific errors
- **SystemError**: System-level failures

### 2. Error Recovery
- Automatic retry for network errors
- Graceful degradation
- State recovery mechanisms

### 3. Logging
- Structured logging
- Performance metrics
- Debug information

## Testing Strategy

### 1. Unit Tests
- Tool schema validation
- Utility module functions
- Error handling

### 2. Integration Tests
- End-to-end workflows
- Protocol communication
- File generation

### 3. Performance Tests
- Load testing
- Memory usage
- Response times

## Deployment

### 1. Local Development
```bash
npm install
npm run dev
```

### 2. Production Build
```bash
npm run build
npm run start
```

### 3. Docker Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
CMD ["npm", "start"]
```

## Future Enhancements

### 1. Machine Learning
- Advanced pattern recognition
- Predictive parameter optimization
- Style transfer capabilities

### 2. Cloud Integration
- Remote rendering
- Distributed processing
- Cloud storage backends

### 3. Advanced Visualization
- Ray tracing support
- AI-generated shaders
- Procedural texture generation

### 4. Collaboration Features
- Multi-user sessions
- Real-time synchronization
- Version control integration

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Code style
- Testing requirements
- Pull request process
- Documentation standards

## License

MIT License - See [LICENSE](../LICENSE) for details.