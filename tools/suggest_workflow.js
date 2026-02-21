/**
 * Suggest Workflow Tool - Returns related operators for workflow building.
 * First checks named workflow patterns in patterns.json, then falls back to
 * same-category operators from the data manager ranked by keyword overlap.
 *
 * v2.10 enhancements:
 *   - Connection port instructions (A output 0 -> B input 0)
 *   - Complexity rating (simple / medium / complex)
 *   - Estimated node count for the suggested workflow
 *   - Minimum TD version requirement
 *
 * @module tools/suggest_workflow
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Static workflow metadata: complexity, node estimates, min TD version,
// and connection port hints per common operator-to-operator transitions.
// ---------------------------------------------------------------------------
const WORKFLOW_META = {
  // TOP transitions
  "Movie File In TOP -> Level TOP":       { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Movie File In TOP -> Blur TOP":        { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Movie File In TOP -> Transform TOP":   { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Movie File In TOP -> Composite TOP":   { port: "output 0 -> input 0 (or input 1 for overlay)", complexity: "simple", minVersion: "2019" },
  "Movie File In TOP -> Feedback TOP":    { port: "output 0 -> input 0", complexity: "medium",  minVersion: "2019" },
  "Level TOP -> Composite TOP":           { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Level TOP -> Blur TOP":                { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Feedback TOP -> Transform TOP":        { port: "output 0 -> input 0", complexity: "medium",  minVersion: "2019" },
  "Feedback TOP -> Level TOP":            { port: "output 0 -> input 0", complexity: "medium",  minVersion: "2019" },
  "Feedback TOP -> Blur TOP":             { port: "output 0 -> input 0", complexity: "medium",  minVersion: "2019" },
  "Noise TOP -> Level TOP":               { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Noise TOP -> Feedback TOP":            { port: "output 0 -> input 0", complexity: "medium",  minVersion: "2019" },
  "Noise TOP -> Displace TOP":            { port: "output 0 -> input 1 (displacement map)", complexity: "medium", minVersion: "2019" },
  "Render TOP -> Level TOP":              { port: "output 0 -> input 0", complexity: "medium",  minVersion: "2019" },
  "Render TOP -> Composite TOP":          { port: "output 0 -> input 0", complexity: "medium",  minVersion: "2019" },
  "GLSL TOP -> Feedback TOP":             { port: "output 0 -> input 0", complexity: "complex", minVersion: "2020" },
  "Transform TOP -> Null TOP":            { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Composite TOP -> Out TOP":             { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Blur TOP -> Composite TOP":            { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Threshold TOP -> Composite TOP":       { port: "output 0 -> input 1 (mask layer)", complexity: "medium", minVersion: "2019" },
  // CHOP transitions
  "Audio Device In CHOP -> Audio Spectrum CHOP": { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Audio File In CHOP -> Audio Spectrum CHOP":   { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Audio Spectrum CHOP -> Math CHOP":            { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Audio Spectrum CHOP -> Null CHOP":            { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Math CHOP -> Null CHOP":                      { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Math CHOP -> Lag CHOP":                       { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Lag CHOP -> Null CHOP":                       { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Noise CHOP -> Math CHOP":                     { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Noise CHOP -> Lag CHOP":                      { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "LFO CHOP -> Math CHOP":                       { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Beat CHOP -> Null CHOP":                      { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "MIDI In CHOP -> Math CHOP":                   { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  "Null CHOP -> CHOP to TOP":                    { port: "output -> input 0", complexity: "simple",  minVersion: "2019" },
  // SOP transitions
  "Box SOP -> Noise SOP":        { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Box SOP -> Transform SOP":    { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Sphere SOP -> Noise SOP":     { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Grid SOP -> Noise SOP":       { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Noise SOP -> Geometry COMP":  { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Script SOP -> Geometry COMP": { port: "output 0 -> input 0", complexity: "medium",  minVersion: "2019" },
  // DAT transitions
  "Table DAT -> Script DAT":     { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Script DAT -> DAT to CHOP":   { port: "output 0 -> input 0", complexity: "simple",  minVersion: "2019" },
  "Web Client DAT -> Script DAT":{ port: "output 0 -> input 0", complexity: "medium",  minVersion: "2020" }
};

// Complexity lookup by category for fallback estimates
const CATEGORY_COMPLEXITY = {
  "TOP": "simple",
  "CHOP": "simple",
  "SOP": "medium",
  "DAT": "simple",
  "COMP": "medium",
  "MAT": "medium",
  "POP": "complex"
};

// Min TD version by subcategory (conservative defaults)
const SUBCATEGORY_VERSION = {
  "Audio":      "2019",
  "Generators": "2019",
  "Filters":    "2019",
  "3D":         "2019",
  "Compositing":"2019",
  "Particles":  "2020",
  "GPU":        "2021",
  "Machine Learning": "2022",
  "Engine":     "2022"
};

// Estimated node count for complete workflows by use-case category
const WORKFLOW_NODE_COUNT = {
  simple:  { min: 3,  max: 6  },
  medium:  { min: 6,  max: 12 },
  complex: { min: 12, max: 25 }
};

function getWorkflowMeta(fromOp, toOp) {
  const key = `${fromOp} -> ${toOp}`;
  if (WORKFLOW_META[key]) return WORKFLOW_META[key];
  // Try partial match on operator names
  for (const [k, v] of Object.entries(WORKFLOW_META)) {
    if (k.includes(fromOp) || k.includes(toOp)) return v;
  }
  return null;
}

function inferComplexity(suggestion) {
  const cat = suggestion.category || "";
  const name = suggestion.operator || "";
  if (name.includes("GLSL") || name.includes("Script") || name.includes("Engine")) return "complex";
  if (name.includes("Render") || name.includes("Geometry") || name.includes("Particle")) return "medium";
  return CATEGORY_COMPLEXITY[cat] || "simple";
}

function inferMinVersion(suggestion) {
  const name = suggestion.operator || "";
  const cat = suggestion.category || "";
  if (name.includes("Engine")) return "2022";
  if (name.includes("Body Track") || name.includes("Machine Learning")) return "2022";
  if (name.includes("POP") || cat === "POP") return "2022";
  if (name.includes("NDI") || name.includes("WebRTC")) return "2021";
  if (name.includes("CUDA") || name.includes("Shared Memory")) return "2021";
  const subcat = suggestion.subcategory || "";
  if (SUBCATEGORY_VERSION[subcat]) return SUBCATEGORY_VERSION[subcat];
  return "2019";
}

// Tool schema
export const schema = {
  title: "Suggest Next TouchDesigner Operators",
  description: "Get workflow suggestions for what operators commonly follow the current operator. " +
    "Returns connection port instructions (e.g., 'output 0 -> input 0'), complexity rating " +
    "(simple/medium/complex), estimated node count for the full workflow, and minimum TD version required.",
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
export async function handler({ current_operator }, { operatorDataManager, workflowPatterns }) {
  try {
    let suggestions = [];

    // Try operator data manager first if available
    if (operatorDataManager) {
      try {
        const wikiSuggestions = await operatorDataManager.suggestWorkflow(current_operator, { limit: 10 });
        if (wikiSuggestions.suggestions && wikiSuggestions.suggestions.length > 0) {
          suggestions = wikiSuggestions.suggestions.map(suggestion => ({
            operator: suggestion.name,
            reason: "Related operator based on category and usage patterns",
            confidence: suggestion.relevanceScore ? Math.min(suggestion.relevanceScore / 15, 1.0) : 0.7,
            category: suggestion.category,
            subcategory: suggestion.subcategory,
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
      text += `- The operator name does not match our patterns\n`;
      text += `- It is typically used as an end-point in workflows\n`;
      text += `- Try using the full operator name with family (e.g., 'Movie File In TOP')\n\n`;

      if (operatorDataManager) {
        text += `**Tip:** Try searching for the operator first with 'search_operators' to find the exact name.`;
      }

      return {
        content: [{
          type: "text",
          text
        }]
      };
    }

    // Enrich each suggestion with v2.10 metadata
    const enriched = suggestions.map(suggestion => {
      const meta = getWorkflowMeta(current_operator, suggestion.operator);
      const complexity = meta ? meta.complexity : inferComplexity(suggestion);
      const minVersion = meta ? meta.minVersion : inferMinVersion(suggestion);
      const portHint = meta ? meta.port : "output 0 -> input 0";
      const nodeRange = WORKFLOW_NODE_COUNT[complexity] || WORKFLOW_NODE_COUNT.simple;
      const estimatedNodes = `${nodeRange.min}–${nodeRange.max}`;
      return { ...suggestion, complexity, minVersion, portHint, estimatedNodes };
    });

    // Overall workflow complexity = highest complexity among suggestions
    const complexityOrder = { simple: 0, medium: 1, complex: 2 };
    const overallComplexity = enriched.reduce((best, s) => {
      return (complexityOrder[s.complexity] || 0) > (complexityOrder[best] || 0) ? s.complexity : best;
    }, "simple");

    // Highest minimum TD version required
    const versionOrder = ["099", "2019", "2020", "2021", "2022", "2023", "2024"];
    const overallMinVersion = enriched.reduce((best, s) => {
      return versionOrder.indexOf(s.minVersion) > versionOrder.indexOf(best) ? s.minVersion : best;
    }, "2019");

    let text = `# Workflow Suggestions for '${current_operator}'\n\n`;

    // Workflow-level summary
    text += `## Workflow Summary\n`;
    text += `| Property | Value |\n`;
    text += `|---|---|\n`;
    text += `| Suggestions found | ${enriched.length} |\n`;
    text += `| Overall complexity | ${overallComplexity} |\n`;
    text += `| Minimum TD version | ${overallMinVersion}+ |\n\n`;

    text += `Found **${enriched.length}** related operators that commonly follow this one:\n\n`;

    enriched.forEach((suggestion, index) => {
      text += `## ${index + 1}. ${suggestion.operator}\n`;

      if (suggestion.category) {
        text += `**Category:** ${suggestion.category}`;
        if (suggestion.subcategory) text += ` / ${suggestion.subcategory}`;
        text += `\n`;
      }

      // v2.10: Connection port instructions
      text += `**Connection:** \`${current_operator}\` ${suggestion.portHint} \`${suggestion.operator}\`\n`;

      // v2.10: Complexity rating
      text += `**Complexity:** ${suggestion.complexity}`;
      text += ` | **Estimated nodes in full workflow:** ${suggestion.estimatedNodes}\n`;

      // v2.10: Minimum TD version
      text += `**Min TD version:** ${suggestion.minVersion}+\n`;

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

    text += `*Suggestions based on ${operatorDataManager ? 'operator relationships and' : ''} common TouchDesigner workflows.*\n`;
    text += `*Use \`get_operator_connections\` for detailed port-level wiring.*\n`;
    text += `*Use \`get_network_template\` for a full network setup for your use case.*`;

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
