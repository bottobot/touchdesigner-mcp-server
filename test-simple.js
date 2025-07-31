// Simple test to verify the TD-MCP server is working
// Run this after starting the server with: node index.js

console.log('TD-MCP Simple Test');
console.log('==================');
console.log('This test assumes the TD-MCP server is already running.');
console.log('');
console.log('To test the server functionality:');
console.log('1. Make sure the server is running: node index.js');
console.log('2. Use an MCP client (like VSCode with MCP extension) to connect');
console.log('3. Call the following tools:');
console.log('');
console.log('Test 1 - Get a specific operator:');
console.log('  Tool: get_operator');
console.log('  Arguments: { "name": "Noise CHOP" }');
console.log('');
console.log('Test 2 - List all operators:');
console.log('  Tool: list_operators');
console.log('  Arguments: {}');
console.log('');
console.log('Test 3 - List operators by category:');
console.log('  Tool: list_operators');
console.log('  Arguments: { "category": "SOP" }');
console.log('');
console.log('Test 4 - Search for operators:');
console.log('  Tool: search_operators');
console.log('  Arguments: { "query": "particle" }');
console.log('');
console.log('Test 5 - Search with category filter:');
console.log('  Tool: search_operators');
console.log('  Arguments: { "query": "3D", "category": "COMP" }');
console.log('');
console.log('The server should return rich metadata including:');
console.log('- Operator name and category');
console.log('- Description');
console.log('- Subcategory (if applicable)');
console.log('- Keywords and aliases');
console.log('- Use cases');
console.log('- Related operators');