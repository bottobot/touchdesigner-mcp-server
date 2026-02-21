// TD-MCP v2.7 - Get Operator Examples Tool
// Returns code examples, Python snippets, and usage patterns for a specific operator

import { z } from "zod";

// Tool schema
export const schema = {
  title: "Get TouchDesigner Operator Examples",
  description: "Get Python code examples, expressions, and usage patterns for a specific TouchDesigner operator",
  inputSchema: {
    operator: z.string().describe("Operator name (e.g., 'Noise CHOP', 'Movie File In TOP', 'Text DAT')"),
    example_type: z.enum(["all", "python", "expressions", "usage"]).optional()
      .describe("Type of examples to return: 'all' (default), 'python', 'expressions', or 'usage'")
  }
};

/**
 * Generate standard Python examples for common operator operations
 */
function generateStandardExamples(operator) {
  const name = operator.name || operator.displayName || 'Unknown';
  const category = (operator.category || '').toUpperCase();

  // Derive a typical short name for scripting
  const shortName = name.replace(/ (CHOP|TOP|SOP|DAT|COMP|MAT|POP)$/i, '')
    .toLowerCase().replace(/\s+/g, '');

  const examples = [];

  // Basic creation example - use proper TD Python class names
  const classNames = {
    'CHOP': `${shortName}CHOP`, 'TOP': `${shortName}TOP`,
    'SOP': `${shortName}SOP`, 'DAT': `${shortName}DAT`,
    'COMP': `${shortName}COMP`, 'MAT': `${shortName}MAT`
  };
  const tdClassName = classNames[category] || shortName;

  examples.push({
    title: `Create ${name}`,
    language: "python",
    code: `# Reference an existing ${name}\nmy_op = op('${shortName}1')\n\n# Or create one programmatically\nnew_op = op('/project1').create(${tdClassName})\nnew_op.name = '${shortName}1'`,
    description: `Basic creation and reference for ${name}`
  });

  // Parameter access example
  if (operator.parameters && operator.parameters.length > 0) {
    const sampleParams = operator.parameters
      .filter(p => p.name && !p.name.startsWith('From') && p.name.length < 30)
      .slice(0, 5);

    if (sampleParams.length > 0) {
      let paramCode = `# Access parameters of ${name}\nmy_op = op('${shortName}1')\n\n`;
      paramCode += `# Read parameters\n`;
      for (const param of sampleParams) {
        const paramName = param.name.charAt(0).toLowerCase() + param.name.slice(1).replace(/\s+/g, '');
        paramCode += `val = my_op.par.${paramName}  # ${param.description ? param.description.substring(0, 60) : param.name}\n`;
      }
      paramCode += `\n# Set parameters\n`;
      for (const param of sampleParams.slice(0, 3)) {
        const paramName = param.name.charAt(0).toLowerCase() + param.name.slice(1).replace(/\s+/g, '');
        if (param.type === 'Float' || param.type === 'Int') {
          paramCode += `my_op.par.${paramName} = ${param.defaultValue || '1'}\n`;
        } else if (param.type === 'Toggle') {
          paramCode += `my_op.par.${paramName} = True\n`;
        } else {
          paramCode += `my_op.par.${paramName} = '${param.defaultValue || 'value'}'\n`;
        }
      }

      examples.push({
        title: `${name} Parameter Access`,
        language: "python",
        code: paramCode,
        description: `Read and set parameters on ${name}`
      });
    }
  }

  // Category-specific examples
  if (category === 'CHOP') {
    examples.push({
      title: `Read ${name} Channel Data`,
      language: "python",
      code: `# Read channel data from ${name}\nmy_op = op('${shortName}1')\n\n# Get number of channels\nnum_channels = my_op.numChans\n\n# Read specific channel value\nval = my_op['chan1'][0]  # First sample of 'chan1'\n\n# Iterate all channels\nfor chan in my_op.chans():\n    print(f'{chan.name}: {chan[0]}')`,
      description: `Access CHOP channel data from ${name}`
    });
  } else if (category === 'TOP') {
    examples.push({
      title: `${name} Resolution & Format`,
      language: "python",
      code: `# Work with ${name} texture data\nmy_op = op('${shortName}1')\n\n# Get resolution\nwidth = my_op.width\nheight = my_op.height\n\n# Save to file\nmy_op.save('output.png')`,
      description: `Access TOP texture properties for ${name}`
    });
  } else if (category === 'DAT') {
    examples.push({
      title: `Read ${name} Table Data`,
      language: "python",
      code: `# Read table data from ${name}\nmy_op = op('${shortName}1')\n\n# Get number of rows and columns\nnum_rows = my_op.numRows\nnum_cols = my_op.numCols\n\n# Read specific cell\nval = my_op[0, 0]  # Row 0, Column 0\n\n# Read by name\nval = my_op['rowName', 'colName']`,
      description: `Access DAT table data from ${name}`
    });
  } else if (category === 'SOP') {
    examples.push({
      title: `${name} Geometry Access`,
      language: "python",
      code: `# Access geometry from ${name}\nmy_op = op('${shortName}1')\n\n# Get point count\nnum_points = my_op.numPoints\n\n# Access points\nfor point in my_op.points():\n    pos = point.P  # Position\n    print(f'Point {point.index}: {pos}')`,
      description: `Access SOP geometry data from ${name}`
    });
  }

  return examples;
}

