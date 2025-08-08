/**
 * Get Python API documentation tool
 * Provides access to TouchDesigner Python class documentation
 */

export const schema = {
    type: "object",
    properties: {
        class_name: {
            type: "string",
            description: "Python class name (e.g., 'CHOP', 'Channel', 'App')"
        },
        show_members: {
            type: "boolean",
            description: "Show class members/properties",
            default: true
        },
        show_methods: {
            type: "boolean",
            description: "Show class methods",
            default: true
        },
        show_inherited: {
            type: "boolean",
            description: "Show inherited members and methods",
            default: false
        }
    },
    required: ["class_name"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#"
};

export async function handler({ class_name, show_members = true, show_methods = true, show_inherited = false }, { wikiSystem }) {
    try {
        // Normalize class name
        const normalizedName = class_name.replace(/class$/i, '').trim();
        
        // Search for Python class entry
        const pythonClasses = wikiSystem.getPythonClasses();
        const classEntry = pythonClasses.find(c => 
            c.className.toLowerCase() === normalizedName.toLowerCase() ||
            c.displayName.toLowerCase() === normalizedName.toLowerCase()
        );
        
        if (!classEntry) {
            // List available classes for helpful error message
            const availableClasses = pythonClasses
                .map(c => c.className)
                .sort()
                .slice(0, 10);
                
            return {
                error: `Python class '${class_name}' not found`,
                suggestion: `Available classes include: ${availableClasses.join(', ')}...`,
                total_classes: pythonClasses.length
            };
        }
        
        // Build response
        const response = {
            class_name: classEntry.className,
            display_name: classEntry.displayName,
            description: classEntry.description,
            category: classEntry.category
        };
        
        // Add members if requested
        if (show_members && classEntry.members) {
            response.members = classEntry.members.map(member => ({
                name: member.name,
                type: member.returnType,
                read_only: member.readOnly,
                description: member.description
            }));
            response.member_count = classEntry.members.length;
        }
        
        // Add methods if requested
        if (show_methods && classEntry.methods) {
            response.methods = classEntry.methods.map(method => ({
                name: method.name,
                signature: method.signature,
                return_type: method.returnType,
                description: method.description,
                parameters: method.parameters
            }));
            response.method_count = classEntry.methods.length;
        }
        
        // Add inheritance info if requested and available
        if (show_inherited && classEntry.inherits) {
            response.inherits_from = classEntry.inherits;
        }
        
        return response;
        
    } catch (error) {
        return {
            error: 'Failed to retrieve Python API documentation',
            details: error.message
        };
    }
}