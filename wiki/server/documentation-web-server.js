/**
 * Wiki Website Server - Local web interface for TouchDesigner documentation
 * Provides browsable interface with search functionality
 * Mirrors docs.derivative.ca URL structure for seamless offline browsing
 */

import express from 'express';
import hbs from 'hbs';
import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// TouchDesigner documentation directory path
const TD_DOCS_PATH = 'C:/Program Files/Derivative/TouchDesigner/Documentation';

export class DocumentationWebServer {
    constructor(operatorDataManager, options = {}) {
        this.operatorDataManager = operatorDataManager;
        this.options = {
            port: options.port || 3000,
            host: options.host || 'localhost',
            autoStart: options.autoStart !== false,
            tdDocsPath: options.tdDocsPath || TD_DOCS_PATH,
            ...options
        };
        
        this.app = express();
        this.server = null;
        this.isRunning = false;
        
        // Category mappings for URL routing
        this.categoryMappings = {
            'TOP': 'Texture Operators',
            'CHOP': 'Channel Operators',
            'SOP': 'Surface Operators',
            'DAT': 'Data Operators',
            'MAT': 'Material Operators',
            'COMP': 'Component Operators',
            'POP': 'Particle Operators'
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    
    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Setup Handlebars template engine with hbs
        this.app.set('view engine', 'hbs');
        this.app.set('views', join(__dirname, '..', 'templates', 'pages'));
        
        // Register partials directory
        hbs.registerPartials(join(__dirname, '..', 'templates', 'partials'));
        
        // Register the main layout as a partial
        hbs.registerPartial('layout', join(__dirname, '..', 'templates', 'layouts', 'main.hbs'));
        
        // Register Handlebars helpers
        hbs.registerHelper('formatCategory', (category) => {
            return this.categoryMappings[category] || category;
        });
        
        hbs.registerHelper('getCategoryLink', (category) => {
            // Return docs.derivative.ca style category links
            return `/${category}`;
        });
        
        hbs.registerHelper('getOperatorLink', (operatorName) => {
            // Return docs.derivative.ca style operator links
            return `/${operatorName}`;
        });
        
        hbs.registerHelper('formatParamType', (type) => {
            return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
        });
        
        hbs.registerHelper('truncate', (str, length = 150) => {
            if (!str || str.length <= length) return str;
            return str.substring(0, length) + '...';
        });
        
        hbs.registerHelper('json', (context) => {
            return JSON.stringify(context);
        });
        
        hbs.registerHelper('notEmpty', (value) => {
            if (Array.isArray(value)) return value.length > 0;
            return value && value.length > 0;
        });
        
        hbs.registerHelper('ifEquals', function(arg1, arg2, options) {
            return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
        });
        
        hbs.registerHelper('gt', function(a, b) {
            return a > b;
        });
        
        hbs.registerHelper('subtract', function(a, b) {
            return a - b;
        });
        
        hbs.registerHelper('buildBreadcrumbs', (operator) => {
            const breadcrumbs = [
                { text: 'Home', url: '/' }
            ];
            
            if (operator && operator.category) {
                breadcrumbs.push({
                    text: this.categoryMappings[operator.category] || operator.category,
                    url: `/${operator.category}`
                });
                
                if (operator.name) {
                    breadcrumbs.push({
                        text: operator.name,
                        url: `/${operator.name}`
                    });
                }
            }
            
            return breadcrumbs;
        });
        
        // Static files from wiki static directory
        this.app.use('/static', express.static(join(__dirname, '..', 'static')));
        
        // Serve TouchDesigner documentation static resources (images, etc.)
        if (this.options.tdDocsPath) {
            this.app.use('/docs/images', express.static(join(this.options.tdDocsPath, 'images')));
            this.app.use('/docs/resources', express.static(join(this.options.tdDocsPath, 'resources')));
        }
        
        // JSON parsing for API routes
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS for API requests
        this.app.use('/api', (req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
    }
    
    /**
     * Setup Express routes matching docs.derivative.ca URL patterns
     */
    setupRoutes() {
        // Home page
        this.app.get('/', this.handleHomePage.bind(this));
        
        // Search functionality
        this.app.get('/search', this.handleSearchPage.bind(this));
        
        // Special documentation pages (Python, Release Notes, etc.)
        this.app.get('/Python/:className?', this.handlePythonDocs.bind(this));
        this.app.get('/Release_Notes/:version?', this.handleReleaseNotes.bind(this));
        this.app.get('/TouchDesigner', this.handleTouchDesignerPage.bind(this));
        
        // Category pages (TOP, CHOP, SOP, etc.) - direct URLs like docs.derivative.ca
        this.app.get('/TOP', this.handleCategoryPageDirect.bind(this, 'TOP'));
        this.app.get('/CHOP', this.handleCategoryPageDirect.bind(this, 'CHOP'));
        this.app.get('/SOP', this.handleCategoryPageDirect.bind(this, 'SOP'));
        this.app.get('/DAT', this.handleCategoryPageDirect.bind(this, 'DAT'));
        this.app.get('/MAT', this.handleCategoryPageDirect.bind(this, 'MAT'));
        this.app.get('/COMP', this.handleCategoryPageDirect.bind(this, 'COMP'));
        this.app.get('/POP', this.handleCategoryPageDirect.bind(this, 'POP'));
        
        // Operator pages - direct URLs matching docs.derivative.ca pattern
        // Examples: /Noise_TOP, /Box_SOP, /Text_DAT
        this.app.get('/:operatorName([A-Za-z0-9_]+_(TOP|CHOP|SOP|DAT|MAT|COMP|POP))', this.handleOperatorPageDirect.bind(this));
        
        // Legacy routes for backward compatibility
        this.app.get('/operator/:name', this.handleOperatorPage.bind(this));
        this.app.get('/category/:category', this.handleCategoryPage.bind(this));
        
        // API routes
        this.app.get('/api/operators', this.handleApiOperators.bind(this));
        this.app.get('/api/operator/:name', this.handleApiOperator.bind(this));
        this.app.get('/api/search', this.handleApiSearch.bind(this));
        this.app.get('/api/categories', this.handleApiCategories.bind(this));
        this.app.get('/api/stats', this.handleApiStats.bind(this));
        this.app.get('/api/suggest/:operatorName', this.handleApiSuggest.bind(this));
        
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                version: '2.2.0',
                wiki: this.operatorDataManager.getSystemStats(),
                routes: {
                    docs_style: true,
                    python_docs: '/Python/*',
                    release_notes: '/Release_Notes/*',
                    operators: '/:operatorName_(TOP|CHOP|SOP|DAT|MAT|COMP|POP)',
                    categories: '/(TOP|CHOP|SOP|DAT|MAT|COMP|POP)'
                }
            });
        });
    }
    
    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).render('error', {
                title: 'Page Not Found',
                message: 'The page you requested could not be found.',
                statusCode: 404
            });
        });
        
        // General error handler
        this.app.use((err, req, res, next) => {
            console.error('[Wiki Server] Error:', err);
            res.status(500).render('error', {
                title: 'Server Error',
                message: 'An unexpected error occurred.',
                statusCode: 500
            });
        });
    }
    
    /**
     * Start the web server
     */
    async start() {
        if (this.isRunning) return;
        
        return new Promise((resolve, reject) => {
            // Find available port
            this.findAvailablePort(this.options.port)
                .then(port => {
                    this.server = this.app.listen(port, this.options.host, () => {
                        this.isRunning = true;
                        this.actualPort = port;
                        console.log(`[Wiki Server] Started on http://${this.options.host}:${port}`);
                        resolve({ host: this.options.host, port });
                    });
                    
                    this.server.on('error', reject);
                })
                .catch(reject);
        });
    }
    
    /**
     * Stop the web server
     */
    async stop() {
        if (!this.isRunning || !this.server) return;
        
        return new Promise((resolve) => {
            this.server.close(() => {
                this.isRunning = false;
                console.log('[Wiki Server] Stopped');
                resolve();
            });
        });
    }
    
    /**
     * Find available port starting from specified port
     */
    async findAvailablePort(startPort) {
        const net = await import('net');
        
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            
            server.listen(startPort, (err) => {
                if (err) {
                    // Port in use, try next one
                    server.close();
                    if (startPort < 65535) {
                        this.findAvailablePort(startPort + 1).then(resolve).catch(reject);
                    } else {
                        reject(new Error('No available ports found'));
                    }
                } else {
                    const port = server.address().port;
                    server.close(() => resolve(port));
                }
            });
        });
    }
    
    // Web Interface Route Handlers
    
    async handleHomePage(req, res) {
        try {
            const stats = this.operatorDataManager.getSystemStats();
            const categories = this.operatorDataManager.getAvailableCategories();

            // Get recent/featured operators for homepage
            const featured = await this.operatorDataManager.listOperators({ limit: 12 });
            
            res.render('home', {
                title: 'TouchDesigner Documentation Wiki',
                stats,
                categories: categories.map(cat => ({
                    name: cat,
                    count: stats.categoryCounts[cat] || 0
                })),
                featured: featured.operators
            });
        } catch (error) {
            console.error('[Wiki Server] Home page error:', error);
            res.status(500).render('error', {
                title: 'Error Loading Home Page',
                message: error.message
            });
        }
    }
    
    async handleOperatorPage(req, res) {
        try {
            const operatorName = decodeURIComponent(req.params.name);
            const operator = await this.operatorDataManager.getOperator(operatorName, {
                show_parameters: true,
                show_examples: true,
                show_tips: true
            });
            
            if (!operator) {
                return res.status(404).render('error', {
                    title: 'Operator Not Found',
                    message: `The operator "${operatorName}" could not be found.`
                });
            }
            
            // Build breadcrumbs
            const breadcrumbs = [
                { text: 'Home', url: '/' },
                { text: this.categoryMappings[operator.category] || operator.category, url: `/${operator.category}` },
                { text: operator.name, url: `/${operator.name}` }
            ];
            
            // Get related operators for suggestions
            const related = await this.operatorDataManager.suggestWorkflow(operatorName, { limit: 6 });
            
            res.render('operator', {
                title: `${operator.name} - TouchDesigner Documentation`,
                operator,
                related: related.suggestions,
                breadcrumbs
            });
        } catch (error) {
            console.error('[Wiki Server] Operator page error:', error);
            res.status(500).render('error', {
                title: 'Error Loading Operator',
                message: error.message
            });
        }
    }
    
    /**
     * Handle direct operator page requests (docs.derivative.ca style)
     */
    async handleOperatorPageDirect(req, res) {
        try {
            const operatorName = decodeURIComponent(req.params.operatorName);
            const operator = await this.operatorDataManager.getOperator(operatorName, {
                show_parameters: true,
                show_examples: true,
                show_tips: true
            });
            
            if (!operator) {
                // Try to find similar operators for suggestions
                const searchResults = await this.operatorDataManager.search(operatorName, { limit: 10 });
                
                return res.status(404).render('error', {
                    title: 'Operator Not Found',
                    message: `The operator "${operatorName}" could not be found.`,
                    suggestions: searchResults.results || []
                });
            }
            
            // Build breadcrumbs
            const breadcrumbs = [
                { text: 'Home', url: '/' },
                { text: this.categoryMappings[operator.category] || operator.category, url: `/${operator.category}` },
                { text: operator.name }
            ];
            
            // Get related operators for suggestions
            const related = await this.operatorDataManager.suggestWorkflow(operatorName, { limit: 6 });
            
            res.render('operator', {
                title: `${operator.name} - TouchDesigner Documentation`,
                operator,
                related: related.suggestions,
                breadcrumbs,
                docsStyleUrl: true
            });
        } catch (error) {
            console.error('[Wiki Server] Direct operator page error:', error);
            res.status(500).render('error', {
                title: 'Error Loading Operator',
                message: error.message
            });
        }
    }
    
    async handleSearchPage(req, res) {
        try {
            const query = req.query.q || '';
            const category = req.query.category || '';
            
            let results = [];
            if (query.trim()) {
                results = await this.operatorDataManager.search(query, {
                    category: category || undefined,
                    limit: 50
                });
            }
            
            const categories = this.operatorDataManager.getAvailableCategories();
            
            res.render('search', {
                title: query ? `Search: ${query}` : 'Search TouchDesigner Documentation',
                query,
                selectedCategory: category,
                categories,
                results: results.results || [],
                total: results.total || 0,
                hasResults: results.results && results.results.length > 0
            });
        } catch (error) {
            console.error('[Wiki Server] Search page error:', error);
            res.status(500).render('error', {
                title: 'Search Error',
                message: error.message
            });
        }
    }
    
    async handleCategoryPage(req, res) {
        try {
            const category = req.params.category.toUpperCase();
            const operators = await this.operatorDataManager.listOperators({
                category: category,
                limit: 200
            });
            
            if (!operators.operators.length) {
                return res.status(404).render('error', {
                    title: 'Category Not Found',
                    message: `The category "${category}" could not be found.`
                });
            }
            
            // Build breadcrumbs
            const breadcrumbs = [
                { text: 'Home', url: '/' },
                { text: this.categoryMappings[category] || category }
            ];
            
            res.render('category', {
                title: `${category} Operators - TouchDesigner Documentation`,
                category,
                operators: operators.operators,
                total: operators.total,
                breadcrumbs
            });
        } catch (error) {
            console.error('[Wiki Server] Category page error:', error);
            res.status(500).render('error', {
                title: 'Error Loading Category',
                message: error.message
            });
        }
    }
    
    /**
     * Handle direct category page requests (docs.derivative.ca style)
     */
    async handleCategoryPageDirect(category, req, res) {
        try {
            const operators = await this.operatorDataManager.listOperators({
                category: category,
                limit: 500
            });
            
            if (!operators.operators || !operators.operators.length) {
                return res.status(404).render('error', {
                    title: 'Category Not Found',
                    message: `The category "${category}" could not be found or has no operators.`
                });
            }
            
            // Sort operators alphabetically
            operators.operators.sort((a, b) => a.name.localeCompare(b.name));
            
            // Build breadcrumbs
            const breadcrumbs = [
                { text: 'Home', url: '/' },
                { text: this.categoryMappings[category] || category }
            ];
            
            res.render('category', {
                title: `${this.categoryMappings[category]} - TouchDesigner Documentation`,
                category,
                categoryName: this.categoryMappings[category],
                operators: operators.operators,
                total: operators.total,
                breadcrumbs,
                docsStyleUrl: true
            });
        } catch (error) {
            console.error('[Wiki Server] Direct category page error:', error);
            res.status(500).render('error', {
                title: 'Error Loading Category',
                message: error.message
            });
        }
    }
    
    /**
     * Handle Python documentation pages
     */
    async handlePythonDocs(req, res) {
        try {
            const className = req.params.className;
            
            // Build breadcrumbs
            const breadcrumbs = [
                { text: 'Home', url: '/' },
                { text: 'Python', url: '/Python' }
            ];
            
            if (className) {
                breadcrumbs.push({ text: className });
                
                // Try to get Python class documentation
                const pythonDoc = await this.operatorDataManager.getOperator(`Python_${className}`, {
                    show_parameters: true,
                    show_examples: true
                });
                
                if (pythonDoc) {
                    return res.render('operator', {
                        title: `${className} - Python Documentation`,
                        operator: pythonDoc,
                        breadcrumbs,
                        isPythonDoc: true
                    });
                }
            }
            
            // Show Python documentation index
            res.render('python-index', {
                title: 'Python Documentation - TouchDesigner',
                breadcrumbs,
                className
            });
        } catch (error) {
            console.error('[Wiki Server] Python docs error:', error);
            res.status(500).render('error', {
                title: 'Error Loading Python Documentation',
                message: error.message
            });
        }
    }
    
    /**
     * Handle Release Notes pages
     */
    async handleReleaseNotes(req, res) {
        try {
            const version = req.params.version;
            
            // Build breadcrumbs
            const breadcrumbs = [
                { text: 'Home', url: '/' },
                { text: 'Release Notes', url: '/Release_Notes' }
            ];
            
            if (version) {
                breadcrumbs.push({ text: version });
            }
            
            // For now, show a placeholder or redirect to official docs
            res.render('release-notes', {
                title: version ? `Release Notes ${version}` : 'Release Notes - TouchDesigner',
                breadcrumbs,
                version,
                message: 'Release notes documentation is available in the official TouchDesigner documentation.'
            });
        } catch (error) {
            console.error('[Wiki Server] Release notes error:', error);
            res.status(500).render('error', {
                title: 'Error Loading Release Notes',
                message: error.message
            });
        }
    }
    
    /**
     * Handle TouchDesigner main documentation page
     */
    async handleTouchDesignerPage(req, res) {
        try {
            const stats = this.operatorDataManager.getSystemStats();
            
            res.render('touchdesigner', {
                title: 'TouchDesigner Documentation',
                stats,
                categories: Object.entries(this.categoryMappings).map(([key, name]) => ({
                    key,
                    name,
                    count: stats.categoryCounts[key] || 0
                }))
            });
        } catch (error) {
            console.error('[Wiki Server] TouchDesigner page error:', error);
            res.status(500).render('error', {
                title: 'Error Loading Documentation',
                message: error.message
            });
        }
    }
    
    // API Route Handlers
    
    async handleApiOperators(req, res) {
        try {
            const category = req.query.category;
            const limit = parseInt(req.query.limit) || 100;
            
            const operators = await this.operatorDataManager.listOperators({
                category, 
                limit 
            });
            
            res.json(operators);
        } catch (error) {
            console.error('[Wiki Server] API operators error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    
    async handleApiOperator(req, res) {
        try {
            const operatorName = decodeURIComponent(req.params.name);
            const options = {
                show_parameters: req.query.parameters === 'true',
                show_examples: req.query.examples === 'true',
                show_tips: req.query.tips === 'true'
            };
            
            const operator = await this.operatorDataManager.getOperator(operatorName, options);
            
            if (!operator) {
                return res.status(404).json({ error: 'Operator not found' });
            }
            
            res.json(operator);
        } catch (error) {
            console.error('[Wiki Server] API operator error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    
    async handleApiSearch(req, res) {
        try {
            const query = req.query.q || '';
            const category = req.query.category;
            const limit = parseInt(req.query.limit) || 20;
            
            if (!query.trim()) {
                return res.json({ results: [], total: 0 });
            }
            
            const results = await this.operatorDataManager.search(query, {
                category: category || undefined,
                limit
            });
            
            res.json(results);
        } catch (error) {
            console.error('[Wiki Server] API search error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    
    async handleApiCategories(req, res) {
        try {
            const categories = this.operatorDataManager.getAvailableCategories();
            const stats = this.operatorDataManager.getSystemStats();
            
            const categoryData = categories.map(cat => ({
                name: cat,
                count: stats.categoryCounts[cat] || 0
            }));
            
            res.json({ categories: categoryData });
        } catch (error) {
            console.error('[Wiki Server] API categories error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    
    async handleApiStats(req, res) {
        try {
            const stats = this.operatorDataManager.getSystemStats();
            res.json(stats);
        } catch (error) {
            console.error('[Wiki Server] API stats error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    
    /**
     * Handle API suggest endpoint for workflow suggestions
     */
    async handleApiSuggest(req, res) {
        try {
            const operatorName = decodeURIComponent(req.params.operatorName);
            const limit = parseInt(req.query.limit) || 10;
            
            const suggestions = await this.operatorDataManager.suggestWorkflow(operatorName, { limit });
            
            res.json(suggestions);
        } catch (error) {
            console.error('[Wiki Server] API suggest error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    
    /**
     * Get server info
     */
    getServerInfo() {
        return {
            isRunning: this.isRunning,
            host: this.options.host,
            port: this.actualPort || this.options.port,
            url: this.isRunning ? `http://${this.options.host}:${this.actualPort}` : null,
            routes: {
                home: '/',
                operators: '/:operatorName_(TOP|CHOP|SOP|DAT|MAT|COMP|POP)',
                categories: '/(TOP|CHOP|SOP|DAT|MAT|COMP|POP)',
                python: '/Python/:className',
                releaseNotes: '/Release_Notes/:version',
                search: '/search'
            }
        };
    }
}

export default DocumentationWebServer;