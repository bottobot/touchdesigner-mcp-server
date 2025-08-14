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
export async function handler({ category }, { operatorDataManager }) {
  if (!operatorDataManager) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  try {
    // Use operator data manager to list operators
    const listResults = await operatorDataManager.listOperators({
      category: category ? category.toUpperCase() : undefined
      // No limit - return all operators
    });
    
    const operators = listResults.operators || [];
    const categories = listResults.categories || [];
    
    if (operators.length === 0) {
      let text = category ? `No operators found in category '${category}'.` : "No operators found.";
      
      if (categories.length > 0) {
        text += `\n\n**Available categories:** ${categories.join(', ')}`;
      }
      
      return {
        content: [{
          type: "text",
          text
        }]
      };
    }
    
    let text = `# TouchDesigner Operators\n\n`;
    text += `Found **${listResults.total || operators.length}** operators`;
    if (category) {
      text += ` in **${category.toUpperCase()}** category`;
    }
    text += `:\n\n`;
    
    // Group by subcategory if available
    const grouped = {};
    operators.forEach(op => {
      const subcat = op.subcategory || 'General';
      if (!grouped[subcat]) grouped[subcat] = [];
      grouped[subcat].push(op);
    });
    
    // Display grouped results
    for (const [subcategory, ops] of Object.entries(grouped)) {
      if (Object.keys(grouped).length > 1) {
        text += `## ${subcategory}\n`;
      }
      
      ops.forEach(op => {
        text += `• **${op.name}**`;
        if (op.description) {
          const shortDesc = op.description.length > 100 ?
            op.description.substring(0, 100) + '...' :
            op.description;
          text += ` - ${shortDesc}`;
        }
        if (op.parameterCount) {
          text += ` (${op.parameterCount} params)`;
        }
        text += '\n';
      });
      text += '\n';
    }
    
    // No longer needed since we're returning all operators
    
    // Show available categories
    if (categories.length > 0) {
      text += `## Available Categories\n`;
      text += categories.map(cat => `• ${cat}`).join('\n');
      text += '\n';
    }
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
    
  } catch (error) {
    console.error('[List Tool] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Error listing operators: ${error.message || 'Unknown error occurred'}`
      }]
    };
  }
}