import WikiEntry from './wiki-entry.js';

/**
 * SearchIndex - Advanced search indexing and retrieval system for WikiEntry data
 * Provides full-text search, relevance scoring, and faceted search capabilities
 */

export class SearchIndex {
    /**
     * Create a new SearchIndex instance
     * @param {Object} options - Index configuration options
     */
    constructor(options = {}) {
        // Configuration
        this.options = {
            stemming: options.stemming !== undefined ? options.stemming : true,
            stopWords: options.stopWords !== undefined ? options.stopWords : true,
            caseSensitive: options.caseSensitive || false,
            minQueryLength: options.minQueryLength || 2,
            maxResults: options.maxResults || 100,
            ...options
        };
        
        // Index storage
        this.entries = new Map(); // id -> WikiEntry
        this.wordIndex = new Map(); // word -> Set of entry IDs
        this.fieldIndex = new Map(); // field -> word -> Set of entry IDs
        this.categoryIndex = new Map(); // category -> Set of entry IDs
        this.tagIndex = new Map(); // tag -> Set of entry IDs
        
        // Statistics
        this.stats = {
            totalEntries: 0,
            totalWords: 0,
            lastUpdated: null,
            indexSize: 0
        };
        
        // Stop words for filtering
        this.stopWords = new Set([
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'or', 'but', 'not', 'this', 'these',
            'they', 'their', 'them', 'we', 'you', 'your', 'our', 'us'
        ]);
    }

    /**
     * Add or update a WikiEntry in the index
     * @param {WikiEntry} entry - Wiki entry to index
     */
    addEntry(entry) {
        if (!entry || !entry.id) {
            throw new Error('Invalid entry: must have an ID');
        }
        
        // Remove existing entry if updating
        if (this.entries.has(entry.id)) {
            this.removeEntry(entry.id);
        }
        
        // Store the entry
        this.entries.set(entry.id, entry);
        
        // Index all searchable fields
        this.indexEntryFields(entry);
        
        // Update category index
        if (entry.category) {
            if (!this.categoryIndex.has(entry.category)) {
                this.categoryIndex.set(entry.category, new Set());
            }
            this.categoryIndex.get(entry.category).add(entry.id);
        }
        
        // Update tag index
        entry.tags.forEach(tag => {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag).add(entry.id);
        });
        
