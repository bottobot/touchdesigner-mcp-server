/**
 * Parameter - Data model for TouchDesigner operator parameters
 * Represents individual parameters with their properties, constraints, and metadata
 */

export class Parameter {
    /**
     * Create a new Parameter instance
     * @param {Object} data - Initial parameter data
     */
    constructor(data = {}) {
        // Core identification
        this.id = data.id || null;
        this.name = data.name || '';
        this.label = data.label || data.name || '';
        this.group = data.group || '';
        this.page = data.page || '';
        
        // Parameter type and properties
        this.type = data.type || ''; // Float, Int, String, Toggle, Menu, etc.
        this.dataType = data.dataType || 'number'; // number, string, boolean, array
        this.style = data.style || ''; // UI style (slider, field, menu, etc.)
        
        // Value constraints
        this.defaultValue = data.defaultValue !== undefined ? data.defaultValue : null;
        this.minValue = data.minValue !== undefined ? data.minValue : null;
        this.maxValue = data.maxValue !== undefined ? data.maxValue : null;
        this.step = data.step !== undefined ? data.step : null;
        
        // Menu/choice parameters
        this.menuItems = data.menuItems || [];
        this.menuLabels = data.menuLabels || [];
        this.allowCustom = data.allowCustom || false;
        
        // String parameters
        this.maxLength = data.maxLength || null;
        this.pattern = data.pattern || null; // Regex pattern
        
        // Multi-value parameters
        this.isArray = data.isArray || false;
        this.arraySize = data.arraySize || 1;
        this.dimensions = data.dimensions || 1; // 1D, 2D, 3D, 4D for vectors
        
        // Documentation
        this.description = data.description || '';
        this.tooltip = data.tooltip || '';
        this.help = data.help || '';
        this.units = data.units || '';
        this.examples = data.examples || [];
        
        // Behavior flags
        this.isReadOnly = data.isReadOnly || false;
        this.isAdvanced = data.isAdvanced || false;
        this.isHidden = data.isHidden || false;
        this.isAnimatable = data.isAnimatable !== undefined ? data.isAnimatable : true;
        this.isExpression = data.isExpression || false;
        this.isPython = data.isPython || false;
        
        // Relationships
        this.dependsOn = data.dependsOn || []; // Other parameters this depends on
        this.affects = data.affects || []; // Parameters this affects
        this.linkedTo = data.linkedTo || []; // Parameters linked to this one
        
        // Expression and scripting
        this.expressionLanguage = data.expressionLanguage || ''; // python, tscript, etc.
        this.defaultExpression = data.defaultExpression || '';
        this.commonExpressions = data.commonExpressions || [];
        
        // UI and display
        this.order = data.order || 0;
        this.isVisible = data.isVisible !== undefined ? data.isVisible : true;
        this.conditionalDisplay = data.conditionalDisplay || null;
        
        // Validation and processing
        this.isValid = data.isValid !== undefined ? data.isValid : true;
        this.validationErrors = data.validationErrors || [];
        this.lastUpdated = data.lastUpdated || new Date().toISOString();
        
        // Raw extraction data
        this.rawData = data.rawData || {};
        this.sourceElement = data.sourceElement || null;
    }

    /**
     * Validate the parameter data
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validate() {
        const errors = [];
        
        // Required fields
        if (!this.name) errors.push('Parameter name is required');
        if (!this.type) errors.push('Parameter type is required');
        
        // Type validation
        const validTypes = [
            'Float', 'Int', 'String', 'Toggle', 'Menu', 'Pulse', 'Momentary',
            'File', 'Folder', 'Color', 'UV', 'XY', 'XYZ', 'XYZW', 'WH',
            'OP', 'CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'
        ];
        
        if (this.type && !validTypes.includes(this.type)) {
            errors.push(`Invalid parameter type: ${this.type}`);
        }
        
        // Value range validation
        if (this.minValue !== null && this.maxValue !== null && this.minValue > this.maxValue) {
            errors.push('Minimum value cannot be greater than maximum value');
        }
        
        // Default value validation
        if (this.defaultValue !== null && this.minValue !== null && this.defaultValue < this.minValue) {
            errors.push('Default value is below minimum value');
        }
        
        if (this.defaultValue !== null && this.maxValue !== null && this.defaultValue > this.maxValue) {
            errors.push('Default value is above maximum value');
        }
        
        // Menu validation
        if (this.type === 'Menu' && this.menuItems.length === 0) {
            errors.push('Menu parameters must have menu items');
        }
        
        // Array validation
        if (this.isArray && this.arraySize < 1) {
            errors.push('Array size must be at least 1');
        }
        
        this.validationErrors = errors;
        this.isValid = errors.length === 0;
        
        return {
            isValid: this.isValid,
            errors: this.validationErrors
        };
    }

    /**
     * Get parameter summary for display
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            label: this.label,
            type: this.type,
            group: this.group,
            defaultValue: this.defaultValue,
            description: this.description,
            isAdvanced: this.isAdvanced,
            isAnimatable: this.isAnimatable
        };
    }

    /**
     * Check if parameter matches search criteria
     * @param {string} query - Search query
     * @returns {Object} Match result with score and details
     */
    matches(query) {
        const queryLower = query.toLowerCase();
        let score = 0;
        const matches = [];
        
        // Name matching (highest priority)
        if (this.name.toLowerCase().includes(queryLower)) {
            score += 10;
            matches.push({ field: 'name', content: this.name });
        }
        
        // Label matching
        if (this.label.toLowerCase().includes(queryLower)) {
            score += 8;
            matches.push({ field: 'label', content: this.label });
        }
        
        // Description matching
        if (this.description.toLowerCase().includes(queryLower)) {
            score += 5;
            matches.push({ field: 'description', content: this.description });
        }
        
        // Group matching
        if (this.group.toLowerCase().includes(queryLower)) {
            score += 3;
            matches.push({ field: 'group', content: this.group });
        }
        
        // Type matching
        if (this.type.toLowerCase().includes(queryLower)) {
            score += 2;
            matches.push({ field: 'type', content: this.type });
        }
        
        return {
            score,
            matches,
            parameter: this.getSummary()
        };
    }

