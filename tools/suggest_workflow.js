// TD-MCP v2.0 - Suggest Workflow Tool
// Simple tool implementation following Claude.md principles

import { z } from "zod";

// Tool schema
export const schema = {
  title: "Suggest Next TouchDesigner Operators",
  description: "Get workflow suggestions for what operators commonly follow the current operator",
  inputSchema: {
    current_operator: z.string().describe("Current operator name (e.g., 'Movie File In TOP', 'Constant CHOP')")
  }
};

// Simple workflow suggestion function - copy-paste logic, no abstractions
function suggestNextOperator(currentOperator, workflowPatterns) {
  if (!workflowPatterns) {
    return [];
  }
  
  const suggestions = [];
  
  // Check common transitions first (simple indexOf lookup)
  if (workflowPatterns.common_transitions[currentOperator]) {
    const transitions = workflowPatterns.common_transitions[currentOperator];
    for (const nextOp of transitions) {
      suggestions.push({
        operator: nextOp,
        reason: "Common transition",
        confidence: 0.9
      });
    }
  }
  
  // Check workflow patterns (simple array search)
  for (const pattern of workflowPatterns.patterns) {
    const workflow = pattern.workflow;
    const currentIndex = workflow.indexOf(currentOperator);
    
    if (currentIndex !== -1 && currentIndex < workflow.length - 1) {
      const nextOp = workflow[currentIndex + 1];
      
      // Avoid duplicates
      if (!suggestions.find(s => s.operator === nextOp)) {
        suggestions.push({
          operator: nextOp,
          reason: `Part of ${pattern.name} workflow`,
          confidence: 0.8,
          pattern: pattern.name,
          use_case: pattern.use_case
        });
      }
    }
  }
  
  return suggestions;
}

// Tool handler
export async function handler({ current_operator }, { wikiSystem, workflowPatterns }) {
  try {
    let suggestions = [];
    
    // Try wiki system first if available
    if (wikiSystem) {
      try {
        const wikiSuggestions = await wikiSystem.suggestWorkflow(current_operator, { limit: 10 });
        if (wikiSuggestions.suggestions && wikiSuggestions.suggestions.length > 0) {
          suggestions = wikiSuggestions.suggestions.map(suggestion => ({
            operator: suggestion.name,
            reason: "Related operator based on category and usage patterns",
            confidence: suggestion.relevanceScore ? (suggestion.relevanceScore / 10) : 0.7,
            category: suggestion.category,
            description: suggestion.description
          }));
        }
      } catch (error) {
        console.warn('[Workflow Tool] Wiki system error:', error);
      }
    }
    
    // Fallback to pattern-based suggestions if no wiki results
    if (suggestions.length === 0) {
      suggestions = suggestNextOperator(current_operator, workflowPatterns);
    }
    
    if (suggestions.length === 0) {
      let text = `No workflow suggestions found for '${current_operator}'. This might be because:\n`;
      text += `• The operator name doesn't match our patterns\n`;
      text += `• It's typically used as an end-point in workflows\n`;
      text += `• Try using the full operator name with family (e.g., 'Movie File In TOP')\n\n`;
      
      if (wikiSystem) {
        text += `**Tip:** Try searching for the operator first with 'search_operators' to find the exact name.`;
      }
      
      return {
        content: [{
          type: "text",
          text
        }]
      };
    }
    
    let text = `# Workflow Suggestions for '${current_operator}'\n\n`;
    text += `Found **${suggestions.length}** related operators that commonly follow this one:\n\n`;
    
    suggestions.forEach((suggestion, index) => {
      text += `## ${index + 1}. ${suggestion.operator}\n`;
      
      if (suggestion.category) {
        text += `**Category:** ${suggestion.category}\n`;
      }
      
      if (suggestion.description) {
        const shortDesc = suggestion.description.length > 150 ?
          suggestion.description.substring(0, 150) + '...' :
          suggestion.description;
        text += `**Description:** ${shortDesc}\n`;
      }
      
      text += `**Reason:** ${suggestion.reason}\n`;
      text += `**Confidence:** ${(suggestion.confidence * 100).toFixed(0)}%\n`;
      
      if (suggestion.pattern) {
        text += `**Pattern:** ${suggestion.pattern}\n`;
      }
      
      if (suggestion.use_case) {
        text += `**Use Case:** ${suggestion.use_case}\n`;
      }
      
      text += '\n---\n\n';
    });
    
    text += `*Suggestions based on ${wikiSystem ? 'operator relationships and' : ''} common TouchDesigner workflows.*`;
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
    
  } catch (error) {
    console.error('[Workflow Tool] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Error generating workflow suggestions: ${error.message || 'Unknown error occurred'}`
      }]
    };
  }
}