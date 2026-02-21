/**
 * Get Python API documentation tool
 * Provides access to TouchDesigner Python class documentation.
 * v2.8: Added optional 'version' parameter for version-context display.
 */

import { z } from "zod";
import { normalizeVersion, getPythonCompatInfo, getVersionInfo, getVersionIndex, loadPythonApiCompat } from "../wiki/utils/version-filter.js";

export const schema = {
    title: "Get Python API Documentation",
    description: "Get documentation for a TouchDesigner Python class. " +
        "Optionally filter to show only API available in a specific TD version.",
    inputSchema: {
        class_name: z.string().describe("Python class name (e.g., 'CHOP', 'Channel', 'App')"),
        show_members: z.boolean().optional().describe("Show class members/properties"),
        show_methods: z.boolean().optional().describe("Show class methods"),
        show_inherited: z.boolean().optional().describe("Show inherited members and methods"),
        version: z.string().optional().describe(
            "Filter to show only methods/members available in a specific TD version " +
            "(e.g. '2023', '2022', '2021', '2020', '2019', '099'). " +
            "Methods added after this version are marked or excluded."
        )
    }
};

export async function handler({ class_name, show_members = true, show_methods = true, show_inherited = false, version }, { operatorDataManager }) {
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

        // Resolve version filtering
        const canonicalVersion = version ? normalizeVersion(version) : null;
        let versionTargetIdx = -1;
        let pyApiData = null;
        const versionOrder = ['099', '2019', '2020', '2021', '2022', '2023', '2024'];

        if (canonicalVersion) {
            versionTargetIdx = await getVersionIndex(canonicalVersion);
            pyApiData = await loadPythonApiCompat();
        }

        // Helper: check if a method/member was available in the target version
        function isAvailableInVersion(memberName, memberType) {
            if (!canonicalVersion || versionTargetIdx === -1 || !pyApiData) return true;
            const classApiData = pyApiData.classes[classEntry.className];
            if (!classApiData) return true;
            const collection = memberType === 'method' ? classApiData.methods : classApiData.members;
            if (!collection || !collection[memberName]) return true;
            const memberData = collection[memberName];
            if (!memberData.addedIn) return true;
            const addedIdx = versionOrder.indexOf(memberData.addedIn);
            return addedIdx === -1 || addedIdx <= versionTargetIdx;
        }

        // Helper: get the version a member was added (for annotations)
        function getAddedInVersion(memberName, memberType) {
            if (!pyApiData) return null;
            const classApiData = pyApiData.classes[classEntry.className];
            if (!classApiData) return null;
            const collection = memberType === 'method' ? classApiData.methods : classApiData.members;
            if (!collection || !collection[memberName]) return null;
            return collection[memberName].addedIn || null;
        }

        // Build formatted response text
        let text = `# ${classEntry.displayName || classEntry.className}\n\n`;
        text += `**Category:** ${classEntry.category}\n\n`;

        // Version context note
        if (canonicalVersion) {
            const vInfo = await getVersionInfo(canonicalVersion);
            text += `**Version context:** TD ${canonicalVersion}`;
            if (vInfo) text += ` (Python ${vInfo.pythonVersion})`;
            text += ` — showing only API available in this version.\n\n`;
        }

        text += `## Description\n${classEntry.description}\n\n`;

        // Add members if requested
        if (show_members && classEntry.members) {
            const filteredMembers = classEntry.members.filter(m => isAvailableInVersion(m.name, 'member'));
            text += `## Members (${filteredMembers.length} total${canonicalVersion && filteredMembers.length < classEntry.members.length ? `, ${classEntry.members.length - filteredMembers.length} excluded for TD ${canonicalVersion}` : ''})\n\n`;
            filteredMembers.forEach(member => {
                const addedIn = getAddedInVersion(member.name, 'member');
                text += `• **${member.name}** (${member.returnType || 'Unknown'})`;
                if (member.readOnly) {
                    text += ` *[Read Only]*`;
                }
                if (addedIn && addedIn !== '099') {
                    text += ` *(added in TD ${addedIn})*`;
                }
                text += `\n  ${member.description}\n\n`;
            });
            console.log(`[get_python_api] Added ${filteredMembers.length} members`);
        }

        // Add methods if requested
        if (show_methods && classEntry.methods) {
            const filteredMethods = classEntry.methods.filter(m => isAvailableInVersion(m.name, 'method'));
            text += `## Methods (${filteredMethods.length} total${canonicalVersion && filteredMethods.length < classEntry.methods.length ? `, ${classEntry.methods.length - filteredMethods.length} excluded for TD ${canonicalVersion}` : ''})\n\n`;
            filteredMethods.forEach(method => {
                const addedIn = getAddedInVersion(method.name, 'method');
                text += `### ${method.name}()\n`;
                if (addedIn && addedIn !== '099') {
                    text += `*Added in TD ${addedIn}*\n\n`;
                }
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
            console.log(`[get_python_api] Added ${filteredMethods.length} methods`);
        }

        // Add inheritance info if requested and available
        if (show_inherited && classEntry.inherits) {
            text += `## Inheritance\n**Inherits from:** ${classEntry.inherits}\n\n`;
        }

        // Metadata
        text += `---\n`;
        text += `*TouchDesigner Python API documentation`;
        if (canonicalVersion) {
            text += ` | Filtered for TD ${canonicalVersion}`;
        }
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