// TD-MCP v2.0 - Get Tutorial Tool
// Displays comprehensive tutorial information

import { z } from "zod";

// Tool schema
export const schema = {
  title: "Get TouchDesigner Tutorial",
  description: "Get detailed content from a TouchDesigner tutorial",
  inputSchema: {
    name: z.string().describe("Tutorial name (e.g., 'Anatomy of a CHOP', 'Write a GLSL TOP')"),
    include_content: z.boolean().optional().describe("Include full tutorial content sections"),
    include_toc: z.boolean().optional().describe("Include table of contents"),
    include_links: z.boolean().optional().describe("Include related links")
  }
};

// Tool handler
export async function handler({ name, include_content = true, include_toc = true, include_links = true }, { wikiSystem }) {
  if (!wikiSystem) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  const tutorial = await wikiSystem.getTutorial(name);
  
  if (!tutorial) {
    // Try to list available tutorials
    const { tutorials } = await wikiSystem.listTutorials({ limit: 10 });
    const tutorialList = tutorials.map(t => `• ${t.name}`).join('\n');
    
    return {
      content: [{
        type: "text",
        text: `Tutorial '${name}' not found.\n\nAvailable tutorials:\n${tutorialList}\n\nTry searching with 'search_tutorials' tool for more options.`
      }]
    };
  }
  
  let text = `# ${tutorial.displayName || tutorial.name}\n`;
  text += `**Category:** ${tutorial.category}\n\n`;
  
  // Description
  if (tutorial.description) {
    text += `## Description\n${tutorial.description}\n\n`;
  }
  
  // Summary
  if (tutorial.summary) {
    text += `## Summary\n${tutorial.summary}\n\n`;
  }
  
  // Table of Contents
  if (include_toc && tutorial.content?.tableOfContents && tutorial.content.tableOfContents.length > 0) {
    text += `## Table of Contents\n`;
    tutorial.content.tableOfContents.forEach(item => {
      text += `${item.number ? item.number + '.' : '•'} ${item.text}\n`;
    });
    text += '\n';
  }
  
  // Content Sections
  if (include_content && tutorial.content?.sections && tutorial.content.sections.length > 0) {
    text += `## Content\n\n`;
    
    tutorial.content.sections.forEach(section => {
      // Section title
      text += `### ${section.title}\n\n`;
      
      // Section content
      if (section.content && section.content.length > 0) {
        section.content.forEach(item => {
          switch (item.type) {
            case 'paragraph':
              text += `${item.text}\n\n`;
              break;
            
            case 'unordered-list':
              if (item.items) {
                item.items.forEach(listItem => {
                  text += `• ${listItem}\n`;
                });
                text += '\n';
              }
              break;
            
            case 'ordered-list':
              if (item.items) {
                item.items.forEach((listItem, index) => {
                  text += `${index + 1}. ${listItem}\n`;
                });
                text += '\n';
              }
              break;
            
            case 'code':
              text += '```' + (item.language || '') + '\n';
              text += item.text + '\n';
              text += '```\n\n';
              break;
            
            case 'subsection':
              text += `#### ${item.title}\n\n`;
              break;
            
            default:
              if (item.text) {
                text += `${item.text}\n\n`;
              }
          }
        });
      }
    });
  } else if (include_content) {
    text += `*Note: This tutorial has no detailed content sections available.*\n\n`;
  }
  
  // Related Links
  if (include_links && tutorial.content?.relatedLinks && tutorial.content.relatedLinks.length > 0) {
    text += `## Related Links\n`;
    tutorial.content.relatedLinks.forEach(link => {
      text += `• [${link.text}](${link.href})\n`;
    });
    text += '\n';
  }
  
  // Images
  if (tutorial.content?.images && tutorial.content.images.length > 0) {
    text += `## Images\n`;
    tutorial.content.images.forEach(img => {
      text += `• ${img.alt || 'Image'}: ${img.src}\n`;
      if (img.caption) {
        text += `  Caption: ${img.caption}\n`;
      }
    });
    text += '\n';
  }
  
  // Keywords/Tags
  if (tutorial.keywords && tutorial.keywords.length > 0) {
    text += `## Keywords\n${tutorial.keywords.join(', ')}\n\n`;
  }
  
  // Metadata
  text += `---\n`;
  text += `*Source: TouchDesigner HTM documentation`;
  if (tutorial.lastUpdated) {
    text += ` (updated ${new Date(tutorial.lastUpdated).toLocaleDateString()})`;
  }
  if (tutorial.content?.sections) {
    text += ` | ${tutorial.content.sections.length} sections`;
  }
  text += `*\n`;
  
  return {
    content: [{
      type: "text",
      text
    }]
  };
}