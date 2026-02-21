// TD-MCP v2.7 - Compare Operators Tool
// Side-by-side comparison of two TouchDesigner operators

import { z } from "zod";

// Tool schema
export const schema = {
  title: "Compare TouchDesigner Operators",
  description: "Compare two TouchDesigner operators side by side - parameters, categories, and use cases",
  inputSchema: {
    operator_a: z.string().describe("First operator name (e.g., 'Blur TOP')"),
    operator_b: z.string().describe("Second operator name (e.g., 'Luma Blur TOP')"),
    compare_parameters: z.boolean().optional().describe("Include parameter comparison (default: true)")
  }
};

// Tool handler
export async function handler({ operator_a, operator_b, compare_parameters = true }, { operatorDataManager }) {
  if (!operatorDataManager) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  try {
    // Fetch both operators
    const [opA, opB] = await Promise.all([
      operatorDataManager.getOperator(operator_a, { show_parameters: true, show_examples: false, show_tips: true }),
      operatorDataManager.getOperator(operator_b, { show_parameters: true, show_examples: false, show_tips: true })
    ]);

    const errors = [];
    if (!opA) errors.push(`Operator '${operator_a}' not found.`);
    if (!opB) errors.push(`Operator '${operator_b}' not found.`);

    if (errors.length > 0) {
      return {
        content: [{
          type: "text",
          text: errors.join('\n') + `\n\nUse 'search_operators' to find the correct operator name.`
        }]
      };
    }

    const nameA = opA.displayName || opA.name;
    const nameB = opB.displayName || opB.name;

    let text = `# Operator Comparison: ${nameA} vs ${nameB}\n\n`;

    // Basic info comparison
    text += `## Overview\n\n`;
    text += `| Property | ${nameA} | ${nameB} |\n`;
    text += `|----------|${'-'.repeat(nameA.length + 2)}|${'-'.repeat(nameB.length + 2)}|\n`;
    text += `| **Category** | ${opA.category} | ${opB.category} |\n`;
    text += `| **Subcategory** | ${opA.subcategory || 'General'} | ${opB.subcategory || 'General'} |\n`;

    const paramCountA = opA.parameters ? opA.parameters.length : 0;
    const paramCountB = opB.parameters ? opB.parameters.length : 0;
    text += `| **Parameters** | ${paramCountA} | ${paramCountB} |\n`;

    if (opA.keywords || opB.keywords) {
      const kwA = opA.keywords ? opA.keywords.slice(0, 5).join(', ') : 'None';
      const kwB = opB.keywords ? opB.keywords.slice(0, 5).join(', ') : 'None';
      text += `| **Keywords** | ${kwA} | ${kwB} |\n`;
    }

    text += `\n`;

    // Description comparison
    text += `## Descriptions\n\n`;
    text += `### ${nameA}\n`;
    const descA = opA.description || opA.summary || 'No description available.';
    text += `${descA.length > 300 ? descA.substring(0, 300) + '...' : descA}\n\n`;
    text += `### ${nameB}\n`;
    const descB = opB.description || opB.summary || 'No description available.';
    text += `${descB.length > 300 ? descB.substring(0, 300) + '...' : descB}\n\n`;

    // Parameter comparison
    if (compare_parameters && (paramCountA > 0 || paramCountB > 0)) {
      text += `## Parameter Comparison\n\n`;

      const paramsA = new Map((opA.parameters || []).map(p => [p.name, p]));
      const paramsB = new Map((opB.parameters || []).map(p => [p.name, p]));

      // Find shared parameters
      const shared = [];
      const onlyA = [];
      const onlyB = [];

      for (const [name, param] of paramsA) {
        if (paramsB.has(name)) {
          shared.push({ name, paramA: param, paramB: paramsB.get(name) });
        } else {
          onlyA.push(param);
        }
      }

      for (const [name, param] of paramsB) {
        if (!paramsA.has(name)) {
          onlyB.push(param);
        }
      }

      if (shared.length > 0) {
        text += `### Shared Parameters (${shared.length})\n`;
        const shownShared = shared.slice(0, 20);
        for (const { name } of shownShared) {
          text += `- **${name}**\n`;
        }
        if (shared.length > 20) {
          text += `- *...and ${shared.length - 20} more shared parameters*\n`;
        }
        text += `\n`;
      }

      if (onlyA.length > 0) {
        text += `### Unique to ${nameA} (${onlyA.length})\n`;
        const shownA = onlyA.slice(0, 15);
        for (const param of shownA) {
          text += `- **${param.name}** (${param.type || 'Unknown'})`;
          if (param.description && param.description.length < 100) {
            text += `: ${param.description}`;
          }
          text += `\n`;
        }
        if (onlyA.length > 15) {
          text += `- *...and ${onlyA.length - 15} more*\n`;
        }
        text += `\n`;
      }

      if (onlyB.length > 0) {
        text += `### Unique to ${nameB} (${onlyB.length})\n`;
        const shownB = onlyB.slice(0, 15);
        for (const param of shownB) {
          text += `- **${param.name}** (${param.type || 'Unknown'})`;
          if (param.description && param.description.length < 100) {
            text += `: ${param.description}`;
          }
          text += `\n`;
        }
        if (onlyB.length > 15) {
          text += `- *...and ${onlyB.length - 15} more*\n`;
        }
        text += `\n`;
      }
    }

    // When to use which
    text += `## When to Use\n\n`;
    text += `**${nameA}:** Best when you need ${opA.subcategory || opA.category}-type processing`;
    if (opA.keywords && opA.keywords.length > 0) {
      text += ` for ${opA.keywords.slice(0, 3).join(', ')}`;
    }
    text += `.\n\n`;

    text += `**${nameB}:** Best when you need ${opB.subcategory || opB.category}-type processing`;
    if (opB.keywords && opB.keywords.length > 0) {
      text += ` for ${opB.keywords.slice(0, 3).join(', ')}`;
    }
    text += `.\n\n`;

    text += `---\n`;
    text += `*Use 'get_operator' for full details on either operator, or 'get_operator_examples' for code examples.*\n`;

    return {
      content: [{
        type: "text",
        text
      }]
    };

  } catch (error) {
    console.error('[Compare Operators] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Error comparing operators: ${error.message || 'Unknown error occurred'}`
      }]
    };
  }
}
