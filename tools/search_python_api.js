/**
 * Search Python API documentation tool
 * Search across TouchDesigner Python classes, methods, and members
 */

export const schema = {
    type: "object",
    properties: {
        query: {
            type: "string",
            description: "Search query for Python API"
        },
        search_in: {
            type: "string",
            description: "Where to search: 'all', 'classes', 'methods', 'members'",
            default: "all"
        },
        category: {
            type: "string",
            description: "Filter by category (e.g., 'Operator', 'Component', 'General')"
        },
        limit: {
            type: "number",
            description: "Maximum number of results to return",
            default: 20
        }
    },
    required: ["query"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#"
};

export async function handler({ query, search_in = "all", category, limit = 20 }, { wikiSystem }) {
    try {
        const results = {
            classes: [],
            methods: [],
            members: [],
            total_results: 0
        };
        
        const queryLower = query.toLowerCase();
        const pythonClasses = wikiSystem.getPythonClasses();
        
        // Search through Python classes
        for (const classEntry of pythonClasses) {
            // Filter by category if specified
            if (category && classEntry.category !== category) {
                continue;
            }
            
            // Search in class names and descriptions
            if (search_in === "all" || search_in === "classes") {
                if (classEntry.className.toLowerCase().includes(queryLower) ||
                    classEntry.description.toLowerCase().includes(queryLower)) {
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
                        method.description.toLowerCase().includes(queryLower) ||
                        method.signature.toLowerCase().includes(queryLower)) {
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
                        member.description.toLowerCase().includes(queryLower)) {
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
        
        return results;
        
    } catch (error) {
        return {
            error: 'Failed to search Python API documentation',
            details: error.message
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