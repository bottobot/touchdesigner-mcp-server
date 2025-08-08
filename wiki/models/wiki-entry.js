/**
 * WikiEntry - Core data model for processed TouchDesigner HTM documentation
 * Represents a single operator or component with all its metadata, parameters, and content
 */

export class WikiEntry {
    /**
     * Create a new WikiEntry instance
     * @param {Object} data - Initial data for the wiki entry
     */
    constructor(data = {}) {
        // Core identification
        this.id = data.id || null;
        this.name = data.name || '';
        this.displayName = data.displayName || data.name || '';
        this.category = data.category || ''; // TOP, CHOP, SOP, DAT, MAT, COMP, POP
        this.subcategory = data.subcategory || '';
        
        // Metadata
        this.version = data.version || '';
        this.lastUpdated = data.lastUpdated || new Date().toISOString();
        this.sourceFile = data.sourceFile || '';
        this.url = data.url || '';
        
        // Documentation content
        this.description = data.description || '';
        this.summary = data.summary || '';
        this.details = data.details || '';
        this.usage = data.usage || '';
        this.tips = data.tips || [];
        this.warnings = data.warnings || [];
        
        // Parameters
        this.parameters = data.parameters || [];
        this.parameterGroups = data.parameterGroups || {};
        
        // Code and examples
        this.codeExamples = data.codeExamples || [];
        this.pythonExamples = data.pythonExamples || [];
        this.expressions = data.expressions || [];
        
        // Relationships and workflow
        this.commonInputs = data.commonInputs || [];
        this.commonOutputs = data.commonOutputs || [];
        this.relatedOperators = data.relatedOperators || [];
        this.workflowPatterns = data.workflowPatterns || [];
        
        // Media and assets
        this.images = data.images || [];
        this.videos = data.videos || [];
        this.assets = data.assets || [];
        
        // Search and indexing
        this.keywords = data.keywords || [];
        this.tags = data.tags || [];
        this.searchWeight = data.searchWeight || 1.0;
        this.contentHash = data.contentHash || '';
        
        // Processing metadata
        this.processingDate = data.processingDate || new Date().toISOString();
        this.processingVersion = data.processingVersion || '1.0.0';
        this.isValid = data.isValid !== undefined ? data.isValid : true;
        this.validationErrors = data.validationErrors || [];
        
        // Raw data preservation
        this.rawHtml = data.rawHtml || '';
        this.extractedSections = data.extractedSections || {};
    }

    /**
     * Validate the wiki entry data
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validate() {
        const errors = [];
        
        // Required fields validation
        if (!this.id) errors.push('ID is required');
        if (!this.name) errors.push('Name is required');
        if (!this.category) errors.push('Category is required');
        
        // Category validation
        const validCategories = ['TOP', 'CHOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
        if (this.category && !validCategories.includes(this.category)) {
            errors.push(`Invalid category: ${this.category}. Must be one of: ${validCategories.join(', ')}`);
        }
        
        // Parameters validation
        if (this.parameters && !Array.isArray(this.parameters)) {
            errors.push('Parameters must be an array');
        }
        
        // Search weight validation
        if (this.searchWeight < 0 || this.searchWeight > 10) {
            errors.push('Search weight must be between 0 and 10');
        }
        
        this.validationErrors = errors;
        this.isValid = errors.length === 0;
        
        return {
            isValid: this.isValid,
            errors: this.validationErrors
        };
    }

    /**
     * Get a summary object with key information
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            displayName: this.displayName,
            category: this.category,
            subcategory: this.subcategory,
            description: this.description,
            parameterCount: this.parameters.length,
            keywords: this.keywords,
            lastUpdated: this.lastUpdated
        };
    }

    /**
     * Search within this entry's content
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Object} Search result with relevance score
     */
    search(query, options = {}) {
        const queryLower = query.toLowerCase();
        let score = 0;
        const matches = [];
        
        // Name matching (highest priority)
        if (this.name.toLowerCase().includes(queryLower)) {
            score += 10;
            matches.push({ field: 'name', content: this.name });
        }
        
        // Description matching
        if (this.description.toLowerCase().includes(queryLower)) {
            score += 5;
            matches.push({ field: 'description', content: this.description });
        }
        
        // Keywords matching
        this.keywords.forEach(keyword => {
            if (keyword.toLowerCase().includes(queryLower)) {
                score += 3;
                matches.push({ field: 'keywords', content: keyword });
            }
        });
        
        // Parameter matching
        this.parameters.forEach(param => {
            if (param.name && param.name.toLowerCase().includes(queryLower)) {
                score += 2;
                matches.push({ field: 'parameter', content: param.name });
            }
        });
        
        // Apply search weight
        score *= this.searchWeight;
        
        return {
            score,
            matches,
            entry: this.getSummary()
        };
    }

    /**
     * Convert to JSON-serializable object
     * @param {boolean} includeRawData - Whether to include raw HTML and large data
     * @returns {Object} Serializable object
     */
    toJSON(includeRawData = false) {
        const data = { ...this };
        
        if (!includeRawData) {
            delete data.rawHtml;
            delete data.extractedSections;
        }
        
        return data;
    }

    /**
     * Create WikiEntry from JSON data
     * @param {Object} jsonData - JSON data to restore from
     * @returns {WikiEntry} New WikiEntry instance
     */
    static fromJSON(jsonData) {
        return new WikiEntry(jsonData);
    }

    /**
     * Generate a unique ID for the entry
     * @param {string} name - Operator name
     * @param {string} category - Operator category
     * @returns {string} Generated ID
     */
    static generateId(name, category) {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const cleanCategory = category.toLowerCase();
        return `${cleanCategory}_${cleanName}`;
    }

    /**
     * Calculate content hash for change detection
     * @param {string} content - Content to hash
     * @returns {string} Simple hash string
     */
    static calculateHash(content) {
        let hash = 0;
        if (!content || content.length === 0) return hash.toString();
        
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36);
    }
}

export default WikiEntry;