// Tool handler
export async function handler({ operator, example_type = "all" }, { operatorDataManager }) {
  if (!operatorDataManager) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  try {
    const opData = await operatorDataManager.getOperator(operator, {
      show_examples: true,
      show_tips: false,
      show_parameters: true
    });

    if (!opData) {
      return {
        content: [{
          type: "text",
          text: `Operator '${operator}' not found. Try searching with 'search_operators' tool.`
        }]
      };
    }

    const name = opData.displayName || opData.name;
    let text = `# Code Examples for ${name}\n`;
    text += `**Category:** ${opData.category}\n\n`;

    let hasExamples = false;

    // Stored Python examples
    if ((example_type === 'all' || example_type === 'python') &&
        opData.pythonExamples && opData.pythonExamples.length > 0) {
      text += `## Python Examples\n\n`;
      opData.pythonExamples.forEach((example, i) => {
        text += `### ${example.title || `Example ${i + 1}`}\n`;
        text += `\`\`\`python\n${example.code}\n\`\`\`\n`;
        if (example.description) text += `${example.description}\n`;
        text += '\n';
      });
      hasExamples = true;
    }

    // Stored code examples
    if ((example_type === 'all' || example_type === 'python') &&
        opData.codeExamples && opData.codeExamples.length > 0) {
      text += `## Code Examples\n\n`;
      opData.codeExamples.forEach((example, i) => {
        text += `### ${example.title || `Example ${i + 1}`}\n`;
        text += `\`\`\`${example.language || 'python'}\n${example.code}\n\`\`\`\n`;
        if (example.description) text += `${example.description}\n`;
        text += '\n';
      });
      hasExamples = true;
    }

    // Expression examples
    if ((example_type === 'all' || example_type === 'expressions') &&
        opData.expressions && opData.expressions.length > 0) {
      text += `## Expression Examples\n\n`;
      opData.expressions.forEach((example, i) => {
        text += `### ${example.title || `Expression ${i + 1}`}\n`;
        text += `\`\`\`\n${example.code}\n\`\`\`\n`;
        if (example.description) text += `${example.description}\n`;
        text += '\n';
      });
      hasExamples = true;
    }

    // Generate standard examples if none stored
    if (!hasExamples || example_type === 'all' || example_type === 'usage') {
      const generated = generateStandardExamples(opData);
      if (generated.length > 0) {
        text += `## Usage Patterns\n\n`;
        generated.forEach(example => {
          text += `### ${example.title}\n`;
          text += `\`\`\`${example.language || 'python'}\n${example.code}\n\`\`\`\n`;
          if (example.description) text += `*${example.description}*\n`;
          text += '\n';
        });
      }
    }

    // Tips related to usage
    if (opData.tips && opData.tips.length > 0) {
      text += `## Usage Tips\n\n`;
      opData.tips.forEach(tip => {
        text += `- ${tip}\n`;
      });
      text += '\n';
    }

    text += `---\n`;
    text += `*Use 'get_operator' for full parameter documentation, or 'get_python_api' for Python class details.*\n`;

    return {
      content: [{
        type: "text",
        text
      }]
    };

  } catch (error) {
    console.error('[Get Operator Examples] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Error retrieving examples: ${error.message || 'Unknown error occurred'}`
      }]
    };
  }
}
