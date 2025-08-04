import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("Starting TD-MCP test client...");
  
  const transport = new StdioClientTransport({
    command: "node",
    args: [join(__dirname, "index.js")],
  });

  const client = new Client({
    name: "td-mcp-test-client",
    version: "1.0.0",
  });

  try {
    await client.connect(transport);
    console.log("Connected to TD-MCP server!");

    console.log("\nTesting get_operator...");
    const op = await client.callTool({ name: "get_operator", arguments: { name: "Noise CHOP" } });
    console.log("Result:", JSON.stringify(op, null, 2));

    console.log("\nTesting list_operators...");
    const allOps = await client.callTool({ name: "list_operators", arguments: {} });
    console.log("Result:", JSON.stringify(allOps, null, 2).substring(0, 500) + "...");

    console.log("\nTesting list_operators with category...");
    const sops = await client.callTool({ name: "list_operators", arguments: { category: "SOP" } });
    console.log("Result:", JSON.stringify(sops, null, 2).substring(0, 500) + "...");

    console.log("\nTesting search_operators...");
    const searchResults = await client.callTool({ name: "search_operators", arguments: { query: "particle" } });
    console.log("Result:", JSON.stringify(searchResults, null, 2));

    console.log("\nTesting search_operators with category...");
    const searchResultsCat = await client.callTool({ name: "search_operators", arguments: { query: "3D", category: "COMP" } });
    console.log("Result:", JSON.stringify(searchResultsCat, null, 2));

    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await client.disconnect();
    console.log("Disconnected from server.");
  }
}

main().catch(console.error);