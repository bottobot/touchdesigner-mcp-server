/**
 * Get Operator Tool - Retrieves full documentation for a TouchDesigner operator.
 * Returns all parameters (grouped by page), code examples, tips, and warnings.
 * v2.8: Added optional 'version' parameter to indicate compatibility context.
 * @module tools/get_operator
 */

import { z } from "zod";
import { normalizeVersion, getOperatorCompatInfo, getVersionInfo } from "../wiki/utils/version-filter.js";

// Tool schema
export const schema = {
  title: "Get TouchDesigner Operator",
  description: "Get comprehensive details about a specific TouchDesigner operator. " +
    "Optionally pass a TouchDesigner version to see compatibility notes for that release.",
  inputSchema: {
    name: z.string().describe("Operator name (e.g., 'Noise CHOP', 'Kinect Azure TOP')"),
    show_examples: z.boolean().optional().describe("Show code examples and usage"),
    show_tips: z.boolean().optional().describe("Show tips and performance notes"),
    version: z.string().optional().describe(
      "TouchDesigner version context (e.g. '2023', '2022', '2021'). " +
      "When provided, a compatibility note is shown for that version."
    )
  }
};

// Tool handler
export async function handler({ name, show_examples = true, show_tips = true, version }, { operatorDataManager }) {
  if (!operatorDataManager) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  const operator = await operatorDataManager.getOperator(name, {
    show_examples,
    show_tips,
    show_parameters: true
  });
  
  if (!operator) {
    return {
      content: [{
        type: "text",
        text: `Operator '${name}' not found. Try searching with 'search_operators' tool.`
      }]
    };
  }
  
  let text = `# ${operator.displayName || operator.name}\n`;
  text += `**Category:** ${operator.category} | **Subcategory:** ${operator.subcategory || 'General'}\n\n`;

  // Version compatibility block (when version param is supplied)
  if (version) {
    const canonicalVersion = normalizeVersion(version);
    if (canonicalVersion) {
      try {
        // Derive operator id from name for compat lookup
        const opId = (operator.id || (operator.name || '').toLowerCase().replace(/[\s-]/g, '_'));
        const [compatInfo, versionInfo] = await Promise.all([
          getOperatorCompatInfo(opId),
          getVersionInfo(canonicalVersion)
        ]);

        text += `## Version Compatibility (TD ${canonicalVersion})\n`;

        if (versionInfo) {
          text += `**Target version:** ${versionInfo.label} — Python ${versionInfo.pythonVersion}\n`;
        }

        if (compatInfo) {
          const addedText = compatInfo.addedIn
            ? `Added in TD ${compatInfo.addedIn}`
            : 'Available since early releases';
          text += `**Availability:** ${addedText}\n`;

          if (compatInfo.removedIn) {
            text += `**Removed in:** TD ${compatInfo.removedIn}\n`;
          }

          // Check if the target version is before addedIn
          const { getVersionIndex } = await import("../wiki/utils/version-filter.js");
          const targetIdx = await getVersionIndex(canonicalVersion);
          const addedIdx = compatInfo.addedIn ? await getVersionIndex(compatInfo.addedIn) : 0;

          if (addedIdx > targetIdx) {
            text += `**Warning:** This operator was not available in TD ${canonicalVersion}. ` +
                    `It was introduced in TD ${compatInfo.addedIn}.\n`;
          } else {
            text += `**Status:** Compatible with TD ${canonicalVersion}.\n`;
          }

          // Show any changedIn entries for this version
          if (compatInfo.changedIn && compatInfo.changedIn.length > 0) {
            const relevantChanges = compatInfo.changedIn.filter(c =>
              parseInt(c.version) <= parseInt(canonicalVersion === '099' ? '99' : canonicalVersion)
            );
            if (relevantChanges.length > 0) {
              text += `**Changes up to TD ${canonicalVersion}:**\n`;
              relevantChanges.forEach(c => {
                text += `  - TD ${c.version}: ${c.change}\n`;
              });
            }
          }

          if (compatInfo.notes) {
            text += `**Notes:** ${compatInfo.notes}\n`;
          }
        } else {
          text += `Compatibility data not available for this operator — it is likely available in all versions.\n`;
        }
        text += '\n';
      } catch (compatErr) {
        // Non-fatal — skip the compatibility block on error
        console.error('[get_operator] Version compat lookup error:', compatErr.message);
      }
    }
  }

  // Description
  text += `## Description\n${operator.description || operator.summary || 'No description available.'}\n\n`;
  
  // Parameters - Show ALL with enhanced formatting
  if (operator.parameters && operator.parameters.length > 0) {
    text += `## Parameters (${operator.parameters.length} total)\n\n`;
    
    // Group parameters by group/page for better organization
    const paramsByGroup = {};
    operator.parameters.forEach(param => {
      const group = param.group || param.page || 'Common';
      if (!paramsByGroup[group]) paramsByGroup[group] = [];
      paramsByGroup[group].push(param);
    });
    
    for (const [group, params] of Object.entries(paramsByGroup)) {
      text += `### ${group}\n`;
      for (const param of params) {
        text += `• **${param.name}**`;
        if (param.label && param.label !== param.name) {
          text += ` (${param.label})`;
        }
        text += ` (${param.type || 'Unknown'})`;
        text += `: ${param.description || 'No description'}`;
        
        // Add range info if available
        if (param.minValue !== null || param.maxValue !== null) {
          text += ` [Range: ${param.minValue ?? '∞'} to ${param.maxValue ?? '∞'}]`;
        }
        
        // Add default value if available
        if (param.defaultValue !== null && param.defaultValue !== undefined) {
          text += ` (Default: ${param.defaultValue})`;
        }
        
        // Add units if available
        if (param.units) {
          text += ` (${param.units})`;
        }
        
        // Add menu options if available
        if (param.menuItems && param.menuItems.length > 0) {
          text += `\n  Options: ${param.menuItems.join(', ')}`;
        }
        
        text += '\n';
      }
      text += '\n';
    }
  } else {
    text += `## Parameters\nNo parameters documented.\n\n`;
  }
  
  // Usage information
  if (operator.usage) {
    text += `## Usage\n${operator.usage}\n\n`;
  }
  
  // Code Examples
  if (show_examples && operator.codeExamples && operator.codeExamples.length > 0) {
    text += `## Code Examples\n`;
    operator.codeExamples.forEach((example, i) => {
      text += `### ${example.title || `Example ${i + 1}`}\n`;
      text += `\`\`\`${example.language || 'text'}\n${example.code}\n\`\`\`\n`;
      if (example.description) {
        text += `${example.description}\n`;
      }
      text += '\n';
    });
  }
  
  // Python Examples
  if (show_examples && operator.pythonExamples && operator.pythonExamples.length > 0) {
    text += `## Python Examples\n`;
    operator.pythonExamples.forEach((example, i) => {
      text += `### ${example.title || `Python Example ${i + 1}`}\n`;
      text += `\`\`\`python\n${example.code}\n\`\`\`\n`;
      if (example.description) {
        text += `${example.description}\n`;
      }
      text += '\n';
    });
  }
  
  // Expression Examples
  if (show_examples && operator.expressions && operator.expressions.length > 0) {
    text += `## Expression Examples\n`;
    operator.expressions.forEach((example, i) => {
      text += `### ${example.title || `Expression ${i + 1}`}\n`;
      text += `\`\`\`\n${example.code}\n\`\`\`\n`;
      if (example.description) {
        text += `${example.description}\n`;
      }
      text += '\n';
    });
  }
  
  // Tips and Notes
  if (show_tips && operator.tips && operator.tips.length > 0) {
    text += `## Tips & Notes\n`;
    operator.tips.forEach(tip => {
      text += `💡 ${tip}\n\n`;
    });
  }
  
  // Warnings
  if (show_tips && operator.warnings && operator.warnings.length > 0) {
    text += `## Warnings\n`;
    operator.warnings.forEach(warning => {
      text += `⚠️ ${warning}\n\n`;
    });
  }
  
  // Keywords/Tags
  if (operator.keywords && operator.keywords.length > 0) {
    text += `## Keywords\n${operator.keywords.join(', ')}\n\n`;
  }
  
  // Metadata
  text += `---\n`;
  text += `*Data source: TouchDesigner HTM documentation`;
  if (operator.lastUpdated) {
    text += ` (updated ${new Date(operator.lastUpdated).toLocaleDateString()})`;
  }
  if (operator.parameterCount || (operator.parameters && operator.parameters.length)) {
    text += ` | ${operator.parameterCount || operator.parameters.length} parameters documented`;
  }
  text += `*\n`;
  
  return {
    content: [{
      type: "text",
      text
    }]
  };
}