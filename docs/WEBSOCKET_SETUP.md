# TouchDesigner WebSocket Setup Guide

## Overview

The TouchDesigner MCP Server uses WebSocket communication to send commands and receive data from TouchDesigner in real-time. This guide provides comprehensive instructions for setting up the WebSocket connection.

## Why WebSocket?

WebSocket provides:
- **Real-time bidirectional communication** between the MCP server and TouchDesigner
- **Low latency** for responsive control
- **JSON message format** for structured data exchange
- **Persistent connection** that stays active during your session

## Prerequisites

- TouchDesigner installed and running
- MCP server configured with correct `TD_WEBSOCKET_PORT` (default: 9980)
- Basic understanding of TouchDesigner's node-based interface

## Step-by-Step Setup

### 1. Add WebSocket DAT to Your Project

1. Open TouchDesigner
2. Create a new project or open an existing one
3. Press `Tab` to open the operator palette
4. Type "websocket" in the search
5. Select `WebSocket DAT` and place it in your network

### 2. Configure WebSocket DAT Parameters

Click on the WebSocket DAT and configure these parameters:

| Parameter Tab | Setting | Value | Description |
|--------------|---------|--------|-------------|
| **WebSocket** | Network Type | `Server` | Makes TD listen for incoming connections |
| | Network Port | `9980` | Must match your MCP server configuration |
| | Active | `On` | Enables the WebSocket server |
| **Received Data** | Format | `Text` | For JSON message exchange |
| | Row/Callback Format | `One Per Message` | Each message as separate row |
| **Connection** | Auto-reconnect | `On` | Handles connection drops gracefully |

### 3. Save Your Project

**Important**: Save your TouchDesigner project after adding the WebSocket DAT. The server configuration will persist with your project.

## Verifying the Connection

### In TouchDesigner:
- The WebSocket DAT info will show connection status
- When connected, you'll see the client IP address
- The `numClients` info channel will show `1` when MCP server is connected

### In MCP Server Terminal:
- Look for "WebSocket connected successfully!" message
- Connection errors will stop appearing
- The server will show "Ready to send commands to TouchDesigner"

## Basic Message Handling

### Receiving Messages in TouchDesigner

1. **Add a DAT Execute**:
   - Create a `DAT Execute` operator
   - Connect it to the WebSocket DAT's output
   
2. **Parse JSON Messages**:
   ```python
   import json
   
   def onTableChange(dat):
       # Get the latest message
       if dat.numRows > 0:
           message = dat[0, 0].val
           try:
               data = json.loads(message)
               command = data.get('command', '')
               params = data.get('params', {})
               
               # Handle different commands
               if command == 'create_node':
                   # Create node logic here
                   pass
               elif command == 'update_parameter':
                   # Update parameter logic here
                   pass
                   
           except json.JSONDecodeError:
               print(f"Invalid JSON: {message}")
   ```

### Sending Messages from TouchDesigner

To send status updates or data back to the MCP server:

```python
# In a Text DAT or Script
import json

# Get reference to WebSocket DAT
ws = op('websocket1')

# Create message
message = json.dumps({
    'type': 'status',
    'data': {
        'fps': project.cookRate,
        'cpu': project.cpuMemory,
        'gpu': project.gpuMemoryUsed
    }
})

# Send to all connected clients
ws.sendText(message)
```

## Advanced Setup

### Error Handling

Add error handling to your WebSocket DAT:

1. Create a `DAT Execute` for the WebSocket DAT
2. Implement error callbacks:

```python
def onConnect(dat, peer):
    print(f"Client connected: {peer}")
    
def onDisconnect(dat, peer):
    print(f"Client disconnected: {peer}")
    
def onReceiveText(dat, rowIndex, message, peer):
    print(f"Received from {peer}: {message}")
    
def onError(dat, error):
    print(f"WebSocket error: {error}")
```

### Message Router

Create a comprehensive message routing system:

```python
# In a Script or Extension
class MessageRouter:
    def __init__(self, websocket_dat):
        self.ws = websocket_dat
        self.handlers = {}
        
    def register_handler(self, command, handler):
        self.handlers[command] = handler
        
    def process_message(self, message_json):
        try:
            data = json.loads(message_json)
            command = data.get('command')
            
            if command in self.handlers:
                result = self.handlers[command](data.get('params', {}))
                self.send_response(command, result)
            else:
                self.send_error(f"Unknown command: {command}")
                
        except Exception as e:
            self.send_error(str(e))
            
    def send_response(self, command, data):
        response = json.dumps({
            'type': 'response',
            'command': command,
            'data': data
        })
        self.ws.sendText(response)
        
    def send_error(self, error):
        response = json.dumps({
            'type': 'error',
            'error': error
        })
        self.ws.sendText(response)
```

## Troubleshooting

### Connection Refused Errors

If you see `ECONNREFUSED` errors in the MCP server:

1. **Check WebSocket DAT is Active**: Ensure `Active` parameter is `On`
2. **Verify Port Number**: Confirm port matches between TD and MCP server
3. **Check Firewall**: Ensure port 9980 is not blocked
4. **Save Project**: WebSocket configuration must be saved in your .toe file

### Connection Drops

If connection drops frequently:

1. Enable `Auto-reconnect` in WebSocket DAT
2. Implement heartbeat/ping messages
3. Check for network stability issues
4. Monitor TouchDesigner performance (high CPU can cause drops)

### Message Processing Issues

If messages aren't being processed:

1. Check `Format` is set to `Text` for JSON messages
2. Verify JSON validity with a JSON validator
3. Add debug print statements in your message handlers
4. Check TouchDesigner's textport for Python errors

## Best Practices

1. **Always Save**: Save your TD project after WebSocket setup
2. **Use JSON**: Stick to JSON format for structured data exchange
3. **Error Handling**: Implement comprehensive error handling
4. **Message Validation**: Validate incoming messages before processing
5. **Status Updates**: Send periodic status updates to MCP server
6. **Logging**: Log all commands for debugging and replay

## Example Projects

### Basic Setup
A minimal WebSocket server setup for receiving MCP commands:
- WebSocket DAT (server on port 9980)
- DAT Execute for message handling
- Text DAT for status display

### Advanced Integration
A production-ready setup with:
- Message router system
- Command queue processing
- Error handling and logging
- Bidirectional status updates
- Performance monitoring

## Security Considerations

1. **Local Only**: By default, WebSocket only accepts local connections
2. **Authentication**: Consider adding token-based authentication for production
3. **Input Validation**: Always validate and sanitize incoming commands
4. **Rate Limiting**: Implement rate limiting to prevent command flooding

## Performance Tips

1. **Batch Commands**: Send multiple operations in one message when possible
2. **Async Processing**: Use Python threading for heavy operations
3. **Message Size**: Keep messages under 1MB for optimal performance
4. **Connection Pooling**: Reuse connections rather than reconnecting

## Next Steps

Once your WebSocket connection is established:

1. Test with simple commands from the MCP server
2. Build custom handlers for your specific use cases
3. Implement bidirectional communication patterns
4. Create reusable components for common operations

For more information, see:
- [TouchDesigner Python Documentation](https://docs.derivative.ca/Python)
- [WebSocket DAT Documentation](https://docs.derivative.ca/WebSocket_DAT)
- [MCP Server API Documentation](../API.md)