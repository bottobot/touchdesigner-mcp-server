/**
 * Python API extension for Wiki System
 * Adds support for Python class documentation processing
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import PythonApiParser from './processor/python-api-parser.js';

export class OperatorDataPythonApi {
    /**
     * Initialize Python API extension
     * @param {OperatorDataManager} operatorDataManager - Parent operator data manager instance
     */
    constructor(operatorDataManager) {
        this.operatorDataManager = operatorDataManager;
        this.pythonApiParser = new PythonApiParser();
        this.pythonClasses = new Map(); // className -> class data
        this.pythonClassIndex = new Map(); // lowercase name -> className
        
        // Stats
        this.pythonApiStats = {
            totalClasses: 0,
            totalMembers: 0,
            totalMethods: 0,
            lastProcessed: null
        };
    }

    /**
     * Process Python API documentation files
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async processPythonApiDocs(options = {}) {
        console.log('[Python API] Starting Python class documentation processing...');
        
        const tdDocsPath = this.operatorDataManager.options.tdDocsPath;
        const pythonClassFiles = await this.discoverPythonClassFiles(tdDocsPath);
        
        console.log(`[Python API] Found ${pythonClassFiles.length} Python class files`);
        
        const results = {
            processed: 0,
            errors: 0,
            classes: [],
            members: 0,
            methods: 0
        };
        
        for (const filePath of pythonClassFiles) {
            try {
                const classData = await this.pythonApiParser.parseFile(filePath);
                if (classData) {
                    // Store class data
                    this.pythonClasses.set(classData.className, classData);
                    this.pythonClassIndex.set(classData.className.toLowerCase(), classData.className);
                    
                    // Also index by display name
                    if (classData.displayName) {
                        const displayKey = classData.displayName.toLowerCase().replace(' class', '');
                        this.pythonClassIndex.set(displayKey, classData.className);
                    }
                    
                    results.classes.push(classData.className);
                    results.processed++;
                    results.members += classData.members?.length || 0;
                    results.methods += classData.methods?.length || 0;
                }
            } catch (error) {
                console.error(`[Python API] Error processing ${filePath}:`, error.message);
                results.errors++;
            }
        }
        
        // Update stats
        this.pythonApiStats.totalClasses = this.pythonClasses.size;
        this.pythonApiStats.totalMembers = results.members;
        this.pythonApiStats.totalMethods = results.methods;
        this.pythonApiStats.lastProcessed = new Date().toISOString();
        
        console.log(`[Python API] Processing complete: ${results.processed} classes, ${results.members} members, ${results.methods} methods`);
        
        // Save to disk if persistence is enabled
        if (this.operatorDataManager.options.enablePersistence) {
            await this.savePythonApiData();
        }
        
        return results;
    }

    /**
     * Discover Python class documentation files
     * @param {string} directoryPath - Directory to search
     * @returns {Promise<Array>} Array of Python class file paths
     */
    async discoverPythonClassFiles(directoryPath) {
        const pythonClassFiles = [];
        
        async function scanDirectory(dir) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        // Don't recurse too deep
                        if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
                            await scanDirectory(fullPath);
                        }
                    } else if (entry.isFile() && entry.name.endsWith('_Class.htm')) {
                        pythonClassFiles.push(fullPath);
                    } else if (entry.isFile() && entry.name === 'td_Module.htm') {
                        pythonClassFiles.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`[Python API] Error scanning directory ${dir}:`, error.message);
            }
        }
        
        await scanDirectory(directoryPath);
        return pythonClassFiles;
    }

    /**
     * Get all Python classes
     * @returns {Array} Array of Python class data
     */
    getPythonClasses() {
        return Array.from(this.pythonClasses.values());
    }

    /**
     * Get Python class by name
     * @param {string} className - Class name to find
     * @returns {Object|null} Python class data
     */
    getPythonClass(className) {
        // Try direct match
        if (this.pythonClasses.has(className)) {
            return this.pythonClasses.get(className);
        }
        
        // Try case-insensitive match
        const key = this.pythonClassIndex.get(className.toLowerCase());
        if (key) {
            return this.pythonClasses.get(key);
        }
        
        return null;
    }

    /**
     * Search Python classes
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Search results
     */
    searchPythonClasses(query, options = {}) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const [className, classData] of this.pythonClasses) {
            let score = 0;
            
            // Check class name
            if (classData.className.toLowerCase().includes(queryLower)) {
                score += 10;
                if (classData.className.toLowerCase() === queryLower) {
                    score += 20; // Exact match bonus
                }
            }
            
            // Check description
            if (classData.description && classData.description.toLowerCase().includes(queryLower)) {
                score += 5;
            }
            
            // Check members
            if (classData.members) {
                for (const member of classData.members) {
                    if (member.name.toLowerCase().includes(queryLower) ||
                        (member.description && member.description.toLowerCase().includes(queryLower))) {
                        score += 2;
                    }
                }
            }
            
            // Check methods
            if (classData.methods) {
                for (const method of classData.methods) {
                    if (method.name.toLowerCase().includes(queryLower) ||
                        method.signature.toLowerCase().includes(queryLower) ||
                        (method.description && method.description.toLowerCase().includes(queryLower))) {
                        score += 2;
                    }
                }
            }
            
            if (score > 0) {
                results.push({
                    ...classData,
                    score
                });
            }
        }
        
        // Sort by score
        results.sort((a, b) => b.score - a.score);
        
        // Apply limit
        const limit = options.limit || 20;
        return results.slice(0, limit);
    }

    /**
     * Save Python API data to disk
     * @returns {Promise<void>}
     */
    async savePythonApiData() {
        const dataPath = join(this.operatorDataManager.options.dataPath, 'python-api');
        await fs.mkdir(dataPath, { recursive: true });
        
        // Save each class as a separate file
        for (const [className, classData] of this.pythonClasses) {
            const fileName = `${className.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            const filePath = join(dataPath, fileName);
            await fs.writeFile(filePath, JSON.stringify(classData, null, 2));
        }
        
        // Save index
        const indexPath = join(dataPath, 'index.json');
        const index = {
            classes: Array.from(this.pythonClasses.keys()),
            stats: this.pythonApiStats,
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
        
        console.log(`[Python API] Saved ${this.pythonClasses.size} Python classes to disk`);
    }

    /**
     * Load Python API data from disk
     * @returns {Promise<void>}
     */
    async loadPythonApiData() {
        const dataPath = join(this.operatorDataManager.options.dataPath, 'python-api');
        
        try {
            // Load index
            const indexPath = join(dataPath, 'index.json');
            const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
            
            // Load each class
            for (const className of index.classes) {
                const fileName = `${className.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                const filePath = join(dataPath, fileName);
                
                try {
                    const classData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                    this.pythonClasses.set(className, classData);
                    this.pythonClassIndex.set(className.toLowerCase(), className);
                    
                    // Also index by display name
                    if (classData.displayName) {
                        const displayKey = classData.displayName.toLowerCase().replace(' class', '');
                        this.pythonClassIndex.set(displayKey, className);
                    }
                } catch (error) {
                    console.warn(`[Python API] Failed to load class ${className}:`, error.message);
                }
            }
            
            // Restore stats
            if (index.stats) {
                this.pythonApiStats = index.stats;
            }
            
            console.log(`[Python API] Loaded ${this.pythonClasses.size} Python classes from disk`);
            
        } catch (error) {
            console.log('[Python API] No saved Python API data found, will process from scratch');
        }
    }

    /**
     * Get Python API statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.pythonApiStats,
            parserStats: this.pythonApiParser.getStats()
        };
    }
}

export default OperatorDataPythonApi;