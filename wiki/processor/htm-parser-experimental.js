/**
 * HTM Parser Experimental - Fixed version for experimental operators
 * Correctly handles experimental operator names without over-aggressive fuzzy matching
 */

import { promises as fs } from 'fs';
import WikiEntry from '../models/wiki-entry.js';
import path from 'path';

// Debug mode flag
const DEBUG = true;

class HtmParserExperimental {
    constructor(options = {}) {
        this.options = {
            encoding: options.encoding || 'utf-8',
            extractImages: options.extractImages !== undefined ? options.extractImages : true,
            extractLinks: options.extractLinks !== undefined ? options.extractLinks : true,
            validateStructure: options.validateStructure !== undefined ? options.validateStructure : true,
            strictParameterParsing: options.strictParameterParsing !== undefined ? options.strictParameterParsing : false,
            trueOperatorsList: options.trueOperatorsList || null
        };
        
        // Track statistics
        this.stats = {
            parsed: 0,
            failed: 0,
            errors: []
        };
    }

    /**
     * Extract clean operator name from title
     */
    extractOperatorName(title) {
        if (!title) return null;
        
        // Handle experimental operators specially
        if (title.includes('Experimental:')) {
            // Extract name after "Experimental:"
            let expName = title.replace('Experimental:', '').trim();
            
            // Remove category suffixes from experimental operator names
            expName = expName.replace(/\s*(POP|CHOP|TOP|SOP|DAT|MAT|COMP)\s*$/i, '').trim();
            
            // For experimental operators, preserve the cleaned name
            // Don't do fuzzy matching - use the exact name from the title
            return expName;
        }
        
        // Standard operator extraction
        // Remove common suffixes
        let name = title.replace(/\s*(Operator|Op|Node|TOP|CHOP|SOP|DAT|MAT|COMP|POP)\s*$/i, '').trim();
        
        // Handle special cases
        if (name.includes(' - ')) {
            name = name.split(' - ')[0].trim();
        }
        
        return name;
    }

    /**
     * Extract category from title or path
     */
    extractCategory(title, filePath) {
        const categories = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
        
        // Check title first
        for (const cat of categories) {
            const pattern = new RegExp(`\\b${cat}\\b`, 'i');
            if (pattern.test(title)) {
                return cat;
            }
        }
        
        // Check file path
        const fileName = path.basename(filePath);
        for (const cat of categories) {
            if (fileName.includes(`_${cat}`)) {
                return cat;
            }
        }
        
        return 'UNKNOWN';
    }

    /**
     * Parse HTM file
     */
    async parseFile(filePath) {
        try {
            // Read file content
            const content = await fs.readFile(filePath, this.options.encoding);
            
            // Simple HTML parsing without jsdom
            const document = {
                content: content,
                querySelector: (selector) => this.simpleQuerySelector(content, selector),
                querySelectorAll: (selector) => this.simpleQuerySelectorAll(content, selector)
            };
            
            // Extract title from multiple sources
            let title = this.extractTitle(document);
            if (!title) {
                // Try extracting from h1 or h2
                const h1 = document.querySelector('h1');
                const h2 = document.querySelector('h2');
                title = h1?.textContent?.trim() || h2?.textContent?.trim() || '';
            }
            
            // Extract operator name
            const operatorName = this.extractOperatorName(title);
            if (!operatorName) {
                console.warn(`[HtmParserExperimental] Could not extract operator name from: ${title}`);
                return null;
            }
            
            // Extract category
            const category = this.extractCategory(title, filePath);
            
            // Check if this is an experimental operator
            const isExperimental = title.includes('Experimental:') || 
                                    path.basename(filePath).startsWith('Experimental-');
            
            // Extract parameters
            const parameters = this.extractParameters(document);
            
            // Create wiki entry
            const entry = new WikiEntry({
                name: operatorName,
                displayName: operatorName,
                category: category,
                subcategory: this.extractSubcategory(document),
                description: this.extractDescription(document),
                summary: this.extractSummary(document),
                parameters: parameters,
                codeExamples: this.extractCodeExamples(document),
                pythonExamples: this.extractPythonExamples(document),
                keywords: this.extractKeywords(operatorName, category),
                tags: this.generateTags(operatorName, category, isExperimental),
                experimental: isExperimental,
                sourceFile: filePath
            });
            
            if (DEBUG) {
                const expFlag = isExperimental ? '[EXPERIMENTAL]' : '';
                console.log(`[HtmParserExperimental] Parsed ${operatorName} (${category}) ${expFlag} - ${parameters.length} parameters`);
            }
            
            this.stats.parsed++;
            return entry;
            
        } catch (error) {
            console.error(`[HtmParserExperimental] Error parsing ${filePath}:`, error.message);
            this.stats.failed++;
            this.stats.errors.push({ file: filePath, error: error.message });
            return null;
        }
    }

