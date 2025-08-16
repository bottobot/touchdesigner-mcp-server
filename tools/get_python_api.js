/**
 * Get Python API documentation tool
 * Provides access to TouchDesigner Python class documentation
 */

import { z } from "zod";

export const schema = {
    title: "Get Python API Documentation",
    description: "Get documentation for a TouchDesigner Python class",
    inputSchema: {
        class_name: z.string().describe("Python class name (e.g., 'CHOP', 'Channel', 'App')"),
        show_members: z.boolean().optional().describe("Show class members/properties"),
        show_methods: z.boolean().optional().describe("Show class methods"),
        show_inherited: z.boolean().optional().describe("Show inherited members and methods")
    }
};

export async function handler({ class_name, show_members = true, show_methods = true, show_inherited = false }, { operatorDataManager }) {
    console.log(`[get_python_api] Handling request for class: ${class_name}`);
    
    try {
        // Check if operatorDataManager is available
        if (!operatorDataManager) {
            console.error('[get_python_api] operatorDataManager is not available');
            return {
                content: [{
                    type: "text",
                    text: "Wiki system not initialized. The wiki system is not available for Python API queries."
                }]
            };
        }
        
        // Normalize class name
        const normalizedName = class_name.replace(/class$/i, '').trim();
        console.log(`[get_python_api] Normalized name: ${normalizedName}`);
        
        // Search for Python class entry
        const pythonClasses = operatorDataManager.getPythonClasses();
        console.log(`[get_python_api] Total Python classes available: ${pythonClasses.length}`);
        
        const classEntry = pythonClasses.find(c =>
            c.className.toLowerCase() === normalizedName.toLowerCase() ||
            (c.displayName && c.displayName.toLowerCase() === normalizedName.toLowerCase())
        );
        
        if (!classEntry) {
            // List available classes for helpful error message
            const availableClasses = pythonClasses
                .map(c => c.className)
                .sort()
                .slice(0, 10);
            
            console.log(`[get_python_api] Class not found. Available: ${availableClasses.join(', ')}`);
            
            let text = `# Python Class '${class_name}' Not Found\n\n`;
            text += `**Available classes include:** ${availableClasses.join(', ')}...\n\n`;
            text += `**Total classes available:** ${pythonClasses.length}\n\n`;
            text += `**Suggestion:** Try one of the available class names listed above.`;
            
            return {
                content: [{
                    type: "text",
                    text
                }]
            };
        }
        
        console.log(`[get_python_api] Found class: ${classEntry.className}`);
        
        // Build formatted response text
        let text = `# ${classEntry.displayName || classEntry.className}\n\n`;
        text += `**Category:** ${classEntry.category}\n\n`;
        text += `## Description\n${classEntry.description}\n\n`;
        
        // Add members if requested
        if (show_members && classEntry.members) {
            text += `## Members (${classEntry.members.length} total)\n\n`;
            classEntry.members.forEach(member => {
                text += `• **${member.name}** (${member.returnType || 'Unknown'})`;
                if (member.readOnly) {
                    text += ` *[Read Only]*`;
                }
                text += `\n  ${member.description}\n\n`;
            });
            console.log(`[get_python_api] Added ${classEntry.members.length} members`);
        }
        
        // Add methods if requested
        if (show_methods && classEntry.methods) {
            text += `## Methods (${classEntry.methods.length} total)\n\n`;
            classEntry.methods.forEach(method => {
                text += `### ${method.name}()\n`;
                text += `**Signature:** \`${method.signature}\`\n\n`;
                if (method.returnType) {
                    text += `**Returns:** ${method.returnType}\n\n`;
                }
                if (method.description) {
                    text += `${method.description}\n\n`;
                }
                if (method.parameters && method.parameters.length > 0) {
                    text += `**Parameters:**\n`;
                    method.parameters.forEach(param => {
                        text += `• **${param.name}** (${param.type || 'Any'})`;
                        if (param.description) {
                            text += `: ${param.description}`;
                        }
                        text += `\n`;
                    });
                    text += `\n`;
                }
            });
            console.log(`[get_python_api] Added ${classEntry.methods.length} methods`);
        }
        
        // Add inheritance info if requested and available
        if (show_inherited && classEntry.inherits) {
            text += `## Inheritance\n**Inherits from:** ${classEntry.inherits}\n\n`;
        }
        
        // Metadata
        text += `---\n`;
        text += `*TouchDesigner Python API documentation`;
        if (classEntry.enhanced) {
            text += ` | Enhanced with method details`;
        }
        text += `*\n`;
        
        console.log(`[get_python_api] Returning response for ${classEntry.className}`);
        return {
            content: [{
                type: "text",
                text
            }]
        };
        
    } catch (error) {
        console.error('[get_python_api] Error:', error);
        return {
            content: [{
                type: "text",
                text: `Failed to retrieve Python API documentation: ${error.message}`
            }]
        };
    }
}