        // Update statistics
        this.updateStats();
    }

    /**
     * Remove an entry from the index
     * @param {string} entryId - ID of entry to remove
     */
    removeEntry(entryId) {
        const entry = this.entries.get(entryId);
        if (!entry) return;
        
        // Remove from word indices
        this.removeFromWordIndex(entry);
        
        // Remove from category index
        if (entry.category && this.categoryIndex.has(entry.category)) {
            this.categoryIndex.get(entry.category).delete(entryId);
            if (this.categoryIndex.get(entry.category).size === 0) {
                this.categoryIndex.delete(entry.category);
            }
        }
        
        // Remove from tag index
        entry.tags.forEach(tag => {
            if (this.tagIndex.has(tag)) {
                this.tagIndex.get(tag).delete(entryId);
                if (this.tagIndex.get(tag).size === 0) {
                    this.tagIndex.delete(tag);
                }
            }
        });
        
        // Remove entry
        this.entries.delete(entryId);
        
        // Update statistics
        this.updateStats();
    }

    /**
     * Search the index with advanced options
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Search results with relevance scores
     */
    search(query, options = {}) {
        const searchOptions = {
            category: options.category || null,
            tags: options.tags || [],
            fields: options.fields || ['name', 'description', 'keywords', 'parameters'],
            fuzzy: options.fuzzy || false,
            exact: options.exact || false,
            limit: options.limit || this.options.maxResults,
            threshold: options.threshold || 0.1,
            ...options
        };
        
        if (!query || query.length < this.options.minQueryLength) {
            return [];
        }
        
        // Normalize and tokenize query
        const queryTerms = this.tokenize(query);
        if (queryTerms.length === 0) return [];
        
        // Get candidate entries
        let candidates = this.getCandidateEntries(queryTerms, searchOptions);
        
        // Apply category filter
        if (searchOptions.category) {
            candidates = this.filterByCategory(candidates, searchOptions.category);
        }
        
        // Apply tag filters
        if (searchOptions.tags.length > 0) {
            candidates = this.filterByTags(candidates, searchOptions.tags);
        }
        
        // Score and rank results
        const results = this.scoreResults(candidates, queryTerms, searchOptions);
        
        // Filter by threshold and limit
        return results
            .filter(result => result.score >= searchOptions.threshold)
            .slice(0, searchOptions.limit);
    }

    /**
     * Get search suggestions based on partial query
     * @param {string} partialQuery - Partial search query
     * @param {number} limit - Maximum suggestions to return
     * @returns {Array} Suggested completions
     */
    getSuggestions(partialQuery, limit = 10) {
        if (!partialQuery || partialQuery.length < 2) return [];
        
        const suggestions = new Set();
        const queryLower = partialQuery.toLowerCase();
        
        // Search in indexed words
        for (const word of this.wordIndex.keys()) {
            if (word.startsWith(queryLower)) {
                suggestions.add(word);
            }
        }
        
        // Search in operator names
        for (const entry of this.entries.values()) {
            if (entry.name.toLowerCase().startsWith(queryLower)) {
                suggestions.add(entry.name);
            }
        }
        
        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * Get faceted search information
     * @returns {Object} Facet data for filtering
     */
    getFacets() {
        const facets = {
            categories: {},
            tags: {},
            subcategories: {}
        };
        
        // Category facets
        for (const [category, entryIds] of this.categoryIndex) {
            facets.categories[category] = entryIds.size;
        }
        
        // Tag facets
        for (const [tag, entryIds] of this.tagIndex) {
            facets.tags[tag] = entryIds.size;
        }
        
        // Subcategory facets
        for (const entry of this.entries.values()) {
            if (entry.subcategory) {
                facets.subcategories[entry.subcategory] = 
                    (facets.subcategories[entry.subcategory] || 0) + 1;
            }
        }
        
        return facets;
    }

    /**
     * Index all searchable fields of an entry
     * @param {WikiEntry} entry - Entry to index
     */
    indexEntryFields(entry) {
        const fieldsToIndex = {
            name: entry.name,
            displayName: entry.displayName,
            description: entry.description,
            summary: entry.summary,
            details: entry.details,
            usage: entry.usage,
            keywords: entry.keywords.join(' '),
            tags: entry.tags.join(' ')
        };
        
        // Index parameters
        entry.parameters.forEach(param => {
            fieldsToIndex[`param_${param.name}`] = `${param.name} ${param.description}`;
        });
        
        // Index each field
        for (const [field, content] of Object.entries(fieldsToIndex)) {
            if (content) {
                this.indexField(entry.id, field, content);
            }
        }
    }

    /**
     * Index content for a specific field
     * @param {string} entryId - Entry ID
     * @param {string} field - Field name
     * @param {string} content - Content to index
     */
    indexField(entryId, field, content) {
        const words = this.tokenize(content);
        
        words.forEach(word => {
            // Add to general word index
            if (!this.wordIndex.has(word)) {
                this.wordIndex.set(word, new Set());
            }
            this.wordIndex.get(word).add(entryId);
            
            // Add to field-specific index
            if (!this.fieldIndex.has(field)) {
                this.fieldIndex.set(field, new Map());
            }
            if (!this.fieldIndex.get(field).has(word)) {
                this.fieldIndex.get(field).set(word, new Set());
            }
            this.fieldIndex.get(field).get(word).add(entryId);
        });
    }

    /**
     * Remove entry from word indices
     * @param {WikiEntry} entry - Entry to remove
     */
    removeFromWordIndex(entry) {
        // This is a simplified removal - in a production system,
        // you'd want to track which words belong to which entries more efficiently
        for (const [word, entryIds] of this.wordIndex) {
            entryIds.delete(entry.id);
            if (entryIds.size === 0) {
                this.wordIndex.delete(word);
            }
        }
        
        // Remove from field indices
        for (const fieldMap of this.fieldIndex.values()) {
            for (const [word, entryIds] of fieldMap) {
                entryIds.delete(entry.id);
                if (entryIds.size === 0) {
                    fieldMap.delete(word);
                }
            }
        }
    }

    /**
     * Tokenize text into searchable words
     * @param {string} text - Text to tokenize
     * @returns {Array} Array of normalized words
     */
    tokenize(text) {
        if (!text) return [];
        
        // Basic tokenization
        let words = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 2);
        
        // Remove stop words if enabled
        if (this.options.stopWords) {
            words = words.filter(word => !this.stopWords.has(word));
        }
        
        // Apply stemming if enabled (basic implementation)
        if (this.options.stemming) {
            words = words.map(word => this.stem(word));
        }
        
        return words;
    }

    /**
     * Basic stemming algorithm
     * @param {string} word - Word to stem
     * @returns {string} Stemmed word
     */
    stem(word) {
        // Very basic stemming - remove common suffixes
        const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 's'];
        
        for (const suffix of suffixes) {
            if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
                return word.slice(0, -suffix.length);
            }
        }
        
        return word;
    }

    /**
     * Get candidate entries that match query terms
     * @param {Array} queryTerms - Tokenized query terms
     * @param {Object} options - Search options
     * @returns {Set} Set of candidate entry IDs
     */
    getCandidateEntries(queryTerms, options) {
        const candidates = new Set();
        
        queryTerms.forEach((term, index) => {
            const termCandidates = new Set();
            
            // Exact matches
            if (this.wordIndex.has(term)) {
                this.wordIndex.get(term).forEach(id => termCandidates.add(id));
            }
            
            // Fuzzy matches if enabled
            if (options.fuzzy && term.length > 3) {
                for (const [word, entryIds] of this.wordIndex) {
                    if (this.isApproximateMatch(term, word)) {
                        entryIds.forEach(id => termCandidates.add(id));
                    }
                }
            }
            
            // For first term, add all candidates
            // For subsequent terms, intersect with existing candidates (AND operation)
            if (index === 0) {
                termCandidates.forEach(id => candidates.add(id));
            } else {
                const intersection = new Set();
                for (const id of candidates) {
                    if (termCandidates.has(id)) {
                        intersection.add(id);
                    }
                }
                candidates.clear();
                intersection.forEach(id => candidates.add(id));
            }
        });
        
        return candidates;
    }

    /**
     * Score and rank search results
     * @param {Set} candidates - Candidate entry IDs
     * @param {Array} queryTerms - Query terms
     * @param {Object} options - Search options
     * @returns {Array} Scored and ranked results
     */
    scoreResults(candidates, queryTerms, options) {
        const results = [];
        
        for (const entryId of candidates) {
            const entry = this.entries.get(entryId);
            if (!entry) continue;
            
            const searchResult = entry.search(queryTerms.join(' '), options);
            if (searchResult.score > 0) {
                results.push({
                    ...searchResult,
                    id: entryId,
                    entry: entry.getSummary()
                });
            }
        }
        
        // Sort by score (descending)
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Filter candidates by category
     * @param {Set} candidates - Candidate entry IDs
     * @param {string} category - Category to filter by
     * @returns {Set} Filtered candidates
     */
    filterByCategory(candidates, category) {
        const categoryEntries = this.categoryIndex.get(category);
        if (!categoryEntries) return new Set();
        
        const filtered = new Set();
        for (const id of candidates) {
            if (categoryEntries.has(id)) {
                filtered.add(id);
            }
        }
        return filtered;
    }

    /**
     * Filter candidates by tags
     * @param {Set} candidates - Candidate entry IDs
     * @param {Array} tags - Tags to filter by
     * @returns {Set} Filtered candidates
     */
    filterByTags(candidates, tags) {
        const filtered = new Set();
        
        for (const id of candidates) {
            const entry = this.entries.get(id);
            if (entry && tags.some(tag => entry.tags.includes(tag))) {
                filtered.add(id);
            }
        }
        
        return filtered;
    }

    /**
     * Check if two words are approximately equal (basic fuzzy matching)
     * @param {string} word1 - First word
     * @param {string} word2 - Second word
     * @returns {boolean} True if words are approximately equal
     */
    isApproximateMatch(word1, word2) {
        if (Math.abs(word1.length - word2.length) > 2) return false;
        
        // Simple edit distance check
        const maxDistance = Math.floor(Math.max(word1.length, word2.length) * 0.3);
        return this.levenshteinDistance(word1, word2) <= maxDistance;
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Edit distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i += 1) {
            matrix[0][i] = i;
        }
        
        for (let j = 0; j <= str2.length; j += 1) {
            matrix[j][0] = j;
        }
        
        for (let j = 1; j <= str2.length; j += 1) {
            for (let i = 1; i <= str1.length; i += 1) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Update index statistics
     */
    updateStats() {
        this.stats.totalEntries = this.entries.size;
        this.stats.totalWords = this.wordIndex.size;
        this.stats.lastUpdated = new Date().toISOString();
        this.stats.indexSize = this.calculateIndexSize();
    }

    /**
     * Calculate approximate index size in bytes
     * @returns {number} Estimated size in bytes
     */
    calculateIndexSize() {
        let size = 0;
        
        // Estimate entry storage
        size += this.entries.size * 1000; // Rough estimate per entry
        
        // Estimate word index storage
        for (const [word, entryIds] of this.wordIndex) {
            size += word.length * 2; // String storage
            size += entryIds.size * 8; // Set storage
        }
        
        return size;
    }

    /**
     * Get index statistics
     * @returns {Object} Index statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Clear the entire index
     */
    clear() {
        this.entries.clear();
        this.wordIndex.clear();
        this.fieldIndex.clear();
        this.categoryIndex.clear();
        this.tagIndex.clear();
        this.updateStats();
    }

    /**
     * Export index data for persistence
     * @returns {Object} Serializable index data
     */
    exportData() {
        return {
            entries: Array.from(this.entries.entries()).map(([id, entry]) => [id, entry.toJSON()]),
            stats: this.stats,
            options: this.options
        };
    }

    /**
     * Import index data from persistence
     * @param {Object} data - Previously exported data
     */
    importData(data) {
        this.clear();
        
        if (data.options) {
            this.options = { ...this.options, ...data.options };
        }
        
        if (data.entries) {
            data.entries.forEach(([id, entryData]) => {
                const entry = WikiEntry.fromJSON(entryData);
                this.addEntry(entry);
            });
        }
        
        if (data.stats) {
            this.stats = { ...this.stats, ...data.stats };
        }
    }
}

export default SearchIndex;