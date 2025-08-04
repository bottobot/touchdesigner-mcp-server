// TD-MCP v2.0 - List Operators Tool
// Simple tool implementation following Claude.md principles

import { z } from "zod";

// Tool schema
export const schema = {
  title: "List TouchDesigner Operators",
  description: "List available TouchDesigner operators with contextual grouping",
  inputSchema: {
    category: z.string().optional().describe("Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP, POP)")
  }
};

// Tool handler
export async function handler({ category }, { operators }) {
  const results = [];
  
  for (const [name, operator] of operators) {
    if (!category || operator.category === category.toUpperCase()) {
      results.push(operator);
    }
  }
  
  if (results.length === 0) {
    return {
      content: [{
        type: "text",
        text: category ? `No operators found in category '${category}'.` : "No operators found."
      }]
    };
  }
  
  results.sort((a, b) => a.name.localeCompare(b.name));
  
  let text = `Found ${results.length} operators`;
  if (category) {
    text += ` in ${category.toUpperCase()} category`;
  }
  text += `:\n\n`;
  
  // Simple list, first 20 results
  results.slice(0, 20).forEach(op => {
    text += `- ${op.name}\n`;
  });
  
  if (results.length > 20) {
    text += `... and ${results.length - 20} more\n`;
  }
  
  return {
    content: [{
      type: "text",
      text
    }]
  };
}