    /**
     * Get formatted value based on parameter type
     * @param {*} value - Raw value to format
     * @returns {string} Formatted value string
     */
    formatValue(value) {
        if (value === null || value === undefined) return '';
        
        switch (this.type) {
            case 'Float':
                return parseFloat(value).toFixed(3);
            case 'Int':
                return parseInt(value).toString();
            case 'Toggle':
                return value ? 'On' : 'Off';
            case 'Menu':
                const index = parseInt(value);
                return this.menuLabels[index] || this.menuItems[index] || value.toString();
            case 'Color':
                if (Array.isArray(value)) {
                    return `rgb(${value.map(v => Math.round(v * 255)).join(', ')})`;
                }
                return value.toString();
            default:
                return value.toString();
        }
    }

    /**
     * Generate parameter documentation
     * @returns {string} Formatted documentation
     */
    generateDocumentation() {
        let doc = `**${this.label || this.name}** (${this.type})`;
        
        if (this.description) {
            doc += `\n${this.description}`;
        }
        
        if (this.defaultValue !== null) {
            doc += `\nDefault: ${this.formatValue(this.defaultValue)}`;
        }
        
        if (this.minValue !== null || this.maxValue !== null) {
            doc += `\nRange: ${this.minValue || '∞'} to ${this.maxValue || '∞'}`;
        }
        
        if (this.units) {
            doc += `\nUnits: ${this.units}`;
        }
        
        if (this.menuItems.length > 0) {
            doc += `\nOptions: ${this.menuItems.join(', ')}`;
        }
        
        if (this.examples.length > 0) {
            doc += `\nExamples: ${this.examples.join(', ')}`;
        }
        
        return doc;
    }

    /**
     * Convert to JSON-serializable object
     * @param {boolean} includeRawData - Whether to include raw extraction data
     * @returns {Object} Serializable object
     */
    toJSON(includeRawData = false) {
        const data = { ...this };
        
        if (!includeRawData) {
            delete data.rawData;
            delete data.sourceElement;
        }
        
        return data;
    }

    /**
     * Create Parameter from JSON data
     * @param {Object} jsonData - JSON data to restore from
     * @returns {Parameter} New Parameter instance
     */
    static fromJSON(jsonData) {
        return new Parameter(jsonData);
    }

    /**
     * Generate a unique ID for the parameter
     * @param {string} operatorName - Parent operator name
     * @param {string} paramName - Parameter name
     * @returns {string} Generated ID
     */
    static generateId(operatorName, paramName) {
        const cleanOp = operatorName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const cleanParam = paramName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        return `${cleanOp}_${cleanParam}`;
    }

    /**
     * Parse parameter type from TouchDesigner documentation
     * @param {string} typeString - Raw type string from documentation
     * @returns {Object} Parsed type information
     */
    static parseType(typeString) {
        const type = typeString.trim();
        
        // Common type mappings
        const typeMap = {
            'float': 'Float',
            'integer': 'Int',
            'int': 'Int',
            'string': 'String',
            'toggle': 'Toggle',
            'menu': 'Menu',
            'pulse': 'Pulse',
            'momentary': 'Momentary',
            'file': 'File',
            'folder': 'Folder',
            'rgb': 'Color',
            'rgba': 'Color',
            'uv': 'UV',
            'xy': 'XY',
            'xyz': 'XYZ',
            'xyzw': 'XYZW',
            'wh': 'WH'
        };
        
        const normalizedType = type.toLowerCase();
        const mappedType = typeMap[normalizedType] || type;
        
        // Detect array types
        const isArray = type.includes('[') || type.includes('vector') || type.includes('array');
        let arraySize = 1;
        
        if (isArray) {
            const sizeMatch = type.match(/\[(\d+)\]/);
            if (sizeMatch) {
                arraySize = parseInt(sizeMatch[1]);
            }
        }
        
        return {
            type: mappedType,
            isArray,
            arraySize,
            dataType: this.inferDataType(mappedType)
        };
    }

    /**
     * Infer JavaScript data type from TouchDesigner parameter type
     * @param {string} tdType - TouchDesigner parameter type
     * @returns {string} JavaScript data type
     */
    static inferDataType(tdType) {
        switch (tdType) {
            case 'Float':
            case 'Int':
                return 'number';
            case 'Toggle':
                return 'boolean';
            case 'String':
            case 'File':
            case 'Folder':
                return 'string';
            case 'Menu':
                return 'number'; // Menu indices are numbers
            case 'Color':
            case 'UV':
            case 'XY':
            case 'XYZ':
            case 'XYZW':
            case 'WH':
                return 'array';
            default:
                return 'string';
        }
    }
}

export default Parameter;