/**
 * Python API extension for Wiki System
 * Adds support for Python class documentation processing
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import PythonApiParser from './processor/python-api-parser.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        
        // Load stub data first (for missing classes)
        await this.loadStubData();
        
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
        
        // Load enhanced method data
        await this.loadEnhancedData();
        
        // Update stats (recalculate after loading enhanced data)
        let totalMembers = 0;
        let totalMethods = 0;
        for (const classData of this.pythonClasses.values()) {
            totalMembers += classData.members?.length || 0;
            totalMethods += classData.methods?.length || 0;
        }
        
        this.pythonApiStats.totalClasses = this.pythonClasses.size;
        this.pythonApiStats.totalMembers = totalMembers;
        this.pythonApiStats.totalMethods = totalMethods;
        this.pythonApiStats.lastProcessed = new Date().toISOString();
        
        console.log(`[Python API] Processing complete: ${this.pythonClasses.size} total classes, ${totalMembers} members, ${totalMethods} methods`);
        
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
        console.log('[Python API] Starting loadPythonApiData...');
        const dataPath = join(this.operatorDataManager.options.dataPath, 'python-api');
        console.log(`[Python API] Looking for saved data at: ${dataPath}`);
        
        try {
            // Load index
            const indexPath = join(dataPath, 'index.json');
            console.log(`[Python API] Trying to load index from: ${indexPath}`);
            const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
            console.log(`[Python API] Found saved index with ${index.classes.length} classes`);
            
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
            console.log(`[Python API] No saved Python API data found (${error.message}), processing HTML files...`);
            
            // Load stub data first for missing critical classes
            console.log('[Python API] Loading stub data...');
            await this.loadStubData();
            console.log(`[Python API] After loading stubs: ${this.pythonClasses.size} classes`);
            
            // Process HTML files from wiki/docs/python/ directory
            console.log('[Python API] Processing HTML files...');
            const tdDocsPath = this.operatorDataManager.options.tdDocsPath;
            console.log(`[Python API] Scanning for Python class files in: ${tdDocsPath}`);
            
            const pythonClassFiles = await this.discoverPythonClassFiles(tdDocsPath);
            console.log(`[Python API] Found ${pythonClassFiles.length} Python class HTML files`);
            
            // Process each HTML file
            for (const filePath of pythonClassFiles) {
                try {
                    console.log(`[Python API] Processing: ${filePath}`);
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
                        
                        console.log(`[Python API] Loaded class: ${classData.className} (${classData.members?.length || 0} members, ${classData.methods?.length || 0} methods)`);
                    }
                } catch (error) {
                    console.error(`[Python API] Error processing ${filePath}:`, error.message);
                }
            }
            
            console.log(`[Python API] After processing HTML files: ${this.pythonClasses.size} classes`);
            
            // Load enhanced method data
            console.log('[Python API] Loading enhanced data...');
            await this.loadEnhancedData();
            console.log(`[Python API] After loading enhanced data: ${this.pythonClasses.size} classes`);
            
            // Update stats after loading all data
            let totalMembers = 0;
            let totalMethods = 0;
            for (const classData of this.pythonClasses.values()) {
                totalMembers += classData.members?.length || 0;
                totalMethods += classData.methods?.length || 0;
            }
            
            this.pythonApiStats.totalClasses = this.pythonClasses.size;
            this.pythonApiStats.totalMembers = totalMembers;
            this.pythonApiStats.totalMethods = totalMethods;
            this.pythonApiStats.lastProcessed = new Date().toISOString();
            
            console.log(`[Python API] Final stats: ${this.pythonClasses.size} classes, ${totalMethods} methods, ${totalMembers} members`);
            
            // Save to disk if persistence is enabled
            if (this.operatorDataManager.options.enablePersistence) {
                console.log('[Python API] Saving processed data to disk...');
                await this.savePythonApiData();
            }
        }
        
        // Debug: List all loaded classes
        const classNames = Array.from(this.pythonClasses.keys()).sort();
        console.log(`[Python API] All loaded classes: ${classNames.join(', ')}`);
    }
    /**
     * Load stub data for missing Python classes
     * @returns {Promise<void>}
     */
    async loadStubData() {
        // Stubs are located in TD-MCP/wiki/docs/python/stubs/
        const stubDir = join(__dirname, 'docs', 'python', 'stubs');
        
        try {
            const stubFiles = await fs.readdir(stubDir);
            const jsonFiles = stubFiles.filter(f => f.endsWith('.json'));
            
            for (const file of jsonFiles) {
                try {
                    const stub = JSON.parse(await fs.readFile(join(stubDir, file), 'utf-8'));
                    
                    // Determine the class name (some stubs use 'name' instead of 'className')
                    const className = stub.className || stub.name;
                    if (!className) {
                        console.warn(`[Python API] Stub ${file} has no className or name property, skipping`);
                        continue;
                    }
                    
                    // Handle both formats: nested under 'documentation' or at root level
                    const members = stub.documentation?.members || stub.members || [];
                    const methods = stub.documentation?.methods || stub.methods || [];
                    const examples = stub.documentation?.examples || stub.examples || [];
                    
                    // Create full documentation structure
                    const classData = {
                        className: className,
                        displayName: className,
                        description: stub.description,
                        category: stub.category,
                        url: stub.url,
                        members: members.map(m => ({
                            name: m.name,
                            type: m.type,
                            description: m.description,
                            readonly: false
                        })),
                        methods: methods.map(m => ({
                            name: m.name,
                            description: m.description,
                            signature: m.signature,
                            parameters: m.parameters,
                            returns: m.returns || 'None'
                        })),
                        examples: examples,
                        source: 'stub'
                    };
                    
                    this.pythonClasses.set(className, classData);
                    this.pythonClassIndex.set(className.toLowerCase(), className);
                    console.log(`[Python API] Loaded stub for ${className}`);
                } catch (error) {
                    console.warn(`[Python API] Failed to load stub ${file}:`, error.message);
                }
            }
            
            console.log(`[Python API] Loaded ${jsonFiles.length} stub files`);
        } catch (error) {
            // Stub directory doesn't exist yet, that's okay
            console.log('[Python API] No stub data directory found');
        }
    }

    /**
     * Load enhanced documentation data
     * @returns {Promise<void>}
     */
    async loadEnhancedData() {
        // Enhanced data is located in TD-MCP/wiki/docs/python/enhanced/
        const enhancedDir = join(__dirname, 'docs', 'python', 'enhanced');
        
        try {
            const enhancedFiles = await fs.readdir(enhancedDir);
            const jsonFiles = enhancedFiles.filter(f => f.endsWith('.json'));
            
            for (const file of jsonFiles) {
                try {
                    const data = JSON.parse(await fs.readFile(join(enhancedDir, file), 'utf-8'));
                    const className = data.className;
                    
                    // Merge enhanced method data with existing
                    if (this.pythonClasses.has(className)) {
                        const existing = this.pythonClasses.get(className);
                        existing.methods = data.methods;
                        existing.enhanced = true;
                        this.pythonClasses.set(className, existing);
                        console.log(`[Python API] Enhanced ${className} with ${data.methods.length} methods`);
                    }
                } catch (error) {
                    console.warn(`[Python API] Failed to load enhanced data ${file}:`, error.message);
                }
            }
            
            console.log(`[Python API] Enhanced ${jsonFiles.length} classes with method data`);
        } catch (error) {
            // Enhanced directory doesn't exist yet, that's okay
            console.log('[Python API] No enhanced data directory found');
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