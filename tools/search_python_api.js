/**
 * Search Python API documentation tool
 * Search across TouchDesigner Python classes, methods, and members
 */

import { z } from "zod";

export const schema = {
    title: "Search Python API",
    description: "Search across TouchDesigner Python classes, methods, and members",
    inputSchema: {
        query: z.string().describe("Search query for Python API"),
        search_in: z.string().optional().describe("Where to search: 'all', 'classes', 'methods', 'members'"),
        category: z.string().optional().describe("Filter by category (e.g., 'Operator', 'Component', 'General')"),
        limit: z.number().optional().describe("Maximum number of results to return")
    }
};

export async function handler({ query, search_in = "all", category, limit = 20 }, { operatorDataManager }) {
    console.log(`[search_python_api] Searching for: ${query}, search_in: ${search_in}, category: ${category}`);
    
    try {
        // Check if operatorDataManager is available
        if (!operatorDataManager) {
            console.error('[search_python_api] operatorDataManager is not available');
            return {
                content: [{
                    type: "text",
                    text: "Wiki system not initialized. The wiki system is not available for Python API queries."
                }]
            };
        }
        
        const results = {
            classes: [],
            methods: [],
            members: [],
            total_results: 0
        };
        
        const queryLower = query.toLowerCase();
        const pythonClasses = operatorDataManager.getPythonClasses();
        console.log(`[search_python_api] Searching through ${pythonClasses.length} Python classes`);
        
        // Search through Python classes
        for (const classEntry of pythonClasses) {
            // Filter by category if specified
            if (category && classEntry.category !== category) {
                continue;
            }
            
            // Search in class names and descriptions
            if (search_in === "all" || search_in === "classes") {
                if (classEntry.className.toLowerCase().includes(queryLower) ||
                    (classEntry.description && classEntry.description.toLowerCase().includes(queryLower))) {
                    results.classes.push({
                        class_name: classEntry.className,
                        description: classEntry.description,
                        category: classEntry.category,
                        relevance: calculateRelevance(classEntry.className, query)
                    });
                }
            }
            
            // Search in methods
            if ((search_in === "all" || search_in === "methods") && classEntry.methods) {
                for (const method of classEntry.methods) {
                    if (method.name.toLowerCase().includes(queryLower) ||
                        (method.description && method.description.toLowerCase().includes(queryLower)) ||
                        (method.signature && method.signature.toLowerCase().includes(queryLower))) {
                        results.methods.push({
                            class_name: classEntry.className,
                            method_name: method.name,
                            signature: method.signature,
                            description: method.description,
                            relevance: calculateRelevance(method.name, query)
                        });
                    }
                }
            }
            
            // Search in members
            if ((search_in === "all" || search_in === "members") && classEntry.members) {
                for (const member of classEntry.members) {
                    if (member.name.toLowerCase().includes(queryLower) ||
                        (member.description && member.description.toLowerCase().includes(queryLower))) {
                        results.members.push({
                            class_name: classEntry.className,
                            member_name: member.name,
                            type: member.returnType,
                            read_only: member.readOnly,
                            description: member.description,
                            relevance: calculateRelevance(member.name, query)
                        });
                    }
                }
            }
        }
        
        console.log(`[search_python_api] Found ${results.classes.length} classes, ${results.methods.length} methods, ${results.members.length} members`);
        
        // Sort by relevance and limit results
        results.classes.sort((a, b) => b.relevance - a.relevance);
        results.methods.sort((a, b) => b.relevance - a.relevance);
        results.members.sort((a, b) => b.relevance - a.relevance);
        
        results.classes = results.classes.slice(0, limit);
        results.methods = results.methods.slice(0, limit);
        results.members = results.members.slice(0, limit);
        
        results.total_results = results.classes.length + results.methods.length + results.members.length;
        
        // Build formatted response text
        let text = `# Python API Search Results for "${query}"\n\n`;
        
        const filters = [];
        if (search_in !== "all") filters.push(`Search scope: ${search_in}`);
        if (category) filters.push(`Category: ${category}`);
        
        if (filters.length > 0) {
            text += `**Filters:** ${filters.join(' | ')}\n\n`;
        }
        
        if (results.total_results === 0) {
            text += `No Python API results found for "${query}".\n\n`;
            text += `**Search Tips:**\n`;
            text += `• Try a broader search term\n`;
            text += `• Remove category filters\n`;
            text += `• Search across all sections (classes, methods, members)\n`;
            text += `• Check spelling\n`;
        } else {
            text += `Found **${results.total_results}** total results:\n\n`;
            
            // Show class results
            if (results.classes.length > 0) {
                text += `## Classes (${results.classes.length})\n\n`;
                results.classes.forEach((cls, i) => {
                    text += `${i + 1}. **${cls.class_name}** (${cls.category})\n`;
                    text += `   ${cls.description || 'No description available'}\n\n`;
                });
            }
            
            // Show method results
            if (results.methods.length > 0) {
                text += `## Methods (${results.methods.length})\n\n`;
                results.methods.forEach((method, i) => {
                    text += `${i + 1}. **${method.class_name}.${method.method_name}()**\n`;
                    if (method.signature) {
                        text += `   **Signature:** \`${method.signature}\`\n`;
                    }
                    if (method.description) {
                        text += `   ${method.description}\n`;
                    }
                    text += `\n`;
                });
            }
            
            // Show member results
            if (results.members.length > 0) {
                text += `## Members (${results.members.length})\n\n`;
                results.members.forEach((member, i) => {
                    text += `${i + 1}. **${member.class_name}.${member.member_name}** (${member.type || 'Unknown'})`;
                    if (member.read_only) {
                        text += ` *[Read Only]*`;
                    }
                    text += `\n`;
                    if (member.description) {
                        text += `   ${member.description}\n`;
                    }
                    text += `\n`;
                });
            }
        }
        
        // Summary
        text += `---\n`;
        text += `*TouchDesigner Python API search | ${results.total_results} results found*\n`;
        
        console.log(`[search_python_api] Returning ${results.total_results} total results`);
        return {
            content: [{
                type: "text",
                text
            }]
        };
        
    } catch (error) {
        console.error('[search_python_api] Error:', error);
        return {
            content: [{
                type: "text",
                text: `Failed to search Python API documentation: ${error.message}`
            }]
        };
    }
}

function calculateRelevance(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match gets highest score
    if (textLower === queryLower) return 100;
    
    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) return 80;
    
    // Contains as whole word
    if (textLower.includes(' ' + queryLower) || textLower.includes(queryLower + ' ')) return 60;
    
    // Contains query
    if (textLower.includes(queryLower)) return 40;
    
    return 0;
}