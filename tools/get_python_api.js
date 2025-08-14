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
                error: 'Wiki system not initialized',
                details: 'The wiki system is not available for Python API queries'
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
            
            return {
                error: `Python class '${class_name}' not found`,
                suggestion: `Available classes include: ${availableClasses.join(', ')}...`,
                total_classes: pythonClasses.length
            };
        }
        
        console.log(`[get_python_api] Found class: ${classEntry.className}`);
        
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
            console.log(`[get_python_api] Added ${response.member_count} members`);
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
            console.log(`[get_python_api] Added ${response.method_count} methods`);
        }
        
        // Add inheritance info if requested and available
        if (show_inherited && classEntry.inherits) {
            response.inherits_from = classEntry.inherits;
        }
        
        console.log(`[get_python_api] Returning response for ${classEntry.className}`);
        return response;
        
    } catch (error) {
        console.error('[get_python_api] Error:', error);
        return {
            error: 'Failed to retrieve Python API documentation',
            details: error.message,
            stack: error.stack
        };
    }
}