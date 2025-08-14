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
                error: 'Wiki system not initialized',
                details: 'The wiki system is not available for Python API queries'
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
        
        // Remove relevance scores from output
        results.classes.forEach(r => delete r.relevance);
        results.methods.forEach(r => delete r.relevance);
        results.members.forEach(r => delete r.relevance);
        
        results.total_results = results.classes.length + results.methods.length + results.members.length;
        
        // Add summary
        results.summary = `Found ${results.total_results} results for "${query}"`;
        if (category) {
            results.summary += ` in category "${category}"`;
        }
        
        console.log(`[search_python_api] Returning ${results.total_results} total results`);
        return results;
        
    } catch (error) {
        console.error('[search_python_api] Error:', error);
        return {
            error: 'Failed to search Python API documentation',
            details: error.message,
            stack: error.stack
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