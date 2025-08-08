// TD-MCP v2.0 - List Tutorials Tool
// Lists available TouchDesigner tutorials

import { z } from "zod";

// Tool schema
export const schema = {
  title: "List TouchDesigner Tutorials",
  description: "List available TouchDesigner tutorials with summaries",
  inputSchema: {
    search: z.string().optional().describe("Optional search term to filter tutorials"),
    limit: z.number().optional().describe("Maximum number of tutorials to return (default: all)"),
    show_details: z.boolean().optional().describe("Show detailed information for each tutorial")
  }
};

// Tool handler
export async function handler({ search, limit, show_details = false }, { wikiSystem }) {
  if (!wikiSystem) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  // Get all tutorials or search if term provided
  let tutorials;
  
  if (search) {
    // Use the searchAll method to search tutorials
    const results = await wikiSystem.searchAll(search, { limit: limit || 20 });
    tutorials = results.tutorials || [];
  } else {
    // Get all tutorials
    const result = await wikiSystem.listTutorials({ limit });
    tutorials = result.tutorials || [];
  }
  
  if (!tutorials || tutorials.length === 0) {
    return {
      content: [{
        type: "text",
        text: search 
          ? `No tutorials found matching "${search}".`
          : "No tutorials available."
      }]
    };
  }
  
  let text = search 
    ? `# TouchDesigner Tutorials matching "${search}"\n\n`
    : "# Available TouchDesigner Tutorials\n\n";
  
  text += `Found ${tutorials.length} tutorial${tutorials.length !== 1 ? 's' : ''}:\n\n`;
  
  // Format tutorial list
  tutorials.forEach((tutorial, index) => {
    text += `## ${index + 1}. ${tutorial.name || tutorial.displayName}\n`;
    
    if (tutorial.category) {
      text += `**Category:** ${tutorial.category}\n`;
    }
    
    if (tutorial.description) {
      text += `**Description:** ${tutorial.description}\n`;
    }
    
    if (show_details) {
      // Show additional details
      if (tutorial.sections !== undefined) {
        text += `**Sections:** ${tutorial.sections}\n`;
      }
      
      if (tutorial.contentItems !== undefined) {
        text += `**Content Items:** ${tutorial.contentItems}\n`;
      }
      
      if (tutorial.summary) {
        text += `**Summary:** ${tutorial.summary.substring(0, 200)}${tutorial.summary.length > 200 ? '...' : ''}\n`;
      }
      
      if (tutorial.keywords && tutorial.keywords.length > 0) {
        text += `**Keywords:** ${tutorial.keywords.slice(0, 10).join(', ')}\n`;
      }
    }
    
    text += '\n';
  });
  
  // Add usage instructions
  text += '---\n';
  text += '*Use the `get_tutorial` tool to view the full content of a specific tutorial.*\n';
  
  if (!search) {
    text += '*Use the search parameter to filter tutorials by keyword.*\n';
  }
  
  return {
    content: [{
      type: "text",
      text
    }]
  };
}