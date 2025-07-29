// Comprehensive test script for TouDocV4
import { spawn } from 'child_process';

console.log('Starting comprehensive TouDocV4 MCP Server tests...\n');

// Start the server
const server = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';

// Handle server output
server.stdout.on('data', (data) => {
  const output = data.toString();
  responseBuffer += output;
  
  // Check for complete JSON response
  if (output.includes('"jsonrpc":"2.0"')) {
    try {
      // Extract just the JSON part
      const jsonMatch = output.match(/\{.*"jsonrpc":"2.0".*\}/);
      if (jsonMatch) {
        const response = JSON.parse(jsonMatch[0]);
        console.log(`\nTest ${response.id} Response:`, JSON.stringify(response, null, 2).substring(0, 500) + '...\n');
      }
    } catch (e) {
      // Not a complete JSON response yet
    }
  } else {
    console.log('Server:', output.trim());
  }
});

server.stderr.on('data', (data) => {
  console.log('Server error:', data.toString());
});

// Run tests after server starts
setTimeout(async () => {
  // Test 1: list_operators with category filter
  console.log('=== Test 1: list_operators (CHOP category) ===');
  const test1 = {
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
  console.log('Request:', JSON.stringify(test1, null, 2));
  server.stdin.write(JSON.stringify(test1) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: get_operator
  console.log('\n=== Test 2: get_operator (Noise CHOP) ===');
  const test2 = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "get_operator",
      arguments: {
        name: "Noise CHOP"
      }
    },
    id: 2
  };
  console.log('Request:', JSON.stringify(test2, null, 2));
  server.stdin.write(JSON.stringify(test2) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: search_operators
  console.log('\n=== Test 3: search_operators (query: "audio") ===');
  const test3 = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "search_operators",
      arguments: {
        query: "audio"
      }
    },
    id: 3
  };
  console.log('Request:', JSON.stringify(test3, null, 2));
  server.stdin.write(JSON.stringify(test3) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 4: list_operators without category filter
  console.log('\n=== Test 4: list_operators (all categories) ===');
  const test4 = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "list_operators",
      arguments: {}
    },
    id: 4
  };
  console.log('Request:', JSON.stringify(test4, null, 2));
  server.stdin.write(JSON.stringify(test4) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 5: search_operators with category filter
  console.log('\n=== Test 5: search_operators (query: "noise", category: "TOP") ===');
  const test5 = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "search_operators",
      arguments: {
        query: "noise",
        category: "TOP"
      }
    },
    id: 5
  };
  console.log('Request:', JSON.stringify(test5, null, 2));
  server.stdin.write(JSON.stringify(test5) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\nAll tests complete. Shutting down server...');
  server.kill();
  process.exit(0);
}, 2000);

// Timeout after 15 seconds
setTimeout(() => {
  console.log('\nTest timeout. Shutting down...');
  server.kill();
  process.exit(1);
}, 15000);