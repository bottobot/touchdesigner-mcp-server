/**
 * Search Indexer - Advanced indexing and search processing for TouchDesigner wiki content
 * Handles building search indices, relevance scoring, and query processing
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import SearchIndex from '../models/search-index.js';
import WikiEntry from '../models/wiki-entry.js';

export class SearchIndexer {
    /**
     * Create a new search indexer instance
     * @param {Object} options - Indexer configuration options
     */
    constructor(options = {}) {
        this.options = {
            indexPath: options.indexPath || './wiki/data/search-index',
            enablePersistence: options.enablePersistence !== undefined ? options.enablePersistence : true,
            autoSave: options.autoSave !== undefined ? options.autoSave : true,
            autoSaveInterval: options.autoSaveInterval || 30000, // 30 seconds
            enableFuzzySearch: options.enableFuzzySearch !== undefined ? options.enableFuzzySearch : true,
            enableStemming: options.enableStemming !== undefined ? options.enableStemming : true,
            customStopWords: options.customStopWords || [],
            relevanceWeights: {
                nameMatch: options.nameMatch || 10,
                categoryMatch: options.categoryMatch || 8,
                descriptionMatch: options.descriptionMatch || 5,
                parameterMatch: options.parameterMatch || 3,
                keywordMatch: options.keywordMatch || 4,
                contentMatch: options.contentMatch || 2,
                ...options.relevanceWeights
            },
            ...options
        };
        
        // Initialize search index
        this.searchIndex = new SearchIndex({
            stemming: this.options.enableStemming,
            stopWords: true,
            caseSensitive: false,
            minQueryLength: 2,
            maxResults: this.options.maxResults || 100
        });
        
        // Add custom stop words
        if (this.options.customStopWords.length > 0) {
            this.options.customStopWords.forEach(word => {
                this.searchIndex.stopWords.add(word.toLowerCase());
            });
        }
        
        // Processing statistics
        this.stats = {
            totalEntries: 0,
            totalParameters: 0,
            indexSize: 0,
            lastIndexTime: null,
            searchQueries: 0,
            averageQueryTime: 0,
            popularQueries: new Map(),
            categoryDistribution: new Map(),
            processingErrors: []
        };
        
        // Auto-save interval
        this.autoSaveTimer = null;
        if (this.options.autoSave) {
            this.startAutoSave();
        }
        
        // Query processing cache
        this.queryCache = new Map();
        this.maxCacheSize = options.maxCacheSize || 1000;
        
        // Specialized TouchDesigner search patterns
        this.tdPatterns = {
            operatorTypes: /\b(top|chop|sop|dat|mat|comp|pop)\b/gi,
            parameterNames: /\b(translate|rotate|scale|resolution|format|active|cooking)\b/gi,
            commonTerms: /\b(noise|feedback|transform|render|audio|video|geometry|shader|texture|animation)\b/gi,
            expressions: /\b(me\.|op\(|abs\(|sin\(|cos\(|time\.|frame\.|fps)\b/gi,
            pythonKeywords: /\b(import|def|class|for|while|if|else|try|except|return)\b/gi
        };
    }

    /**
     * Index a single WikiEntry
     * @param {WikiEntry} entry - Wiki entry to index
     * @returns {Promise<void>}
     */
    async indexEntry(entry) {
        try {
            if (!entry || !entry.id) {
                console.warn('[Search Indexer] Skipping invalid entry: missing ID');
                throw new Error('Invalid entry: missing ID');
            }
            
            console.log(`[Search Indexer] Processing: ${entry.name} (${entry.category}) - ID: ${entry.id}`);
            
            // Add to search index
            this.searchIndex.addEntry(entry);
            
            // Update statistics
            this.updateIndexStats(entry);
            
            console.log(`[Search Indexer] ✓ Indexed: ${entry.name} (${entry.category}) - Parameters: ${entry.parameters?.length || 0}`);
            
        } catch (error) {
            console.error(`[Search Indexer] Error indexing entry ${entry?.id}:`, error);
            this.stats.processingErrors.push({
                entryId: entry?.id,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Index multiple WikiEntry objects
     * @param {Array} entries - Array of wiki entries to index
     * @param {Object} options - Indexing options
     * @returns {Promise<Object>} Indexing results
     */
    async indexEntries(entries, options = {}) {
        const results = {
            indexed: 0,
            errors: 0,
            skipped: 0,
            totalTime: 0,
            startTime: Date.now()
        };
        
        console.log(`[Search Indexer] ========================================`);
        console.log(`[Search Indexer] Starting bulk indexing operation`);
        console.log(`[Search Indexer] Total entries to process: ${entries.length}`);
        console.log(`[Search Indexer] ========================================`);
        
        const batchSize = options.batchSize || 50;
        const batches = this.createBatches(entries, batchSize);
        console.log(`[Search Indexer] Created ${batches.length} batches of size ${batchSize}`);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const batchStart = Date.now();
            console.log(`[Search Indexer] `);
            console.log(`[Search Indexer] >>> Batch ${i + 1}/${batches.length} (${batch.length} entries)`);
            
            const batchPromises = batch.map(async (entry) => {
                try {
                    await this.indexEntry(entry);
                    results.indexed++;
                } catch (error) {
                    results.errors++;
                    console.error(`[Search Indexer] ✗ Failed to index ${entry?.name || entry?.id || 'unknown'}:`, error.message);
                }
            });
            
            await Promise.all(batchPromises);
            
            const batchTime = Date.now() - batchStart;
            console.log(`[Search Indexer] <<< Batch ${i + 1} complete in ${batchTime}ms`);
            console.log(`[Search Indexer]     Progress: ${results.indexed + results.errors}/${entries.length} (${Math.round(((results.indexed + results.errors) / entries.length) * 100)}%)`);
            
            // Optional progress callback
            if (options.onProgress) {
                options.onProgress({
                    batch: i + 1,
                    totalBatches: batches.length,
                    processed: results.indexed + results.errors,
                    total: entries.length
                });
            }
        }
        
        results.totalTime = Date.now() - results.startTime;
        this.stats.lastIndexTime = new Date().toISOString();
        
        console.log(`[Search Indexer] ========================================`);
        console.log(`[Search Indexer] Indexing Complete!`);
        console.log(`[Search Indexer]   Successfully indexed: ${results.indexed}`);
        console.log(`[Search Indexer]   Failed: ${results.errors}`);
        console.log(`[Search Indexer]   Total time: ${results.totalTime}ms`);
        console.log(`[Search Indexer]   Average per entry: ${(results.totalTime / entries.length).toFixed(2)}ms`);
        console.log(`[Search Indexer] ========================================`);
        
        // Save index if persistence is enabled
        if (this.options.enablePersistence && results.indexed > 0) {
            console.log(`[Search Indexer] Saving index to disk...`);
            await this.saveIndex();
        }
        
        return results;
    }

    /**
     * Perform advanced search with relevance scoring
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results with metadata
     */
    async search(query, options = {}) {
        const searchStart = Date.now();
        
        try {
            // Validate query
            if (!query || typeof query !== 'string' || query.trim().length < 2) {
                return {
                    results: [],
                    query,
                    totalResults: 0,
                    searchTime: 0,
                    suggestions: await this.getSuggestions(query)
                };
            }
            
            const normalizedQuery = query.trim();
            
            // Check cache first
            const cacheKey = this.createCacheKey(normalizedQuery, options);
            if (this.queryCache.has(cacheKey)) {
                const cached = this.queryCache.get(cacheKey);
                cached.searchTime = Date.now() - searchStart;
                cached.cached = true;
                return cached;
            }
            
            // Enhance query with TouchDesigner-specific processing
            const enhancedOptions = this.enhanceSearchOptions(normalizedQuery, options);
            
            // Perform search using the SearchIndex
            const rawResults = this.searchIndex.search(normalizedQuery, enhancedOptions);
            
            // Post-process and enhance results
            const enhancedResults = await this.enhanceSearchResults(rawResults, normalizedQuery, enhancedOptions);
            
            // Apply additional TouchDesigner-specific scoring
            const scoredResults = this.applyTouchDesignerScoring(enhancedResults, normalizedQuery);
            
            // Sort by final relevance score
            scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            // Prepare response
            const searchResults = {
                results: scoredResults.slice(0, enhancedOptions.limit || 50),
                query: normalizedQuery,
                totalResults: scoredResults.length,
                searchTime: Date.now() - searchStart,
                facets: this.searchIndex.getFacets(),
                suggestions: scoredResults.length === 0 ? await this.getSuggestions(normalizedQuery) : [],
                queryEnhancements: this.analyzeQuery(normalizedQuery),
                cached: false
            };
            
            // Cache results
            this.cacheSearchResults(cacheKey, searchResults);
            
            // Update statistics
            this.updateSearchStats(normalizedQuery, searchResults);
            
            return searchResults;
            
        } catch (error) {
            console.error('[Search Indexer] Search error:', error);
            return {
                results: [],
                query,
                totalResults: 0,
                searchTime: Date.now() - searchStart,
                error: error.message,
                suggestions: await this.getSuggestions(query)
            };
        }
    }

    /**
     * Get contextual search suggestions
     * @param {string} partialQuery - Partial or failed query
     * @param {Object} options - Suggestion options
     * @returns {Promise<Array>} Array of suggestions
     */
    async getSuggestions(partialQuery, options = {}) {
        if (!partialQuery || partialQuery.length < 2) {
            return this.getPopularQueries(10);
        }
        
        const suggestions = new Set();
        const limit = options.limit || 10;
        
        // Get suggestions from search index
        const indexSuggestions = this.searchIndex.getSuggestions(partialQuery, limit);
        indexSuggestions.forEach(suggestion => suggestions.add(suggestion));
        
        // Add TouchDesigner-specific suggestions
        const tdSuggestions = this.getTouchDesignerSuggestions(partialQuery);
        tdSuggestions.forEach(suggestion => suggestions.add(suggestion));
        
        // Add popular queries that match
        const popularSuggestions = this.getPopularQueries(20).filter(query => 
            query.toLowerCase().includes(partialQuery.toLowerCase())
        );
        popularSuggestions.forEach(suggestion => suggestions.add(suggestion));
        
        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * Get search statistics and analytics
     * @returns {Object} Comprehensive search statistics
     */
    getSearchStats() {
        // Completely bulletproof Map handling
        let topQueries = [];
        let categoryDistribution = [];
        
        try {
            // Handle popularQueries
            if (this.stats.popularQueries instanceof Map) {
                topQueries = Array.from(this.stats.popularQueries.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
            } else if (this.stats.popularQueries && typeof this.stats.popularQueries === 'object') {
                // Convert from object to array format
                topQueries = Object.entries(this.stats.popularQueries)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                // Reinitialize as Map
                this.stats.popularQueries = new Map(Object.entries(this.stats.popularQueries));
            } else {
                this.stats.popularQueries = new Map();
            }
        } catch (error) {
            console.warn('[Search Indexer] Error processing popularQueries:', error.message);
            this.stats.popularQueries = new Map();
            topQueries = [];
        }
        
        try {
            // Handle categoryDistribution
            if (this.stats.categoryDistribution instanceof Map) {
                categoryDistribution = Array.from(this.stats.categoryDistribution.entries());
            } else if (this.stats.categoryDistribution && typeof this.stats.categoryDistribution === 'object') {
                // Convert from object to array format
                categoryDistribution = Object.entries(this.stats.categoryDistribution);
                // Reinitialize as Map
                this.stats.categoryDistribution = new Map(Object.entries(this.stats.categoryDistribution));
            } else {
                this.stats.categoryDistribution = new Map();
            }
        } catch (error) {
            console.warn('[Search Indexer] Error processing categoryDistribution:', error.message);
            this.stats.categoryDistribution = new Map();
            categoryDistribution = [];
        }
        
        return {
            ...this.stats,
            indexStats: this.searchIndex ? this.searchIndex.getStats() : {},
            cacheStats: {
                size: this.queryCache ? this.queryCache.size : 0,
                hitRate: this.calculateCacheHitRate()
            },
            topQueries,
            categoryDistribution
        };
    }

    /**
     * Save search index to disk
     * @returns {Promise<void>}
     */
    async saveIndex() {
        if (!this.options.enablePersistence) return;
        
        try {
            const indexData = this.searchIndex.exportData();
            // Prepare stats data with proper Map serialization
            const serializedStats = {
                ...this.stats,
                popularQueries: Array.from(this.stats.popularQueries.entries()),
                categoryDistribution: Array.from(this.stats.categoryDistribution.entries())
            };
            
            const statsData = {
                stats: serializedStats,
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            };
            
            // Ensure directory exists
            await fs.mkdir(this.options.indexPath, { recursive: true });
            
            // Save index data
            await fs.writeFile(
                join(this.options.indexPath, 'search-index.json'),
                JSON.stringify(indexData, null, 2)
            );
            
            // Save statistics
            await fs.writeFile(
                join(this.options.indexPath, 'search-stats.json'),
                JSON.stringify(statsData, null, 2)
            );
            
            const indexFile = join(this.options.indexPath, 'search-index.json');
            const statsFile = join(this.options.indexPath, 'search-stats.json');
            
            console.log(`[Search Indexer] ✓ Index saved to ${indexFile}`);
            console.log(`[Search Indexer] ✓ Stats saved to ${statsFile}`);
            console.log(`[Search Indexer] Index contains ${this.stats.totalEntries} entries with ${this.stats.totalParameters} total parameters`);
            
        } catch (error) {
            console.error('[Search Indexer] Error saving index:', error);
            throw error;
        }
    }

    /**
     * Load search index from disk
     * @returns {Promise<void>}
     */
    async loadIndex() {
        if (!this.options.enablePersistence) return;
        
        try {
            const indexPath = join(this.options.indexPath, 'search-index.json');
            const statsPath = join(this.options.indexPath, 'search-stats.json');
            
            // Load index data
            try {
                console.log(`[Search Indexer] Loading index from ${indexPath}...`);
                const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
                this.searchIndex.importData(indexData);
                console.log(`[Search Indexer] ✓ Index loaded successfully`);
                
                // Log some basic info about the loaded index
                const stats = this.searchIndex.getStats();
                console.log(`[Search Indexer]   Loaded ${stats.totalEntries || 0} entries`);
                console.log(`[Search Indexer]   Index size: ${stats.indexSize || 0} bytes`);
            } catch (error) {
                console.log('[Search Indexer] No existing index found, will create new index');
            }
            
            // Load statistics
            try {
                const statsData = JSON.parse(await fs.readFile(statsPath, 'utf-8'));
                const loadedStats = statsData.stats;
                
                // Reconstruct Map objects - handle all possible formats
                this.stats.popularQueries = new Map();
                if (loadedStats.popularQueries) {
                    if (Array.isArray(loadedStats.popularQueries)) {
                        // Saved as array of [key, value] pairs
                        this.stats.popularQueries = new Map(loadedStats.popularQueries);
                    } else if (typeof loadedStats.popularQueries === 'object' && loadedStats.popularQueries !== null) {
                        // Saved as plain object
                        this.stats.popularQueries = new Map(Object.entries(loadedStats.popularQueries));
                    }
                }
                
                this.stats.categoryDistribution = new Map();
                if (loadedStats.categoryDistribution) {
                    if (Array.isArray(loadedStats.categoryDistribution)) {
                        // Saved as array of [key, value] pairs
                        this.stats.categoryDistribution = new Map(loadedStats.categoryDistribution);
                    } else if (typeof loadedStats.categoryDistribution === 'object' && loadedStats.categoryDistribution !== null) {
                        // Saved as plain object
                        this.stats.categoryDistribution = new Map(Object.entries(loadedStats.categoryDistribution));
                    }
                }
                
                // Merge other stats (excluding the Map objects we just handled)
                const { popularQueries, categoryDistribution, ...otherStats } = loadedStats;
                this.stats = { ...this.stats, ...otherStats };
                
                console.log(`[Search Indexer] ✓ Statistics loaded from ${statsPath}`);
                console.log(`[Search Indexer]   Total entries: ${this.stats.totalEntries}`);
                console.log(`[Search Indexer]   Total parameters: ${this.stats.totalParameters}`);
                console.log(`[Search Indexer]   Last indexed: ${this.stats.lastIndexTime || 'never'}`);
            } catch (error) {
                console.log('[Search Indexer] No existing statistics found, starting fresh');
                // Ensure Maps are initialized even if loading fails
                this.stats.popularQueries = new Map();
                this.stats.categoryDistribution = new Map();
            }
            
        } catch (error) {
            console.warn('[Search Indexer] Error loading index:', error);
            // Continue with empty index
        }
    }

    /**
     * Enhance search options with TouchDesigner-specific settings
     * @param {string} query - Search query
     * @param {Object} options - Original options
     * @returns {Object} Enhanced options
     */
    enhanceSearchOptions(query, options) {
        const enhanced = { ...options };
        
        // Detect query type and adjust settings
        const queryAnalysis = this.analyzeQuery(query);
        
        if (queryAnalysis.isOperatorQuery) {
            enhanced.fields = ['name', 'displayName', 'category', 'description'];
            enhanced.threshold = 0.3;
        }
        
        if (queryAnalysis.isParameterQuery) {
            enhanced.fields = ['parameters', 'name', 'description'];
            enhanced.parameterSearch = true;
        }
        
        if (queryAnalysis.isTechnicalQuery) {
            enhanced.fields = ['description', 'details', 'usage', 'keywords'];
            enhanced.threshold = 0.2;
        }
        
        // Set default limits
        enhanced.limit = enhanced.limit || 50;
        enhanced.fuzzy = enhanced.fuzzy !== undefined ? enhanced.fuzzy : this.options.enableFuzzySearch;
        
        return enhanced;
    }

    /**
     * Enhance search results with additional metadata
     * @param {Array} results - Raw search results
     * @param {string} query - Original query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Enhanced results
     */
    async enhanceSearchResults(results, query, options) {
        return results.map(result => {
            const enhanced = {
                ...result,
                queryMatch: this.analyzeQueryMatch(result, query),
                relevanceFactors: this.calculateRelevanceFactors(result, query),
                snippet: this.generateSnippet(result.entry, query),
                highlightTerms: this.extractHighlightTerms(query)
            };
            
            return enhanced;
        });
    }

    /**
     * Apply TouchDesigner-specific scoring adjustments
     * @param {Array} results - Search results to score
     * @param {string} query - Search query
     * @returns {Array} Results with updated scores
     */
    applyTouchDesignerScoring(results, query) {
        const queryLower = query.toLowerCase();
        
        return results.map(result => {
            let bonusScore = 0;
            const entry = result.entry;
            
            // Category-specific bonuses
            if (this.tdPatterns.operatorTypes.test(queryLower)) {
                const categoryMatch = queryLower.match(this.tdPatterns.operatorTypes);
                if (categoryMatch && entry.category.toLowerCase() === categoryMatch[0]) {
                    bonusScore += this.options.relevanceWeights.categoryMatch;
                }
            }
            
            // Parameter-specific bonuses
            if (entry.parameters && entry.parameters.length > 0) {
                const parameterMatches = entry.parameters.filter(param => 
                    param.name.toLowerCase().includes(queryLower) ||
                    param.description.toLowerCase().includes(queryLower)
                );
                bonusScore += parameterMatches.length * this.options.relevanceWeights.parameterMatch;
            }
            
            // Common term bonuses
            const commonTermMatches = (entry.description + ' ' + entry.details).match(this.tdPatterns.commonTerms);
            if (commonTermMatches) {
                bonusScore += commonTermMatches.length * this.options.relevanceWeights.contentMatch;
            }
            
            // Keyword exact match bonuses
            const keywordMatches = entry.keywords.filter(keyword => 
                keyword.toLowerCase() === queryLower ||
                queryLower.includes(keyword.toLowerCase())
            );
            bonusScore += keywordMatches.length * this.options.relevanceWeights.keywordMatch;
            
            // Name similarity bonus
            if (entry.name.toLowerCase().includes(queryLower)) {
                bonusScore += this.options.relevanceWeights.nameMatch;
            }
            
            // Calculate final relevance score
            result.relevanceScore = (result.score || 0) + bonusScore;
            result.tdScore = bonusScore;
            
            return result;
        });
    }

    /**
     * Analyze query to determine type and characteristics
     * @param {string} query - Query to analyze
     * @returns {Object} Query analysis
     */
    analyzeQuery(query) {
        const analysis = {
            isOperatorQuery: false,
            isParameterQuery: false,
            isTechnicalQuery: false,
            isCategoryQuery: false,
            isExpressionQuery: false,
            isPythonQuery: false,
            detectedPatterns: [],
            suggestedEnhancements: []
        };
        
        const queryLower = query.toLowerCase();
        
        // Check for operator type queries
        if (this.tdPatterns.operatorTypes.test(queryLower)) {
            analysis.isOperatorQuery = true;
            analysis.isCategoryQuery = true;
            analysis.detectedPatterns.push('operator_type');
        }
        
        // Check for parameter queries
        if (this.tdPatterns.parameterNames.test(queryLower) || 
            queryLower.includes('parameter') || queryLower.includes('param')) {
            analysis.isParameterQuery = true;
            analysis.detectedPatterns.push('parameter');
        }
        
        // Check for technical/common term queries
        if (this.tdPatterns.commonTerms.test(queryLower)) {
            analysis.isTechnicalQuery = true;
            analysis.detectedPatterns.push('technical_term');
        }
        
        // Check for expression queries
        if (this.tdPatterns.expressions.test(query)) {
            analysis.isExpressionQuery = true;
            analysis.detectedPatterns.push('expression');
        }
        
        // Check for Python queries
        if (this.tdPatterns.pythonKeywords.test(queryLower)) {
            analysis.isPythonQuery = true;
            analysis.detectedPatterns.push('python');
        }
        
        return analysis;
    }

    /**
     * Generate a snippet from entry content highlighting query terms
     * @param {Object} entry - Wiki entry
     * @param {string} query - Search query
     * @returns {string} Generated snippet
     */
    generateSnippet(entry, query) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const content = entry.description || entry.summary || '';
        
        if (!content) return '';
        
        // Find the best sentence that contains query terms
        const sentences = content.split(/[.!?]+/);
        let bestSentence = sentences[0] || '';
        let maxMatches = 0;
        
        for (const sentence of sentences) {
            const sentenceLower = sentence.toLowerCase();
            const matches = queryTerms.filter(term => sentenceLower.includes(term)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestSentence = sentence;
            }
        }
        
        // Truncate and highlight
        let snippet = bestSentence.trim().substring(0, 200);
        if (bestSentence.length > 200) {
            snippet += '...';
        }
        
        return snippet;
    }

    /**
     * Extract highlight terms from query
     * @param {string} query - Search query
     * @returns {Array} Terms to highlight
     */
    extractHighlightTerms(query) {
        return query.toLowerCase()
            .split(/\s+/)
            .filter(term => term.length > 2)
            .filter(term => !this.searchIndex.stopWords.has(term));
    }

    /**
     * Get TouchDesigner-specific suggestions
     * @param {string} partialQuery - Partial query
     * @returns {Array} TD-specific suggestions
     */
    getTouchDesignerSuggestions(partialQuery) {
        const suggestions = [];
        const queryLower = partialQuery.toLowerCase();
        
        // Operator type suggestions
        const operatorTypes = ['TOP', 'CHOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
        operatorTypes.forEach(type => {
            if (type.toLowerCase().startsWith(queryLower)) {
                suggestions.push(type);
            }
        });
        
        // Common operator names
        const commonOperators = [
            'Noise', 'Transform', 'Movie File In', 'Render', 'Composite', 'Feedback',
            'Audio File In', 'Constant', 'Math', 'Logic', 'Switch', 'Merge',
            'Geometry', 'Text', 'Rectangle', 'Circle', 'Line', 'Grid'
        ];
        commonOperators.forEach(op => {
            if (op.toLowerCase().includes(queryLower)) {
                suggestions.push(op);
            }
        });
        
        return suggestions;
    }

    /**
     * Create cache key for search results
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {string} Cache key
     */
    createCacheKey(query, options) {
        const optionsKey = JSON.stringify({
            category: options.category,
            tags: options.tags,
            limit: options.limit,
            fuzzy: options.fuzzy
        });
        return `${query.toLowerCase()}:${optionsKey}`;
    }

    /**
     * Cache search results
     * @param {string} cacheKey - Cache key
     * @param {Object} results - Search results
     */
    cacheSearchResults(cacheKey, results) {
        // Remove oldest entries if cache is full
        if (this.queryCache.size >= this.maxCacheSize) {
            const firstKey = this.queryCache.keys().next().value;
            this.queryCache.delete(firstKey);
        }
        
        this.queryCache.set(cacheKey, results);
    }

    /**
     * Calculate relevance factors for a search result
     * @param {Object} result - Search result
     * @param {string} query - Search query
     * @returns {Object} Relevance factors
     */
    calculateRelevanceFactors(result, query) {
        const factors = {
            nameMatch: 0,
            descriptionMatch: 0,
            parameterMatch: 0,
            keywordMatch: 0,
            categoryMatch: 0
        };
        
        const queryLower = query.toLowerCase();
        const entry = result.entry;
        
        if (entry.name.toLowerCase().includes(queryLower)) {
            factors.nameMatch = 1;
        }
        
        if (entry.description && entry.description.toLowerCase().includes(queryLower)) {
            factors.descriptionMatch = 1;
        }
        
        if (entry.category && entry.category.toLowerCase().includes(queryLower)) {
            factors.categoryMatch = 1;
        }
        
        return factors;
    }

    /**
     * Analyze how well a query matches a search result
     * @param {Object} result - Search result
     * @param {string} query - Search query
     * @returns {Object} Match analysis
     */
    analyzeQueryMatch(result, query) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const entry = result.entry;
        
        const matches = {
            exactNameMatch: entry.name.toLowerCase() === query.toLowerCase(),
            partialNameMatch: entry.name.toLowerCase().includes(query.toLowerCase()),
            categoryMatch: entry.category.toLowerCase().includes(query.toLowerCase()),
            termMatches: 0,
            totalTerms: queryTerms.length
        };
        
        // Count matching terms
        queryTerms.forEach(term => {
            if (entry.name.toLowerCase().includes(term) ||
                entry.description.toLowerCase().includes(term) ||
                entry.keywords.some(keyword => keyword.toLowerCase().includes(term))) {
                matches.termMatches++;
            }
        });
        
        matches.matchRatio = matches.termMatches / matches.totalTerms;
        
        return matches;
    }

    /**
     * Update indexing statistics
     * @param {WikiEntry} entry - Indexed entry
     */
    updateIndexStats(entry) {
        this.stats.totalEntries++;
        const paramCount = entry.parameters?.length || 0;
        this.stats.totalParameters += paramCount;
        
        if (this.stats.totalEntries % 100 === 0) {
            console.log(`[Search Indexer] Milestone: ${this.stats.totalEntries} entries indexed`);
        }
        
        // Update category distribution - ensure it's a Map
        if (!(this.stats.categoryDistribution instanceof Map)) {
            this.stats.categoryDistribution = new Map();
        }
        
        const category = entry.category || 'Unknown';
        this.stats.categoryDistribution.set(
            category,
            (this.stats.categoryDistribution.get(category) || 0) + 1
        );
        
        this.stats.indexSize = this.searchIndex.getStats().indexSize;
    }

    /**
     * Update search statistics
     * @param {string} query - Search query
     * @param {Object} results - Search results
     */
    updateSearchStats(query, results) {
        this.stats.searchQueries++;
        
        // Update average query time
        const currentAvg = this.stats.averageQueryTime;
        const newTime = results.searchTime;
        this.stats.averageQueryTime = ((currentAvg * (this.stats.searchQueries - 1)) + newTime) / this.stats.searchQueries;
        
        // Track popular queries - ensure it's a Map
        if (!(this.stats.popularQueries instanceof Map)) {
            this.stats.popularQueries = new Map();
        }
        
        const count = this.stats.popularQueries.get(query) || 0;
        this.stats.popularQueries.set(query, count + 1);
        
        // Limit popular queries map size
        if (this.stats.popularQueries.size > 1000) {
            const entries = Array.from(this.stats.popularQueries.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 500);
            this.stats.popularQueries = new Map(entries);
        }
    }

    /**
     * Get popular queries for suggestions
     * @param {number} limit - Number of queries to return
     * @returns {Array} Popular queries
     */
    getPopularQueries(limit = 10) {
        if (!(this.stats.popularQueries instanceof Map)) {
            return [];
        }
        return Array.from(this.stats.popularQueries.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0]);
    }

    /**
     * Calculate cache hit rate
     * @returns {number} Hit rate percentage
     */
    calculateCacheHitRate() {
        // This would require tracking cache hits/misses
        // For now, return a placeholder
        return 0.0;
    }

    /**
     * Create batches for processing
     * @param {Array} items - Items to batch
     * @param {number} batchSize - Size of each batch
     * @returns {Array} Array of batches
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        console.log(`[Search Indexer] Auto-save enabled (interval: ${this.options.autoSaveInterval}ms)`);
        
        this.autoSaveTimer = setInterval(async () => {
            try {
                console.log(`[Search Indexer] Auto-save triggered at ${new Date().toISOString()}`);
                await this.saveIndex();
                console.log(`[Search Indexer] Auto-save completed`);
            } catch (error) {
                console.error('[Search Indexer] Auto-save failed:', error.message);
            }
        }, this.options.autoSaveInterval);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    /**
     * Clear search index and reset statistics
     */
    clear() {
        console.log('[Search Indexer] Clearing index and resetting statistics...');
        this.searchIndex.clear();
        this.queryCache.clear();
        this.stats = {
            totalEntries: 0,
            totalParameters: 0,
            indexSize: 0,
            lastIndexTime: null,
            searchQueries: 0,
            averageQueryTime: 0,
            popularQueries: new Map(),
            categoryDistribution: new Map(),
            processingErrors: []
        };
        console.log('[Search Indexer] Index cleared');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoSave();
        this.queryCache.clear();
    }
}

export default SearchIndexer;