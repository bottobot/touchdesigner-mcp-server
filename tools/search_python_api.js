/**
 * Search Python API documentation tool
 * Search across TouchDesigner Python classes, methods, and members.
 * v2.8: Added optional 'version' parameter for version-aware filtering.
 */

import { z } from "zod";
import { normalizeVersion, getPythonCompatInfo, getVersionIndex, loadPythonApiCompat } from "../wiki/utils/version-filter.js";

export const schema = {
    title: "Search Python API",
    description: "Search across TouchDesigner Python classes, methods, and members. " +
        "Optionally filter by TouchDesigner version to see only API available in that release.",
    inputSchema: {
        query: z.string().describe("Search query for Python API"),
        search_in: z.string().optional().describe("Where to search: 'all', 'classes', 'methods', 'members'"),
        category: z.string().optional().describe("Filter by category (e.g., 'Operator', 'Component', 'General')"),
        limit: z.number().optional().describe("Maximum number of results to return"),
        version: z.string().optional().describe(
            "Filter results to Python API available in a specific TD version " +
            "(e.g. '2023', '2022', '2021', '2020', '2019', '099'). " +
            "Methods/members introduced after this version are excluded."
        )
    }
};

export async function handler({ query, search_in = "all", category, limit = 20, version }, { operatorDataManager }) {
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

        // Version filtering (optional)
        const canonicalVersion = version ? normalizeVersion(version) : null;
        if (canonicalVersion) {
            const targetIdx = await getVersionIndex(canonicalVersion);
            const pyApiData = await loadPythonApiCompat();

            if (targetIdx !== -1) {
                // Filter methods: keep only those whose addedIn <= target version
                results.methods = results.methods.filter(m => {
                    const classData = pyApiData.classes[m.class_name];
                    if (!classData || !classData.methods) return true;
                    const methodData = classData.methods[m.method_name];
                    if (!methodData || !methodData.addedIn) return true;
                    const addedIdx = pyApiData.classes[m.class_name]
                        ? getVersionIndex(methodData.addedIn) : Promise.resolve(0);
                    // Sync fallback: compare strings directly against known order
                    const versionOrder = ['099', '2019', '2020', '2021', '2022', '2023', '2024'];
                    const addedIdxSync = versionOrder.indexOf(methodData.addedIn);
                    return addedIdxSync === -1 || addedIdxSync <= targetIdx;
                });

                // Filter members similarly
                results.members = results.members.filter(m => {
                    const classData = pyApiData.classes[m.class_name];
                    if (!classData || !classData.members) return true;
                    const memberData = classData.members[m.member_name];
                    if (!memberData || !memberData.addedIn) return true;
                    const versionOrder = ['099', '2019', '2020', '2021', '2022', '2023', '2024'];
                    const addedIdxSync = versionOrder.indexOf(memberData.addedIn);
                    return addedIdxSync === -1 || addedIdxSync <= targetIdx;
                });

                // Filter classes
                results.classes = results.classes.filter(cls => {
                    const classData = pyApiData.classes[cls.class_name];
                    if (!classData || !classData.addedIn) return true;
                    const versionOrder = ['099', '2019', '2020', '2021', '2022', '2023', '2024'];
                    const addedIdxSync = versionOrder.indexOf(classData.addedIn);
                    return addedIdxSync === -1 || addedIdxSync <= targetIdx;
                });
            }
        }

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
        if (canonicalVersion) filters.push(`TD Version: ${canonicalVersion}`);
        
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