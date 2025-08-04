// TD-MCP v2.0 - Enhanced Get Operator Tool
// Displays comprehensive operator information

import { z } from "zod";

// Tool schema
export const schema = {
  title: "Get TouchDesigner Operator",
  description: "Get comprehensive details about a specific TouchDesigner operator",
  inputSchema: {
    name: z.string().describe("Operator name (e.g., 'Noise CHOP', 'Kinect Azure TOP')"),
    show_examples: z.boolean().optional().describe("Show code examples and usage"),
    show_tips: z.boolean().optional().describe("Show tips and performance notes")
  }
};

// Tool handler
export async function handler({ name, show_examples = true, show_tips = true }, { findOperator }) {
  const operator = findOperator(name);
  
  if (!operator) {
    return {
      content: [{
        type: "text",
        text: `Operator '${name}' not found. Try searching with 'search_operators' tool.`
      }]
    };
  }
  
  let text = `# ${operator.fullName || operator.name}\n`;
  text += `**Category:** ${operator.category} | **Subcategory:** ${operator.subcategory || 'General'}\n\n`;
  
  // Description
  text += `## Description\n${operator.description || 'No description available.'}\n\n`;
  
  // Parameters - Show ALL with enhanced formatting
  if (operator.parameters && operator.parameters.length > 0) {
    text += `## Parameters (${operator.parameters.length} total)\n\n`;
    
    // Group parameters by type for better organization
    const paramsByType = {};
    operator.parameters.forEach(param => {
      const type = param.type || 'Other';
      if (!paramsByType[type]) paramsByType[type] = [];
      paramsByType[type].push(param);
    });
    
    for (const [type, params] of Object.entries(paramsByType)) {
      text += `### ${type} Parameters\n`;
      for (const param of params) {
        text += `• **${param.name}**`;
        if (param.label && param.label !== param.name) {
          text += ` (${param.label})`;
        }
        text += `: ${param.description || 'No description'}`;
        
        // Add range info if available
        if (param.range) {
          text += ` [Range: ${param.range.min} to ${param.range.max}]`;
        }
        
        // Add default value if available
        if (param.default) {
          text += ` (Default: ${param.default})`;
        }
        
        // Add options if available
        if (param.options && param.options.length > 0) {
          text += `\n  Options: ${param.options.join(', ')}`;
        }
        
        text += '\n';
      }
      text += '\n';
    }
  } else {
    text += `## Parameters\nNo parameters documented.\n\n`;
  }
  
  // Inputs/Outputs with detailed info
  if (operator.inputs && operator.inputs.length > 0) {
    text += `## Inputs\n`;
    operator.inputs.forEach((input, i) => {
      text += `${i + 1}. **${input.type}**: ${input.description || 'Standard input'}\n`;
    });
    text += '\n';
  }
  
  if (operator.outputs && operator.outputs.length > 0) {
    text += `## Outputs\n`;
    operator.outputs.forEach((output, i) => {
      text += `${i + 1}. **${output.type}**: ${output.description || 'Standard output'}\n`;
    });
    text += '\n';
  }
  
  // Use Cases
  if (operator.useCases && operator.useCases.length > 0) {
    text += `## Common Use Cases\n`;
    operator.useCases.forEach(useCase => {
      text += `• ${useCase}\n`;
    });
    text += '\n';
  }
  
  // Examples
  if (show_examples && operator.examples && operator.examples.length > 0) {
    text += `## Examples\n`;
    operator.examples.forEach(example => {
      text += `### ${example.title}\n`;
      text += `\`\`\`\n${example.content}\n\`\`\`\n\n`;
    });
  }
  
  // Code Snippets
  if (show_examples && operator.codeSnippets && operator.codeSnippets.length > 0) {
    text += `## Code Snippets\n`;
    operator.codeSnippets.forEach((snippet, i) => {
      text += `\`\`\`${snippet.language || 'python'}\n${snippet.code}\n\`\`\`\n\n`;
    });
  }
  
  // Tips and Notes
  if (show_tips && operator.tips && operator.tips.length > 0) {
    text += `## Tips & Notes\n`;
    operator.tips.forEach(tip => {
      text += `💡 ${tip}\n\n`;
    });
  }
  
  // Performance Notes
  if (show_tips && operator.performanceNotes && operator.performanceNotes.length > 0) {
    text += `## Performance Considerations\n`;
    operator.performanceNotes.forEach(note => {
      text += `⚡ ${note}\n\n`;
    });
  }
  
  // Keyboard Shortcuts
  if (operator.shortcuts && operator.shortcuts.length > 0) {
    text += `## Keyboard Shortcuts\n`;
    operator.shortcuts.forEach(shortcut => {
      text += `• **${shortcut.key}**: ${shortcut.description}\n`;
    });
    text += '\n';
  }
  
  // Related Operators
  if (operator.related && operator.related.length > 0) {
    text += `## Related Operators\n`;
    operator.related.forEach(rel => {
      text += `• [${rel.name}](${rel.url})\n`;
    });
    text += '\n';
  }
  
  // Documentation Links
  text += `## Resources\n`;
  if (operator.url) {
    text += `• [Official Documentation](${operator.url})\n`;
  }
  if (operator.wiki_url) {
    text += `• [Wiki Page](${operator.wiki_url})\n`;
  }
  text += '\n';
  
  // Metadata
  text += `---\n`;
  text += `*Data source: TouchDesigner documentation`;
  if (operator.scraped && operator.scrapedAt) {
    text += ` (updated ${new Date(operator.scrapedAt).toLocaleDateString()})`;
  }
  if (operator.parameterCount) {
    text += ` | ${operator.parameterCount} parameters documented`;
  }
  text += `*\n`;
  
  return {
    content: [{
      type: "text",
      text
    }]
  };
}