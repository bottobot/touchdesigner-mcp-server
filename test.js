// Simple test script for TD-MCP
import { spawn } from 'child_process';

console.log('Testing TD-MCP Server...\n');

// Start the server
const server = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send a test request after server starts
setTimeout(() => {
  const testRequest = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "list_operators",
      arguments: {
        category: "CHOP"
      }
    },
    id: 1
  };
  
  console.log('Sending test request:', JSON.stringify(testRequest, null, 2));
  server.stdin.write(JSON.stringify(testRequest) + '\n');
}, 2000);

// Handle server output
server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server error:', data.toString());
});

// Clean exit after 5 seconds
setTimeout(() => {
  console.log('\nTest complete.');
  server.kill();
  process.exit(0);
}, 5000);