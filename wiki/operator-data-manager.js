/**
 * Wiki System - Main coordinator for TouchDesigner HTM documentation processing
 * Orchestrates HTM parsing, content extraction, search indexing, and data management
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import HtmParser from './processor/htm-parser-perfect.js';
import ContentExtractor from './processor/content-extractor.js';
import SearchIndexer from './processor/search-indexer.js';
import WikiEntry from './models/wiki-entry.js';
import OperatorDataPythonApi from './operator-data-python-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class OperatorDataManager {
    /**
     * Create a new wiki system instance
     * @param {Object} options - System configuration options
     */
    constructor(options = {}) {
        this.options = {
            wikiPath: options.wikiPath || __dirname,
            dataPath: options.dataPath || join(__dirname, 'data'),
            processedPath: options.processedPath || join(__dirname, 'data', 'processed'),
            searchIndexPath: options.searchIndexPath || join(__dirname, 'data', 'search-index'),
            enablePersistence: options.enablePersistence !== undefined ? options.enablePersistence : true,
            autoIndex: options.autoIndex !== undefined ? options.autoIndex : true,
            batchSize: options.batchSize || 50,
            // TouchDesigner documentation path
            tdDocsPath: options.tdDocsPath || 'C:\\Program Files\\Derivative\\TouchDesigner\\Samples\\Learn\\OfflineHelp\\https.docs.derivative.ca',
            // Progress reporting
            progressCallback: options.progressCallback || null,
            progressInterval: options.progressInterval || 100, // Report progress every N files
            ...options
        };
        
        // Initialize processors
        this.htmParser = new HtmParser({
            encoding: 'utf-8',
            extractImages: true,
            extractLinks: true,
            validateStructure: true
        });
        
        this.contentExtractor = new ContentExtractor({
            strictParameterParsing: false,
            extractHiddenParameters: true,
            normalizeParameterNames: true,
            groupParametersByPage: true
        });
        
        this.searchIndexer = new SearchIndexer({
            indexPath: this.options.searchIndexPath,
            enablePersistence: this.options.enablePersistence,
            autoSave: false,  // Disabled - was overwriting index with empty data
            autoSaveInterval: 30000,
            enableFuzzySearch: true,
            enableStemming: true
        });
        
        // System state
        this.isInitialized = false;
        this.isIndexing = false;
        this.entries = new Map(); // id -> WikiEntry
        this.categories = new Map(); // category -> Set of entry IDs
        this.operators = new Map(); // operator name -> WikiEntry
        this.tutorials = new Map(); // tutorial name -> WikiEntry
        this.tutorialsPath = options.tutorialsPath || join(__dirname, 'data', 'tutorials');
        
        // Initialize Python API extension
        this.pythonApi = new OperatorDataPythonApi(this);
        
        // Statistics
        this.stats = {
            totalEntries: 0,
            totalParameters: 0,
            totalTutorials: 0,
            categoryCounts: {},
            lastProcessed: null,
            lastIndexed: null,
            processingErrors: [],
            searchQueries: 0
        };
    }

    /**
     * Initialize the wiki system
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('[Wiki System] Initializing...');
        
        try {
            // Create directories
            await this.ensureDirectories();
            
            // Load existing search index
            await this.searchIndexer.loadIndex();
            
            // Load processed entries if available
            await this.loadProcessedEntries();
            
            // Load tutorials
            await this.loadTutorials();
            
            // Load Python API data
            await this.pythonApi.loadPythonApiData();
            
            this.isInitialized = true;
            console.log(`[Wiki System] Initialized successfully with ${this.entries.size} operators, ${this.tutorials.size} tutorials, and ${this.pythonApi.pythonClasses.size} Python classes`);
            
        } catch (error) {
            console.error('[Wiki System] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Process HTM files and build the wiki system
     * @param {Array|string} htmPaths - Array of HTM file paths or directory path
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async processHTMFiles(htmPaths, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        this.isIndexing = true;
        const startTime = Date.now();
        
        try {
            console.log('[Wiki System] Starting HTM file processing...');
            
            // Resolve file paths
            const filePaths = Array.isArray(htmPaths) ? htmPaths : await this.discoverHTMFiles(htmPaths);
            console.log(`[Wiki System] Found ${filePaths.length} HTM files to process`);
            
            // Process in batches with progress reporting
            const entries = await this.processHTMFilesWithProgress(filePaths, {
                concurrent: options.concurrent || 5,
                batchSize: options.batchSize || this.options.batchSize,
                progressCallback: options.progressCallback || this.options.progressCallback
            });
            
            console.log(`[Wiki System] Parsed ${entries.length} entries`);
            
            // Store entries
            const storeResults = await this.storeEntries(entries);
            
            // Index entries for search
            const indexResults = await this.searchIndexer.indexEntries(entries, {
                batchSize: this.options.batchSize
            });
            
            // Update statistics
            this.updateSystemStats(entries);
            
            const processingTime = Date.now() - startTime;
            const results = {
                processed: entries.length,
                stored: storeResults.stored,
                indexed: indexResults.indexed,
                errors: storeResults.errors + indexResults.errors,
                processingTime: processingTime,
                processingRate: Math.round((entries.length / processingTime) * 1000) // files per second
            };
            
            console.log(`[Wiki System] Processing complete:`, results);
            console.log(`[Wiki System] Processing rate: ${results.processingRate} files/sec`);
            
            return results;
            
        } catch (error) {
            console.error('[Wiki System] Processing failed:', error);
            throw error;
        } finally {
            this.isIndexing = false;
        }
    }

    /**
     * Process HTM files with progress reporting
     * @param {Array} filePaths - Array of file paths to process
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Array of WikiEntry objects
     */
    async processHTMFilesWithProgress(filePaths, options = {}) {
        const entries = [];
        const errors = [];
        const totalFiles = filePaths.length;
        let processedCount = 0;
        let errorCount = 0;
        
        const concurrent = options.concurrent || 5;
        const progressCallback = options.progressCallback;
        const progressInterval = this.options.progressInterval;
        
        // Create batches for concurrent processing
        const batches = this.createBatches(filePaths, concurrent);
        
        console.log(`[Wiki System] Processing ${totalFiles} files in ${batches.length} batches...`);
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            
            const batchPromises = batch.map(async (filePath) => {
                try {
                    const entry = await this.htmParser.parseFile(filePath);
                    processedCount++;
                    
                    // Report progress
                    if (progressCallback && processedCount % progressInterval === 0) {
                        progressCallback({
                            processed: processedCount,
                            total: totalFiles,
                            errors: errorCount,
                            percentage: Math.round((processedCount / totalFiles) * 100),
                            currentFile: filePath,
                            batchIndex: batchIndex + 1,
                            totalBatches: batches.length
                        });
                    }
                    
                    return entry;
                } catch (error) {
                    errorCount++;
                    errors.push({ filePath, error });
                    console.warn(`[Wiki System] Failed to process ${filePath}:`, error.message);
                    return null;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            entries.push(...batchResults.filter(entry => entry !== null));
            
            // Report batch completion
            console.log(`[Wiki System] Batch ${batchIndex + 1}/${batches.length} complete. Processed: ${processedCount}/${totalFiles}, Errors: ${errorCount}`);
        }
        
        // Final progress report
        if (progressCallback) {
            progressCallback({
                processed: processedCount,
                total: totalFiles,
                errors: errorCount,
                percentage: 100,
                complete: true,
                batchIndex: batches.length,
                totalBatches: batches.length
            });
        }
        
        if (errors.length > 0) {
            console.warn(`[Wiki System] ${errors.length} files failed to process`);
            // Save error log for debugging
            const errorLogPath = join(this.options.dataPath, 'processing-errors.json');
            await fs.writeFile(errorLogPath, JSON.stringify(errors, null, 2));
            console.log(`[Wiki System] Error log saved to: ${errorLogPath}`);
        }
        
        return entries;
    }

    /**
     * Process TouchDesigner documentation files
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async processTouchDesignerDocs(options = {}) {
        console.log('[Wiki System] Starting TouchDesigner documentation processing...');
        console.log(`[Wiki System] TD Docs path: ${this.options.tdDocsPath}`);
        
        // Check if TD docs path exists
        try {
            await fs.access(this.options.tdDocsPath);
        } catch (error) {
            console.error(`[Wiki System] TouchDesigner docs path not found: ${this.options.tdDocsPath}`);
            throw new Error(`TouchDesigner documentation not found at: ${this.options.tdDocsPath}`);
        }
        
        // Process all HTM files in the TD docs directory
        const results = await this.processHTMFiles(this.options.tdDocsPath, {
            concurrent: options.concurrent || 10, // Higher concurrency for large batch
            batchSize: options.batchSize || 100,
            progressCallback: options.progressCallback || ((progress) => {
                if (progress.processed % 100 === 0 || progress.complete) {
                    console.log(`[TD Docs] Progress: ${progress.percentage}% (${progress.processed}/${progress.total}) - Errors: ${progress.errors}`);
                }
            })
        });
        
        console.log(`[Wiki System] TouchDesigner documentation processing complete!`);
        console.log(`[Wiki System] Total operators indexed: ${results.processed}`);
        
        // Also process Python API documentation
        console.log(`[Wiki System] Processing Python API documentation...`);
        const pythonApiResults = await this.pythonApi.processPythonApiDocs(options);
        console.log(`[Wiki System] Python API processing complete: ${pythonApiResults.processed} classes`);
        
        return {
            ...results,
            pythonClasses: pythonApiResults.processed,
            pythonMembers: pythonApiResults.members,
            pythonMethods: pythonApiResults.methods
        };
    }

    /**
     * Search the wiki system using direct search on in-memory data
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async search(query, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            // Use direct search instead of broken searchIndexer
            const results = this.performDirectSearch(query, options);
            this.stats.searchQueries++;
            return results;
        } catch (error) {
            console.error('[Wiki System] Search failed:', error);
            throw error;
        }
    }

    /**
     * Perform direct search on in-memory operator data
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Object} Search results
     */
    performDirectSearch(query, options = {}) {
        const {
            category = null,
            limit = 20,
            fuzzy = false,
            threshold = 0.3
        } = options;

        if (!query || query.trim() === '') {
            return { results: [], total: 0 };
        }

        const searchTerm = query.toLowerCase().trim();
        const results = [];

        // Search through all entries
        for (const [id, entry] of this.entries) {
            // Apply category filter if specified
            if (category && entry.category !== category.toUpperCase()) {
                continue;
            }

            let score = 0;

            // Check name match (highest priority)
            if (entry.name && entry.name.toLowerCase().includes(searchTerm)) {
                score += 100;
                // Exact match bonus
                if (entry.name.toLowerCase() === searchTerm) {
                    score += 50;
                }
            }

            // Check display name
            if (entry.displayName && entry.displayName.toLowerCase().includes(searchTerm)) {
                score += 90;
            }

            // Check description
            if (entry.description && entry.description.toLowerCase().includes(searchTerm)) {
                score += 50;
            }

            // Check keywords
            if (entry.keywords && Array.isArray(entry.keywords)) {
                for (const keyword of entry.keywords) {
                    if (keyword.toLowerCase().includes(searchTerm)) {
                        score += 30;
                        break;
                    }
                }
            }

            // Check parameters if option is enabled
            if (options.parameter_search && entry.parameters && Array.isArray(entry.parameters)) {
                for (const param of entry.parameters) {
                    if (param.name && param.name.toLowerCase().includes(searchTerm)) {
                        score += 20;
                    }
                    if (param.description && param.description.toLowerCase().includes(searchTerm)) {
                        score += 10;
                    }
                }
            }

            // Add to results if score meets threshold
            if (score > 0) {
                results.push({
                    id: entry.id,
                    name: entry.name,
                    displayName: entry.displayName,
                    category: entry.category,
                    description: entry.description,
                    score: score
                });
            }
        }

        // Sort by score (highest first)
        results.sort((a, b) => b.score - a.score);

        // Apply limit
        const limitedResults = limit > 0 ? results.slice(0, limit) : results;

        return {
            results: limitedResults,
            total: results.length
        };
    }

    /**
     * Get operator information by name
     * @param {string} operatorName - Name of the operator
     * @param {Object} options - Retrieval options
     * @returns {Promise<Object|null>} Operator information
     */
    async getOperator(operatorName, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        // Try exact match first
        const exactMatch = this.operators.get(operatorName.toLowerCase());
        if (exactMatch) {
            return this.formatOperatorResponse(exactMatch, options);
        }
        
        // Try fuzzy search
        const searchResults = await this.search(operatorName, {
            limit: 1,
            fuzzy: true,
            threshold: 0.5
        });
        
        if (searchResults.results.length > 0) {
            const entryId = searchResults.results[0].id;
            const entry = this.entries.get(entryId);
            if (entry) {
                return this.formatOperatorResponse(entry, options);
            }
        }
        
        return null;
    }

    /**
     * List operators by category
     * @param {Object} options - Listing options
     * @returns {Promise<Object>} Operator list
     */
    async listOperators(options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        const category = options.category ? options.category.toUpperCase() : null;
        const limit = options.limit; // No default limit - return all unless specified
        
        let operators = Array.from(this.entries.values());
        
        // Filter by category if specified
        if (category) {
            operators = operators.filter(entry => entry.category === category);
        }
        
        // Sort by name
        operators.sort((a, b) => a.name.localeCompare(b.name));
        
        // Apply limit only if explicitly requested
        if (limit && limit > 0) {
            operators = operators.slice(0, limit);
        }
        
        return {
            operators: operators.map(entry => entry.getSummary()),
            total: operators.length,
            category: category,
            categories: this.getAvailableCategories()
        };
    }

    /**
     * Get workflow suggestions for an operator
     * @param {string} operatorName - Current operator name
     * @param {Object} options - Suggestion options
     * @returns {Promise<Object>} Workflow suggestions
     */
    async suggestWorkflow(operatorName, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        const operator = await this.getOperator(operatorName);
        if (!operator) {
            return { suggestions: [], error: 'Operator not found' };
        }
        
        // Get related operators based on category and common patterns
        const suggestions = await this.findRelatedOperators(operator, options);
        
        return {
            currentOperator: operator.name,
            suggestions: suggestions.slice(0, options.limit || 10),
            total: suggestions.length
        };
    }

    /**
     * Get system statistics
     * @returns {Object} System statistics
     */
    getSystemStats() {
        return {
            ...this.stats,
            isInitialized: this.isInitialized,
            isIndexing: this.isIndexing,
            searchStats: this.searchIndexer.getSearchStats(),
            parserStats: this.htmParser.getStats(),
            pythonApiStats: this.pythonApi.getStats()
        };
    }

    /**
     * Get Python classes (delegation to Python API extension)
     * @returns {Array} Array of Python class data
     */
    getPythonClasses() {
        return this.pythonApi.getPythonClasses();
    }

    /**
     * Get Python class by name (delegation to Python API extension)
     * @param {string} className - Class name
     * @returns {Object|null} Python class data
     */
    getPythonClass(className) {
        return this.pythonApi.getPythonClass(className);
    }

    /**
     * Search Python classes (delegation to Python API extension)
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Search results
     */
    searchPythonClasses(query, options) {
        return this.pythonApi.searchPythonClasses(query, options);
    }

    /**
     * Store processed entries
     * @param {Array} entries - Entries to store
     * @returns {Promise<Object>} Storage results
     */
    async storeEntries(entries) {
        const results = { stored: 0, errors: 0, filtered: 0, tutorials: 0 };
        
        for (const entry of entries) {
            try {
                // Handle tutorials separately
                if (entry.type === 'tutorial' || entry.category === 'TUTORIAL') {
                    this.tutorials.set(entry.id, entry);
                    results.tutorials++;
                    continue;
                }
                
                // Skip classes and deprecated entries
                if (this.shouldFilterEntry(entry)) {
                    results.filtered++;
                    console.log(`[Wiki System] Filtered out: ${entry.name} (${entry.type || entry.category})`);
                    continue;
                }
                
                // Store in memory maps
                this.entries.set(entry.id, entry);
                this.operators.set(entry.name.toLowerCase(), entry);
                
                // Update category index
                if (!this.categories.has(entry.category)) {
                    this.categories.set(entry.category, new Set());
                }
                this.categories.get(entry.category).add(entry.id);
                
                // Persist to disk if enabled
                if (this.options.enablePersistence) {
                    await this.persistEntry(entry);
                }
                
                results.stored++;
                
            } catch (error) {
                console.error(`[Wiki System] Error storing entry ${entry.id}:`, error);
                results.errors++;
            }
        }
        
        if (results.filtered > 0) {
            console.log(`[Wiki System] Filtered ${results.filtered} classes/deprecated entries`);
        }
        
        if (results.tutorials > 0) {
            console.log(`[Wiki System] Stored ${results.tutorials} tutorials separately`);
        }
        
        return results;
    }

    /**
     * Persist a single entry to disk
     * @param {WikiEntry} entry - Entry to persist
     * @returns {Promise<void>}
     */
    async persistEntry(entry) {
        const entryPath = join(this.options.processedPath, `${entry.id}.json`);
        const entryData = entry.toJSON(false); // Don't include raw HTML in persistence
        
        await fs.writeFile(entryPath, JSON.stringify(entryData, null, 2));
    }

    /**
     * Check if an entry should be filtered out (classes, deprecated)
     * @param {Object} entry - Entry to check
     * @returns {boolean} True if entry should be filtered out
     */
    shouldFilterEntry(entry) {
        // Filter out classes only (tutorials are handled separately)
        if (entry.type === 'class') {
            return true;
        }
        
        // Filter out entries with CLASS category
        if (entry.category === 'CLASS') {
            return true;
        }
        
        // Filter out deprecated entries based on description
        if (entry.description) {
            const desc = entry.description.toLowerCase();
            if (desc.includes('deprecated') ||
                desc.includes('has been removed') ||
                desc.includes('no longer supported') ||
                desc.includes('has been replaced by')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Load processed entries from disk
     * @returns {Promise<void>}
     */
    async loadProcessedEntries() {
        if (!this.options.enablePersistence) return;
        
        try {
            const files = await fs.readdir(this.options.processedPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            console.log(`[Wiki System] Loading ${jsonFiles.length} processed entries...`);
            
            let filteredCount = 0;
            const entriesToIndex = [];
            
            for (const file of jsonFiles) {
                try {
                    const filePath = join(this.options.processedPath, file);
                    const entryData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                    
                    // Handle tutorials separately
                    if (entryData.type === 'tutorial' || entryData.category === 'TUTORIAL') {
                        const entry = WikiEntry.fromJSON(entryData);
                        this.tutorials.set(entry.id, entry);
                        continue;
                    }
                    
                    // Skip classes and deprecated entries
                    if (this.shouldFilterEntry(entryData)) {
                        filteredCount++;
                        continue;
                    }
                    
                    const entry = WikiEntry.fromJSON(entryData);
                    
                    this.entries.set(entry.id, entry);
                    this.operators.set(entry.name.toLowerCase(), entry);
                    
                    if (!this.categories.has(entry.category)) {
                        this.categories.set(entry.category, new Set());
                    }
                    this.categories.get(entry.category).add(entry.id);
                    
                    // Collect entries to index
                    entriesToIndex.push(entry);
                    
                } catch (error) {
                    console.warn(`[Wiki System] Failed to load entry from ${file}:`, error);
                }
            }
            
            console.log(`[Wiki System] Loaded ${this.entries.size} operators and ${this.tutorials.size} tutorials from disk (filtered ${filteredCount} entries)`);
            
            // Rebuild search index if entries were loaded but index is empty
            if (entriesToIndex.length > 0) {
                const searchStats = this.searchIndexer.getSearchStats();
                if (searchStats.totalEntries === 0) {
                    console.log(`[Wiki System] Search index is empty, rebuilding from ${entriesToIndex.length} loaded operators...`);
                    await this.searchIndexer.indexEntries(entriesToIndex, {
                        batchSize: 50,
                        onProgress: (progress) => {
                            if (progress.processed % 100 === 0 || progress.complete) {
                                console.log(`[Wiki System] Indexing progress: ${progress.processed}/${progress.total}`);
                            }
                        }
                    });
                    console.log(`[Wiki System] Search index rebuilt successfully`);
                }
            }
            
        } catch (error) {
            console.log('[Wiki System] No processed entries found, starting fresh');
        }
    }

    /**
     * Discover HTM files in a directory
     * @param {string} directoryPath - Directory to search
     * @returns {Promise<Array>} Array of HTM file paths
     */
    async discoverHTMFiles(directoryPath) {
        const htmFiles = [];
        
        async function scanDirectory(dir) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (entry.isFile() && (
                        entry.name.endsWith('.htm') || 
                        entry.name.endsWith('.html')
                    )) {
                        htmFiles.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`[Wiki System] Error scanning directory ${dir}:`, error);
            }
        }
        
        await scanDirectory(directoryPath);
        return htmFiles;
    }

    /**
     * Format operator response with requested detail level
     * @param {WikiEntry} entry - Wiki entry to format
     * @param {Object} options - Formatting options
     * @returns {Object} Formatted operator response
     */
    formatOperatorResponse(entry, options = {}) {
        const response = {
            name: entry.name,
            displayName: entry.displayName,
            category: entry.category,
            subcategory: entry.subcategory,
            description: entry.description,
            summary: entry.summary
        };
        
        if (options.show_examples || options.showExamples) {
            response.codeExamples = entry.codeExamples;
            response.pythonExamples = entry.pythonExamples;
            response.expressions = entry.expressions;
        }
        
        if (options.show_tips || options.showTips) {
            response.tips = entry.tips;
            response.warnings = entry.warnings;
        }
        
        if (options.show_parameters || options.showParameters || options.parameters) {
            response.parameters = entry.parameters.map(param => ({
                name: param.name,
                type: param.type,
                defaultValue: param.defaultValue,
                description: param.description,
                group: param.group,
                units: param.units,
                range: param.minValue !== null || param.maxValue !== null ? {
                    min: param.minValue,
                    max: param.maxValue
                } : null
            }));
            response.parameterCount = entry.parameters.length;
        }
        
        response.keywords = entry.keywords;
        response.tags = entry.tags;
        response.lastUpdated = entry.lastUpdated;
        
        return response;
    }

    /**
     * Find related operators based on category and patterns
     * @param {Object} operator - Current operator
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Related operators
     */
    async findRelatedOperators(operator, options = {}) {
        const related = [];
        const category = operator.category;
        
        // Get operators from same category
        const categoryOperators = Array.from(this.entries.values())
            .filter(entry => entry.category === category && entry.id !== operator.id)
            .slice(0, 20);
        
        // Score by relevance
        const scored = categoryOperators.map(entry => ({
            ...entry.getSummary(),
            relevanceScore: this.calculateOperatorRelevance(operator, entry)
        }));
        
        // Sort by relevance
        scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        return scored.slice(0, options.limit || 10);
    }

    /**
     * Calculate relevance score between two operators
     * @param {Object} operator1 - First operator
     * @param {WikiEntry} operator2 - Second operator
     * @returns {number} Relevance score
     */
    calculateOperatorRelevance(operator1, operator2) {
        let score = 0;
        
        // Same category bonus
        if (operator1.category === operator2.category) score += 5;
        
        // Same subcategory bonus
        if (operator1.subcategory === operator2.subcategory) score += 3;
        
        // Common keywords
        const commonKeywords = operator1.keywords.filter(keyword => 
            operator2.keywords.includes(keyword)
        );
        score += commonKeywords.length * 2;
        
        // Similar parameter count
        const paramDiff = Math.abs(operator1.parameters?.length - operator2.parameters?.length);
        if (paramDiff < 5) score += 2;
        
        return score;
    }

    /**
     * Get available categories
     * @returns {Array} Available categories
     */
    getAvailableCategories() {
        return Array.from(this.categories.keys()).sort();
    }

    /**
     * Create batches for concurrent processing
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
     * Update system statistics
     * @param {Array} entries - Processed entries
     */
    updateSystemStats(entries) {
        this.stats.totalEntries = this.entries.size;
        this.stats.totalParameters = Array.from(this.entries.values())
            .reduce((sum, entry) => sum + entry.parameters.length, 0);
        
        // Update category counts
        this.stats.categoryCounts = {};
        for (const [category, entryIds] of this.categories) {
            this.stats.categoryCounts[category] = entryIds.size;
        }
        
        this.stats.lastProcessed = new Date().toISOString();
    }

    /**
     * Load tutorials from the tutorials directory
     * @returns {Promise<void>}
     */
    async loadTutorials() {
        try {
            const files = await fs.readdir(this.tutorialsPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            console.log(`[Wiki System] Loading ${jsonFiles.length} tutorial files...`);
            
            for (const file of jsonFiles) {
                try {
                    const filePath = join(this.tutorialsPath, file);
                    const tutorialData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                    
                    // Ensure it's marked as a tutorial
                    tutorialData.type = 'tutorial';
                    tutorialData.category = tutorialData.category || 'TUTORIAL';
                    
                    this.tutorials.set(tutorialData.id, tutorialData);
                    
                } catch (error) {
                    console.warn(`[Wiki System] Failed to load tutorial from ${file}:`, error.message);
                }
            }
            
            console.log(`[Wiki System] Loaded ${this.tutorials.size} tutorials`);
            this.stats.totalTutorials = this.tutorials.size;
            
        } catch (error) {
            console.log('[Wiki System] No tutorials found or error loading tutorials:', error.message);
        }
    }

    /**
     * Get tutorial by name or ID
     * @param {string} tutorialName - Name or ID of the tutorial
     * @returns {Object|null} Tutorial information
     */
    async getTutorial(tutorialName) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        // Try by ID first
        const byId = this.tutorials.get(tutorialName.toLowerCase().replace(/ /g, '_'));
        if (byId) {
            return this.formatTutorialResponse(byId);
        }
        
        // Try by name
        for (const [id, tutorial] of this.tutorials) {
            if (tutorial.name.toLowerCase() === tutorialName.toLowerCase() ||
                tutorial.displayName.toLowerCase() === tutorialName.toLowerCase()) {
                return this.formatTutorialResponse(tutorial);
            }
        }
        
        return null;
    }

    /**
     * List all tutorials
     * @param {Object} options - Listing options
     * @returns {Object} Tutorial list
     */
    async listTutorials(options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        const tutorials = Array.from(this.tutorials.values());
        
        // Sort by name
        tutorials.sort((a, b) => (a.name || a.displayName).localeCompare(b.name || b.displayName));
        
        // Apply limit if specified
        const limit = options.limit;
        const limitedTutorials = limit && limit > 0 ? tutorials.slice(0, limit) : tutorials;
        
        return {
            tutorials: limitedTutorials.map(tutorial => ({
                id: tutorial.id,
                name: tutorial.name || tutorial.displayName,
                category: tutorial.subcategory || tutorial.category,
                description: tutorial.description,
                sections: tutorial.content?.sections?.length || 0,
                contentItems: tutorial.content?.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 0
            })),
            total: tutorials.length
        };
    }

    /**
     * Format tutorial response
     * @param {Object} tutorial - Tutorial data
     * @returns {Object} Formatted tutorial response
     */
    formatTutorialResponse(tutorial) {
        return {
            id: tutorial.id,
            name: tutorial.name,
            displayName: tutorial.displayName,
            category: tutorial.subcategory || tutorial.category,
            description: tutorial.description,
            summary: tutorial.summary,
            content: tutorial.content,
            keywords: tutorial.keywords,
            tags: tutorial.tags,
            lastUpdated: tutorial.lastUpdated,
            sourceFile: tutorial.sourceFile
        };
    }

    /**
     * Search both operators and tutorials
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Combined search results
     */
    async searchAll(query, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        // Search operators
        const operatorResults = await this.search(query, options);
        
        // Search tutorials (simple text search for now)
        const tutorialResults = [];
        const lowerQuery = query.toLowerCase();
        
        for (const [id, tutorial] of this.tutorials) {
            let score = 0;
            
            // Check name
            if (tutorial.name && tutorial.name.toLowerCase().includes(lowerQuery)) {
                score += 10;
            }
            
            // Check description
            if (tutorial.description && tutorial.description.toLowerCase().includes(lowerQuery)) {
                score += 5;
            }
            
            // Check keywords
            if (tutorial.keywords && tutorial.keywords.some(k => k.toLowerCase().includes(lowerQuery))) {
                score += 3;
            }
            
            if (score > 0) {
                tutorialResults.push({
                    ...tutorial,
                    score,
                    type: 'tutorial'
                });
            }
        }
        
        // Sort tutorials by score
        tutorialResults.sort((a, b) => b.score - a.score);
        
        return {
            operators: operatorResults.results,
            tutorials: tutorialResults.slice(0, options.limit || 10),
            total: operatorResults.results.length + tutorialResults.length
        };
    }

    /**
     * Ensure required directories exist
     * @returns {Promise<void>}
     */
    async ensureDirectories() {
        const dirs = [
            this.options.dataPath,
            this.options.processedPath,
            this.options.searchIndexPath,
            this.tutorialsPath
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Clear all processed data and indexes
     * @returns {Promise<void>}
     */
    async clearAllData() {
        console.log('[Wiki System] Clearing all processed data...');
        
        // Clear memory
        this.entries.clear();
        this.categories.clear();
        this.operators.clear();
        this.tutorials.clear();
        
        // Clear search index (if method exists)
        if (this.searchIndexer.clearIndex) {
            await this.searchIndexer.clearIndex();
        } else {
            // Fallback: reinitialize the search indexer
            this.searchIndexer = new SearchIndexer({
                indexPath: this.options.searchIndexPath,
                enablePersistence: this.options.enablePersistence,
                autoSave: false,  // Disabled - was overwriting index with empty data
                autoSaveInterval: 30000,
                enableFuzzySearch: true,
                enableStemming: true
            });
        }
        
        // Clear persisted data
        if (this.options.enablePersistence) {
            try {
                const files = await fs.readdir(this.options.processedPath);
                for (const file of files) {
                    await fs.unlink(join(this.options.processedPath, file));
                }
                console.log(`[Wiki System] Cleared ${files.length} processed files`);
            } catch (error) {
                console.warn('[Wiki System] Error clearing processed files:', error);
            }
        }
        
        // Reset stats
        this.stats = {
            totalEntries: 0,
            totalParameters: 0,
            totalTutorials: 0,
            categoryCounts: {},
            lastProcessed: null,
            lastIndexed: null,
            processingErrors: [],
            searchQueries: 0
        };
        
        console.log('[Wiki System] All data cleared');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.searchIndexer.destroy();
        this.entries.clear();
        this.categories.clear();
        this.operators.clear();
        this.tutorials.clear();
        this.isInitialized = false;
    }
}

export default OperatorDataManager;