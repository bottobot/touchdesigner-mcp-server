/**
 * HTM Parser - Core HTML processing module for TouchDesigner documentation
 * Handles HTM file reading, parsing, and initial content extraction using cheerio
 */

import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import WikiEntry from '../models/wiki-entry.js';
import Parameter from '../models/parameter.js';

export class HtmParser {
    /**
     * Create a new HTM parser instance
     * @param {Object} options - Parser configuration options
     */
    constructor(options = {}) {
        this.options = {
            encoding: options.encoding || 'utf-8',
            preserveWhitespace: options.preserveWhitespace || false,
            extractImages: options.extractImages !== undefined ? options.extractImages : true,
            extractLinks: options.extractLinks !== undefined ? options.extractLinks : true,
            validateStructure: options.validateStructure !== undefined ? options.validateStructure : true,
            ...options
        };
        
        // Parsing statistics
        this.stats = {
            filesProcessed: 0,
            entriesCreated: 0,
            parametersExtracted: 0,
            errors: 0,
            warnings: 0
        };
        
        // Common TouchDesigner HTM patterns
        this.patterns = {
            operatorName: /^(.+?)\s+(TOP|CHOP|SOP|DAT|MAT|COMP|POP)$/i,
            parameterSection: /parameters?/i,
            exampleSection: /examples?/i,
            tipsSection: /tips?|notes?/i,
            warningSection: /warnings?|cautions?/i,
            // MediaWiki specific patterns
            wikiHeader: /^={1,6}\s*(.+?)\s*={1,6}$/,
            wikiLink: /\[\[([^\]]+)\]\]/g,
            wikiTemplate: /\{\{([^}]+)\}\}/g,
            wikiTable: /\{\|[\s\S]*?\|\}/g,
            wikiCategory: /\[\[Category:([^\]]+)\]\]/g
        };
    }

    /**
     * Pre-process MediaWiki syntax before parsing
     * @param {string} content - Raw HTM content
     * @returns {string} Processed content
     */
    preprocessMediaWiki(content) {
        // Convert MediaWiki headers to HTML headers
        content = content.replace(/^======\s*(.+?)\s*======$/gm, '<h6>$1</h6>');
        content = content.replace(/^=====\s*(.+?)\s*=====$/gm, '<h5>$1</h5>');
        content = content.replace(/^====\s*(.+?)\s*====$/gm, '<h4>$1</h4>');
        content = content.replace(/^===\s*(.+?)\s*===$/gm, '<h3>$1</h3>');
        content = content.replace(/^==\s*(.+?)\s*==$/gm, '<h2>$1</h2>');
        content = content.replace(/^=\s*(.+?)\s*=$/gm, '<h1>$1</h1>');
        
        // Convert MediaWiki bold/italic
        content = content.replace(/'''(.+?)'''/g, '<strong>$1</strong>');
        content = content.replace(/''(.+?)''/g, '<em>$1</em>');
        
        // Convert MediaWiki links
        content = content.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="$1">$2</a>');
        content = content.replace(/\[\[([^\]]+)\]\]/g, '<a href="$1">$1</a>');
        
        // Convert MediaWiki external links
        content = content.replace(/\[([^\s]+)\s+([^\]]+)\]/g, '<a href="$1">$2</a>');
        
        // Convert MediaWiki lists
        content = content.replace(/^\*\*\*\s+(.+)$/gm, '      <li>$1</li>');
        content = content.replace(/^\*\*\s+(.+)$/gm, '    <li>$1</li>');
        content = content.replace(/^\*\s+(.+)$/gm, '  <li>$1</li>');
        content = content.replace(/^#\s+(.+)$/gm, '  <li>$1</li>');
        
        // Convert MediaWiki definition lists
        content = content.replace(/^;\s*(.+)$/gm, '<dt>$1</dt>');
        content = content.replace(/^:\s*(.+)$/gm, '<dd>$1</dd>');
        
        return content;
    }

    /**
     * Parse a single HTM file and create a WikiEntry
     * @param {string} filePath - Path to the HTM file
     * @returns {Promise<WikiEntry>} Parsed wiki entry
     */
    async parseFile(filePath) {
        try {
            console.log(`[HTM Parser] Processing: ${filePath}`);
            
            // Read the file
            let htmlContent = await fs.readFile(filePath, this.options.encoding);
            
            // Pre-process MediaWiki syntax if detected
            if (htmlContent.includes('[[') || htmlContent.includes('==') || htmlContent.includes("'''")) {
                htmlContent = this.preprocessMediaWiki(htmlContent);
            }
            
            // Parse with cheerio
            const $ = cheerio.load(htmlContent, {
                normalizeWhitespace: !this.options.preserveWhitespace,
                xmlMode: false,
                decodeEntities: true
            });
            
            // Extract basic metadata
            const metadata = this.extractMetadata($, filePath);
            
            // Extract content sections
            const sections = this.extractSections($);
            
            // Extract parameters
            const parameters = this.extractParameters($);
            
            // Extract media and assets
            const media = this.extractMedia($, filePath);
            
            // Extract code examples
            const codeExamples = this.extractCodeExamples($);
            
            // Create WikiEntry
            const entry = new WikiEntry({
                id: WikiEntry.generateId(metadata.name, metadata.category),
                name: metadata.name,
                displayName: metadata.displayName,
                category: metadata.category,
                subcategory: metadata.subcategory,
                description: sections.description,
                summary: sections.summary,
                details: sections.details,
                usage: sections.usage,
                tips: sections.tips,
                warnings: sections.warnings,
                parameters: parameters,
                codeExamples: codeExamples.code,
                pythonExamples: codeExamples.python,
                expressions: codeExamples.expressions,
                images: media.images,
                videos: media.videos,
                assets: media.assets,
                keywords: this.extractKeywords($, metadata),
                tags: this.extractTags($, metadata),
                sourceFile: filePath,
                url: metadata.url,
                rawHtml: htmlContent,
                extractedSections: sections.raw,
                processingDate: new Date().toISOString(),
                contentHash: WikiEntry.calculateHash(htmlContent)
            });
            
            // Validate the entry
            const validation = entry.validate();
            if (!validation.isValid) {
                console.warn(`[HTM Parser] Validation warnings for ${filePath}:`, validation.errors);
                this.stats.warnings += validation.errors.length;
            }
            
            // Update statistics
            this.stats.filesProcessed++;
            this.stats.entriesCreated++;
            this.stats.parametersExtracted += parameters.length;
            
            console.log(`[HTM Parser] Successfully processed: ${metadata.name} (${parameters.length} parameters)`);
            
            return entry;
            
        } catch (error) {
            console.error(`[HTM Parser] Error processing ${filePath}:`, error);
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Parse multiple HTM files
     * @param {Array} filePaths - Array of file paths to process
     * @param {Object} options - Processing options
     * @returns {Promise<Array>} Array of WikiEntry objects
     */
    async parseFiles(filePaths, options = {}) {
        const entries = [];
        const errors = [];
        
        const concurrent = options.concurrent || 5;
        const batches = this.createBatches(filePaths, concurrent);
        
        for (const batch of batches) {
            const batchPromises = batch.map(async (filePath) => {
                try {
                    return await this.parseFile(filePath);
                } catch (error) {
                    errors.push({ filePath, error });
                    return null;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            entries.push(...batchResults.filter(entry => entry !== null));
        }
        
        if (errors.length > 0) {
            console.warn(`[HTM Parser] ${errors.length} files failed to process:`, errors);
        }
        
        return entries;
    }

    /**
     * Extract metadata from HTM document
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {string} filePath - Source file path
     * @returns {Object} Extracted metadata
     */
    extractMetadata($, filePath) {
        const metadata = {
            name: '',
            displayName: '',
            category: '',
            subcategory: '',
            url: '',
            version: ''
        };
        
        // PRIMARY METHOD: Extract from H1 (most reliable for operator pages)
        const h1Text = $('h1').first().text().trim();
        if (h1Text) {
            // Pattern 1: "Operator Name CATEGORY" (e.g., "Ableton Link CHOP", "Add SOP")
            const operatorMatch = h1Text.match(/^(.+?)\s+(CHOP|TOP|SOP|DAT|MAT|COMP|POP)$/i);
            if (operatorMatch) {
                metadata.name = operatorMatch[1].trim();
                metadata.category = operatorMatch[2].toUpperCase();
                metadata.displayName = h1Text;
            }
            // Pattern 2: "operatornameCATEGORY Class" (e.g., "abletonlinkCHOP Class")
            else if (h1Text.includes('Class')) {
                const classMatch = h1Text.match(/^(\w+)\s+Class$/i);
                if (classMatch) {
                    const className = classMatch[1];
                    // Extract category from class name
                    const categories = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
                    for (const cat of categories) {
                        if (className.toUpperCase().endsWith(cat)) {
                            metadata.category = cat;
                            // Extract operator name from class name (remove category suffix)
                            const opName = className.substring(0, className.length - cat.length);
                            // Convert camelCase to proper name (e.g., abletonlink -> Ableton Link)
                            metadata.name = opName.replace(/([A-Z])/g, ' $1').trim();
                            metadata.name = metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1);
                            metadata.displayName = `${metadata.name} ${cat}`;
                            break;
                        }
                    }
                }
            }
            // Pattern 3: Use H1 directly if it's not a generic page
            else if (!h1Text.includes('TouchDesigner') && !h1Text.includes('Documentation')) {
                metadata.name = h1Text;
                metadata.displayName = h1Text;
            }
        }
        
        // SECONDARY METHOD: Extract from title tag
        if (!metadata.name || !metadata.category) {
            const title = $('title').text().trim();
            if (title && title !== 'TouchDesigner Documentation') {
                // Remove " - Derivative" suffix
                const cleanTitle = title.replace(/\s*-\s*Derivative\s*$/i, '').trim();
                
                // Check for operator pattern in title
                const titleMatch = cleanTitle.match(/^(.+?)\s+(CHOP|TOP|SOP|DAT|MAT|COMP|POP)$/i);
                if (titleMatch) {
                    if (!metadata.name) metadata.name = titleMatch[1].trim();
                    if (!metadata.category) metadata.category = titleMatch[2].toUpperCase();
                    if (!metadata.displayName) metadata.displayName = cleanTitle;
                }
                // Check for class pattern in title (e.g., "abletonlinkCHOP Class - Derivative")
                else if (cleanTitle.includes('Class')) {
                    const classMatch = cleanTitle.match(/^(\w+)\s+Class$/i);
                    if (classMatch) {
                        const className = classMatch[1];
                        const categories = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
                        for (const cat of categories) {
                            if (className.toUpperCase().includes(cat)) {
                                if (!metadata.category) metadata.category = cat;
                                if (!metadata.name) {
                                    const opName = className.replace(new RegExp(cat, 'i'), '');
                                    metadata.name = opName.replace(/([A-Z])/g, ' $1').trim();
                                    metadata.name = metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1);
                                }
                                break;
                            }
                        }
                    }
                }
                // Use clean title as name if nothing else worked
                else if (!metadata.name) {
                    metadata.name = cleanTitle;
                    metadata.displayName = cleanTitle;
                }
            }
        }
        
        // TERTIARY METHOD: Check meta tags
        if (!metadata.name) {
            const ogTitle = $('meta[property="og:title"]').attr('content');
            if (ogTitle) {
                const cleanOgTitle = ogTitle.replace(/\s*-\s*Derivative\s*$/i, '').trim();
                const ogMatch = cleanOgTitle.match(/^(.+?)\s+(CHOP|TOP|SOP|DAT|MAT|COMP|POP)$/i);
                if (ogMatch) {
                    metadata.name = ogMatch[1].trim();
                    metadata.category = ogMatch[2].toUpperCase();
                    metadata.displayName = cleanOgTitle;
                }
            }
        }
        
        // Extract category from content if still not found
        if (!metadata.category) {
            // Check for "inherits from the CATEGORY class" pattern
            const bodyText = $('body').text();
            const inheritMatch = bodyText.match(/inherits\s+from\s+the\s+(\w+)\s+class/i);
            if (inheritMatch) {
                const inheritedClass = inheritMatch[1].toUpperCase();
                const categories = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
                if (categories.includes(inheritedClass)) {
                    metadata.category = inheritedClass;
                }
            }
            
            // Check MediaWiki categories
            const categoryLinks = $('a[href*="/Category:"]');
            categoryLinks.each((i, el) => {
                const categoryText = $(el).text().trim();
                const categories = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
                for (const cat of categories) {
                    if (categoryText.includes(cat)) {
                        metadata.category = cat;
                        return false; // Break out of each loop
                    }
                }
            });
        }
        
        // LAST RESORT: Use filename (but this is unreliable)
        if (!metadata.name) {
            const fileName = basename(filePath, extname(filePath));
            // Skip underscore-based parsing as it's unreliable
            // Just use the filename as-is, removing common patterns
            metadata.name = fileName
                .replace(/_/g, ' ')
                .replace(/class$/i, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Try to extract category from filename
            if (!metadata.category) {
                const categories = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
                const fileNameLower = fileName.toLowerCase();
                for (const cat of categories) {
                    if (fileNameLower.includes(cat.toLowerCase())) {
                        metadata.category = cat;
                        break;
                    }
                }
            }
        }
        
        // Extract subcategory from content structure
        const categoryMappings = {
            'generators': 'Generators',
            'filters': 'Filters',
            'analysis': 'Analysis',
            'audio': 'Audio',
            'video': 'Video',
            'geometry': 'Geometry',
            'transform': 'Transform',
            'composite': 'Composite',
            'render': 'Render',
            'texture': 'Texture',
            'material': 'Material',
            'particle': 'Particle',
            'dynamics': 'Dynamics',
            'animation': 'Animation',
            'control': 'Control',
            'network': 'Network',
            'utility': 'Utility',
            'input': 'Input',
            'output': 'Output'
        };
        
        const content = $('body').text().toLowerCase();
        for (const [key, value] of Object.entries(categoryMappings)) {
            if (content.includes(key)) {
                metadata.subcategory = value;
                break;
            }
        }
        
        // Extract URL from meta tags or links
        metadata.url = $('link[rel="canonical"]').attr('href') ||
                     $('meta[property="og:url"]').attr('content') ||
                     '';
        
        // Extract version information
        const versionText = $('body').text().match(/version\s+(\d+(?:\.\d+)*)/i);
        if (versionText) {
            metadata.version = versionText[1];
        }
        
        // Final validation and cleanup
        if (metadata.displayName === '') {
            metadata.displayName = metadata.name + (metadata.category ? ` ${metadata.category}` : '');
        }
        
        // Log extraction results for debugging (only when we have actual operator data)
        if (metadata.name && metadata.category) {
            console.log(`[HTM Parser] Extracted: "${metadata.name}" [${metadata.category}]`);
        }
        
        return metadata;
    }

    /**
     * Extract content sections from HTM document
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {Object} Extracted sections
     */
    extractSections($) {
        const sections = {
            description: '',
            summary: '',
            details: '',
            usage: '',
            tips: [],
            warnings: [],
            raw: {}
        };
        
        // Extract description (usually first paragraph or summary)
        const firstParagraph = $('p').first().text().trim();
        if (firstParagraph && firstParagraph.length > 50) {
            sections.description = firstParagraph;
        }
        
        // Look for summary in meta tags
        sections.summary = $('meta[name="description"]').attr('content') || 
                          $('meta[property="og:description"]').attr('content') || 
                          sections.description;
        
        // Extract sections by headings
        $('h1, h2, h3, h4, h5, h6').each((i, heading) => {
            const $heading = $(heading);
            const headingText = $heading.text().trim().toLowerCase();
            const content = this.extractSectionContent($, $heading);
            
            // Store raw sections
            sections.raw[headingText] = content;
            
            // Categorize sections
            if (headingText.includes('description') || headingText.includes('overview')) {
                sections.description = sections.description || content;
            } else if (headingText.includes('usage') || headingText.includes('how to')) {
                sections.usage = content;
            } else if (headingText.includes('details') || headingText.includes('technical')) {
                sections.details = content;
            } else if (this.patterns.tipsSection.test(headingText)) {
                sections.tips.push(content);
            } else if (this.patterns.warningSection.test(headingText)) {
                sections.warnings.push(content);
            }
        });
        
        // Extract tips and warnings from special elements
        $('.tip, .note, .info').each((i, el) => {
            sections.tips.push($(el).text().trim());
        });
        
        $('.warning, .caution, .alert').each((i, el) => {
            sections.warnings.push($(el).text().trim());
        });
        
        // Clean up empty sections
        sections.tips = sections.tips.filter(tip => tip.length > 0);
        sections.warnings = sections.warnings.filter(warning => warning.length > 0);
        
        return sections;
    }

    /**
     * Extract content following a heading until the next heading
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $heading - Heading element
     * @returns {string} Section content
     */
    extractSectionContent($, $heading) {
        const content = [];
        let current = $heading.next();
        
        while (current.length > 0 && !current.is('h1, h2, h3, h4, h5, h6')) {
            const text = current.text().trim();
            if (text) {
                content.push(text);
            }
            current = current.next();
        }
        
        return content.join('\n\n');
    }

    /**
     * Extract parameters from HTM document
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {Array} Array of Parameter objects
     */
    extractParameters($) {
        const parameters = [];
        
        // Look for parameter tables (including MediaWiki tables)
        $('table, .wikitable').each((i, table) => {
            const $table = $(table);
            const tableText = $table.text().toLowerCase();
            
            // Check if this table contains parameters
            // TouchDesigner often uses specific table classes
            const hasParameterClass = $table.hasClass('parameters') ||
                                     $table.hasClass('param-table') ||
                                     $table.hasClass('wikitable');
            
            if (hasParameterClass ||
                this.patterns.parameterSection.test(tableText) ||
                (tableText.includes('name') && tableText.includes('type')) ||
                (tableText.includes('parameter') && tableText.includes('value'))) {
                
                const tableParams = this.extractParametersFromTable($, $table);
                parameters.push(...tableParams);
            }
        });
        
        // Look for parameter lists or divs
        $('div[id*="param"], div[class*="param"], .parameter').each((i, div) => {
            const divParams = this.extractParametersFromDiv($, $(div));
            parameters.push(...divParams);
        });
        
        // Look for definition lists (dl/dt/dd)
        $('dl').each((i, dl) => {
            const dlParams = this.extractParametersFromDefinitionList($, $(dl));
            parameters.push(...dlParams);
        });
        
        return parameters;
    }

    /**
     * Extract parameters from a table element
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $table - Table element
     * @returns {Array} Array of Parameter objects
     */
    extractParametersFromTable($, $table) {
        const parameters = [];
        const headers = [];
        
        // Extract headers
        $table.find('th, thead td').each((i, th) => {
            headers.push($(th).text().trim().toLowerCase());
        });
        
        // Find column indices (handle various TouchDesigner formats)
        const nameIndex = headers.findIndex(h =>
            h.includes('name') ||
            h.includes('parameter') ||
            h.includes('param') ||
            h === 'p'
        );
        const typeIndex = headers.findIndex(h =>
            h.includes('type') ||
            h.includes('mode') ||
            h === 't'
        );
        const defaultIndex = headers.findIndex(h =>
            h.includes('default') ||
            h.includes('value') ||
            h === 'd'
        );
        const descIndex = headers.findIndex(h =>
            h.includes('description') ||
            h.includes('desc') ||
            h.includes('info') ||
            h === 'i'
        );
        
        // Extract parameter rows
        $table.find('tbody tr, tr').each((i, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length >= 2) {
                const param = new Parameter({
                    name: nameIndex >= 0 ? $(cells[nameIndex]).text().trim() : $(cells[0]).text().trim(),
                    type: typeIndex >= 0 ? $(cells[typeIndex]).text().trim() : '',
                    defaultValue: defaultIndex >= 0 ? $(cells[defaultIndex]).text().trim() : null,
                    description: descIndex >= 0 ? $(cells[descIndex]).text().trim() : '',
                    sourceElement: 'table'
                });
                
                // Parse type information
                if (param.type) {
                    const typeInfo = Parameter.parseType(param.type);
                    Object.assign(param, typeInfo);
                }
                
                if (param.name) {
                    parameters.push(param);
                }
            }
        });
        
        return parameters;
    }

    /**
     * Extract parameters from div elements
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $div - Div element
     * @returns {Array} Array of Parameter objects
     */
    extractParametersFromDiv($, $div) {
        const parameters = [];
        
        // Look for parameter structure in div
        const name = $div.find('.name, .param-name, [class*="name"]').first().text().trim();
        const type = $div.find('.type, .param-type, [class*="type"]').first().text().trim();
        const defaultValue = $div.find('.default, .param-default, [class*="default"]').first().text().trim();
        const description = $div.find('.description, .desc, .param-desc, [class*="desc"]').first().text().trim();
        
        if (name) {
            const param = new Parameter({
                name,
                type,
                defaultValue: defaultValue || null,
                description,
                sourceElement: 'div'
            });
            
            // Parse type information
            if (param.type) {
                const typeInfo = Parameter.parseType(param.type);
                Object.assign(param, typeInfo);
            }
            
            parameters.push(param);
        }
        
        return parameters;
    }

    /**
     * Extract parameters from definition list (dl/dt/dd)
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $dl - Definition list element
     * @returns {Array} Array of Parameter objects
     */
    extractParametersFromDefinitionList($, $dl) {
        const parameters = [];
        
        $dl.find('dt').each((i, dt) => {
            const $dt = $(dt);
            const $dd = $dt.next('dd');
            
            const name = $dt.text().trim();
            const description = $dd.text().trim();
            
            if (name) {
                const param = new Parameter({
                    name,
                    description,
                    sourceElement: 'dl'
                });
                
                parameters.push(param);
            }
        });
        
        return parameters;
    }

    /**
     * Extract media elements (images, videos)
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {string} filePath - Source file path for resolving relative URLs
     * @returns {Object} Media assets
     */
    extractMedia($, filePath) {
        const media = {
            images: [],
            videos: [],
            assets: []
        };
        
        if (!this.options.extractImages) {
            return media;
        }
        
        const baseDir = dirname(filePath);
        
        // Extract images
        $('img').each((i, img) => {
            const $img = $(img);
            const src = $img.attr('src');
            const alt = $img.attr('alt') || '';
            const title = $img.attr('title') || '';
            
            if (src) {
                media.images.push({
                    src: this.resolveAssetPath(src, baseDir),
                    alt,
                    title,
                    width: $img.attr('width'),
                    height: $img.attr('height')
                });
            }
        });
        
        // Extract videos
        $('video, source').each((i, video) => {
            const $video = $(video);
            const src = $video.attr('src');
            const type = $video.attr('type') || '';
            
            if (src) {
                media.videos.push({
                    src: this.resolveAssetPath(src, baseDir),
                    type,
                    controls: $video.attr('controls') !== undefined
                });
            }
        });
        
        // Extract other assets (PDFs, etc.)
        $('a[href]').each((i, link) => {
            const $link = $(link);
            const href = $link.attr('href');
            const text = $link.text().trim();
            
            if (href && (href.endsWith('.pdf') || href.endsWith('.zip') || href.endsWith('.toe'))) {
                media.assets.push({
                    url: this.resolveAssetPath(href, baseDir),
                    title: text,
                    type: extname(href).substring(1)
                });
            }
        });
        
        return media;
    }

    /**
     * Extract code examples from HTM document
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {Object} Code examples by type
     */
    extractCodeExamples($) {
        const examples = {
            code: [],
            python: [],
            expressions: []
        };
        
        // Extract from code blocks
        $('code, pre, .code, .example').each((i, el) => {
            const $el = $(el);
            const code = $el.text().trim();
            const className = $el.attr('class') || '';
            const language = this.detectCodeLanguage(code, className);
            
            if (code.length > 10) { // Ignore very short code snippets
                const example = {
                    code,
                    language,
                    title: $el.attr('title') || '',
                    description: $el.siblings('.description').text().trim()
                };
                
                if (language === 'python') {
                    examples.python.push(example);
                } else if (language === 'expression') {
                    examples.expressions.push(example);
                } else {
                    examples.code.push(example);
                }
            }
        });
        
        return examples;
    }

    /**
     * Detect programming language from code content and context
     * @param {string} code - Code content
     * @param {string} className - Element class name
     * @returns {string} Detected language
     */
    detectCodeLanguage(code, className = '') {
        const classLower = className.toLowerCase();
        
        // Check class name first
        if (classLower.includes('python') || classLower.includes('py')) {
            return 'python';
        }
        if (classLower.includes('javascript') || classLower.includes('js')) {
            return 'javascript';
        }
        if (classLower.includes('expression') || classLower.includes('expr')) {
            return 'expression';
        }
        if (classLower.includes('glsl') || classLower.includes('shader')) {
            return 'glsl';
        }
        
        // Analyze code content
        if (code.includes('import ') && code.includes('def ')) {
            return 'python';
        }
        if (code.includes('me.') && code.includes('op(')) {
            return 'python'; // TouchDesigner Python
        }
        if (code.match(/^\s*[\$@]|sin\(|cos\(|abs\(/)) {
            return 'expression'; // TouchDesigner expression
        }
        if (code.includes('uniform ') && code.includes('gl_')) {
            return 'glsl';
        }
        
        return 'text'; // Default fallback
    }

    /**
     * Extract keywords from content and metadata
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Object} metadata - Extracted metadata
     * @returns {Array} Array of keywords
     */
    extractKeywords($, metadata) {
        const keywords = new Set();
        
        // Add basic metadata as keywords
        if (metadata.name) keywords.add(metadata.name.toLowerCase());
        if (metadata.category) keywords.add(metadata.category.toLowerCase());
        if (metadata.subcategory) keywords.add(metadata.subcategory.toLowerCase());
        
        // Extract from meta keywords
        const metaKeywords = $('meta[name="keywords"]').attr('content');
        if (metaKeywords) {
            metaKeywords.split(',').forEach(keyword => {
                keywords.add(keyword.trim().toLowerCase());
            });
        }
        
        // Extract common terms from content
        const content = $('body').text().toLowerCase();
        const commonTerms = content.match(/\b(audio|video|geometry|shader|texture|animation|effect|filter|generator|analysis|transform|composite|render|particle|noise|feedback|control|parameter|input|output|channel|sample|frame|pixel|vertex|fragment|glsl|python|expression|operator|component|network|node|connection|data|real-time|procedural|generative|interactive|creative|visual|performance|optimization)\b/g);
        
        if (commonTerms) {
            commonTerms.forEach(term => keywords.add(term));
        }
        
        return Array.from(keywords);
    }

    /**
     * Extract tags from content and structure
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Object} metadata - Extracted metadata
     * @returns {Array} Array of tags
     */
    extractTags($, metadata) {
        const tags = new Set();
        
        // Add category as tag
        if (metadata.category) {
            tags.add(metadata.category);
        }
        
        // Add subcategory as tag
        if (metadata.subcategory) {
            tags.add(metadata.subcategory);
        }
        
        // Analyze content for automatic tagging
        const content = $('body').text().toLowerCase();
        
        const tagPatterns = {
            'Real-time': /real.?time|live|interactive/,
            'Audio': /audio|sound|music|frequency|amplitude|spectrum/,
            'Video': /video|movie|camera|capture|streaming/,
            'Geometry': /geometry|mesh|vertex|polygon|3d|model/,
            'Shader': /shader|glsl|vertex|fragment|pixel|gpu/,
            'Animation': /animation|keyframe|timeline|motion|movement/,
            'Effect': /effect|filter|process|modify|enhance/,
            'Generator': /generate|create|noise|pattern|procedural/,
            'Analysis': /analysis|analyze|measure|detect|track/,
            'Control': /control|parameter|automation|expression/,
            'Performance': /performance|optimize|efficient|fast|speed/,
            'Creative': /creative|art|artistic|visual|design/
        };
        
        for (const [tag, pattern] of Object.entries(tagPatterns)) {
            if (pattern.test(content)) {
                tags.add(tag);
            }
        }
        
        return Array.from(tags);
    }

    /**
     * Resolve asset path relative to HTM file
     * @param {string} assetPath - Asset path from HTM
     * @param {string} baseDir - Base directory of HTM file
     * @returns {string} Resolved path
     */
    resolveAssetPath(assetPath, baseDir) {
        if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
            return assetPath; // Already absolute
        }
        
        if (assetPath.startsWith('/')) {
            return assetPath; // Root relative
        }
        
        // Resolve relative path
        return join(baseDir, assetPath).replace(/\\/g, '/');
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
     * Get parsing statistics
     * @returns {Object} Current statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset parsing statistics
     */
    resetStats() {
        this.stats = {
            filesProcessed: 0,
            entriesCreated: 0,
            parametersExtracted: 0,
            errors: 0,
            warnings: 0
        };
    }
}

export default HtmParser;