    /**
     * Extract title from document
     */
    extractTitle(document) {
        // Try multiple sources
        const titleElement = document.querySelector('title');
        const h1Element = document.querySelector('h1');
        const h2Element = document.querySelector('h2');
        const metaTitle = document.querySelector('meta[name="title"]');
        
        return titleElement?.textContent?.trim() ||
               h1Element?.textContent?.trim() ||
               h2Element?.textContent?.trim() ||
               metaTitle?.getAttribute('content')?.trim() ||
               '';
    }

    /**
     * Extract subcategory
     */
    extractSubcategory(document) {
        // Look for subcategory patterns
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            const parts = breadcrumb.textContent.split('/');
            if (parts.length > 2) {
                return parts[parts.length - 2].trim();
            }
        }
        
        return '';
    }

    /**
     * Extract description
     */
    extractDescription(document) {
        // Look for description in various places
        const descElement = document.querySelector('.description, .operator-description, .summary');
        if (descElement) {
            return descElement.textContent.trim();
        }
        
        // Try first paragraph
        const firstP = document.querySelector('p');
        if (firstP) {
            return firstP.textContent.trim();
        }
        
        return '';
    }

    /**
     * Extract summary
     */
    extractSummary(document) {
        const description = this.extractDescription(document);
        if (description) {
            // Take first sentence or first 100 characters
            const firstSentence = description.match(/^[^.!?]+[.!?]/);
            if (firstSentence) {
                return firstSentence[0].trim();
            }
            return description.substring(0, 100).trim() + '...';
        }
        return '';
    }

    /**
     * Extract parameters
     */
    extractParameters(document) {
        const parameters = [];
        
        // Try various parameter table selectors
        const paramTables = document.querySelectorAll(
            'table.parameters, table.params, table[class*="param"], ' +
            'table:has(th:contains("Parameter")), table:has(th:contains("Name"))'
        );
        
        for (const table of paramTables) {
            const rows = table.querySelectorAll('tr');
            
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const paramName = cells[0].textContent.trim();
                    const paramDesc = cells[1].textContent.trim();
                    
                    if (paramName && !paramName.toLowerCase().includes('parameter')) {
                        parameters.push({
                            name: paramName,
                            label: paramName,
                            type: this.inferParameterType(paramName, paramDesc),
                            defaultValue: this.extractDefaultValue(cells),
                            description: paramDesc,
                            group: this.inferParameterGroup(paramName)
                        });
                    }
                }
            }
        }
        
        return parameters;
    }

    /**
     * Infer parameter type
     */
    inferParameterType(name, description) {
        const nameLower = name.toLowerCase();
        const descLower = description.toLowerCase();
        
        if (nameLower.includes('file') || nameLower.includes('path')) return 'file';
        if (nameLower.includes('color')) return 'color';
        if (nameLower.includes('toggle') || nameLower.includes('enable')) return 'toggle';
        if (descLower.includes('0 to 1') || descLower.includes('0-1')) return 'float';
        if (descLower.includes('integer')) return 'int';
        
        return 'float';
    }

    /**
     * Extract default value
     */
    extractDefaultValue(cells) {
        if (cells.length >= 3) {
            const defaultText = cells[2].textContent.trim();
            if (defaultText) {
                return defaultText;
            }
        }
        return null;
    }

    /**
     * Infer parameter group
     */
    inferParameterGroup(paramName) {
        const nameLower = paramName.toLowerCase();
        
        if (nameLower.includes('transform')) return 'Transform';
        if (nameLower.includes('render')) return 'Render';
        if (nameLower.includes('material')) return 'Material';
        if (nameLower.includes('input')) return 'Input';
        if (nameLower.includes('output')) return 'Output';
        
        return 'Common';
    }

    /**
     * Extract code examples
     */
    extractCodeExamples(document) {
        const examples = [];
        const codeBlocks = document.querySelectorAll('pre, code');
        
        for (const block of codeBlocks) {
            const text = block.textContent.trim();
            if (text && text.length > 10) {
                examples.push(text);
            }
        }
        
        return examples;
    }

    /**
     * Extract Python examples
     */
    extractPythonExamples(document) {
        const examples = [];
        const codeBlocks = document.querySelectorAll('pre.python, code.python, .python-code');
        
        for (const block of codeBlocks) {
            const text = block.textContent.trim();
            if (text) {
                examples.push(text);
            }
        }
        
        return examples;
    }

    /**
     * Extract keywords
     */
    extractKeywords(operatorName, category) {
        const keywords = [operatorName.toLowerCase(), category.toLowerCase()];
        
        // Add variations
        const words = operatorName.split(/\s+/);
        for (const word of words) {
            if (word.length > 2) {
                keywords.push(word.toLowerCase());
            }
        }
        
        return [...new Set(keywords)];
    }

    /**
     * Generate tags
     */
    generateTags(operatorName, category, isExperimental) {
        const tags = [category];
        
        if (isExperimental) {
            tags.push('experimental');
        }
        
        // Add type-based tags
        const nameLower = operatorName.toLowerCase();
        if (nameLower.includes('audio')) tags.push('audio');
        if (nameLower.includes('video')) tags.push('video');
        if (nameLower.includes('3d')) tags.push('3d');
        if (nameLower.includes('2d')) tags.push('2d');
        if (nameLower.includes('network')) tags.push('network');
        if (nameLower.includes('input')) tags.push('input');
        if (nameLower.includes('output')) tags.push('output');
        
        return tags;
    }

    /**
     * Get parser statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Simple querySelector implementation
     */
    simpleQuerySelector(html, selector) {
        // Extract title
        if (selector === 'title') {
            const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
            return match ? { textContent: match[1] } : null;
        }
        
        // Extract h1
        if (selector === 'h1') {
            const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
            return match ? { textContent: match[1] } : null;
        }
        
        // Extract h2
        if (selector === 'h2') {
            const match = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
            return match ? { textContent: match[1] } : null;
        }
        
        // Extract first paragraph
        if (selector === 'p') {
            const match = html.match(/<p[^>]*>(.*?)<\/p>/i);
            return match ? { textContent: match[1] } : null;
        }
        
        return null;
    }

    /**
     * Simple querySelectorAll implementation
     */
    simpleQuerySelectorAll(html, selector) {
        const results = [];
        
        // Extract table rows for parameters
        if (selector.includes('tr')) {
            const rows = html.match(/<tr[^>]*>.*?<\/tr>/gis) || [];
            return rows.map(row => ({
                innerHTML: row,
                querySelectorAll: (subSelector) => {
                    if (subSelector === 'td') {
                        const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis) || [];
                        return cells.map(cell => ({
                            textContent: cell.replace(/<[^>]*>/g, '').trim()
                        }));
                    }
                    return [];
                }
            }));
        }
        
        // Extract code blocks
        if (selector.includes('pre') || selector.includes('code')) {
            const blocks = html.match(/<(pre|code)[^>]*>(.*?)<\/(pre|code)>/gis) || [];
            return blocks.map(block => ({
                textContent: block.replace(/<[^>]*>/g, '').trim()
            }));
        }
        
        // Extract tables
        if (selector.includes('table')) {
            const tables = html.match(/<table[^>]*>.*?<\/table>/gis) || [];
            return tables.map(table => ({
                innerHTML: table,
                querySelectorAll: (subSelector) => this.simpleQuerySelectorAll(table, subSelector)
            }));
        }
        
        return results;
    }
}

export { HtmParserExperimental };
export default HtmParserExperimental;