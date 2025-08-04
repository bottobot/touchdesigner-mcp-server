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
export async function handler({ current_operator }, { workflowPatterns }) {
  const suggestions = suggestNextOperator(current_operator, workflowPatterns);
  
  if (suggestions.length === 0) {
    return {
      content: [{
        type: "text",
        text: `No workflow suggestions found for '${current_operator}'. This might be because:\n- The operator name doesn't match our patterns\n- It's typically used as an end-point in workflows\n- Try using the full operator name with family (e.g., 'Movie File In TOP')`
      }]
    };
  }
  
  let text = `**Workflow suggestions for '${current_operator}':**\n\n`;
  
  suggestions.forEach((suggestion, index) => {
    text += `${index + 1}. **${suggestion.operator}**\n`;
    text += `   - Reason: ${suggestion.reason}\n`;
    text += `   - Confidence: ${(suggestion.confidence * 100).toFixed(0)}%\n`;
    
    if (suggestion.pattern) {
      text += `   - Pattern: ${suggestion.pattern}\n`;
    }
    if (suggestion.use_case) {
      text += `   - Use case: ${suggestion.use_case}\n`;
    }
    text += '\n';
  });
  
  text += `\n*Suggestions based on common TouchDesigner workflows and the Sweet 16 operator patterns.*`;
  
  return {
    content: [{
      type: "text",
      text
    }]
  };
}