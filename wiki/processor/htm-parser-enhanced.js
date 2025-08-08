/**
 * ENHANCED HTM Parser - Handles experimental operators and variant naming
 * Incorporates fuzzy matching to connect HTM files to TRUE list operators
 */

import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import { basename } from 'path';
import WikiEntry from '../models/wiki-entry.js';
import Parameter from '../models/parameter.js';

export class HtmParserEnhanced {
    constructor(options = {}) {
        this.options = {
            encoding: options.encoding || 'utf-8',
            trueOperatorsList: options.trueOperatorsList || null, // Optional TRUE list for matching
            ...options
        };
        
        this.stats = {
            filesProcessed: 0,
            entriesCreated: 0,
            parametersExtracted: 0,
            experimentalOperators: 0,
            fuzzyMatches: 0,
            errors: 0,
            warnings: 0
        };
        
        // Build operator name mappings for fuzzy matching
        this.operatorMappings = new Map([
            // Known experimental/variant mappings
            ['nvidia_flow_emitter', 'NVIDIA Flow'],
            ['experimental-serial_devices', 'Serial Devices'],
            ['experimental-zed_select', 'ZED Select'],
            ['curveclay', 'Curveday'], // Possible typo in docs
            ['tcp_ip', 'TCP/IP'],
            // Add more mappings as discovered
        ]);
    }

    /**
     * Normalize strings for comparison
     */
    normalize(str) {
        return str.toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
            .trim();
    }

    /**
     * Check if two strings are similar enough to be a match
     */
    isFuzzyMatch(str1, str2) {
        const norm1 = this.normalize(str1);
        const norm2 = this.normalize(str2);
        
        // Exact match after normalization
        if (norm1 === norm2) return true;
        
        // Check if one contains the other (handles extra words like "Emitter")
        if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
        
        // Check if all words from shorter string exist in longer string
        const words1 = str1.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 0);
        const words2 = str2.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 0);
        
        const [shorter, longer] = words1.length <= words2.length ? [words1, words2] : [words2, words1];
        const longerNorm = longer.join('');
        
        // All words from shorter must exist in longer
        const allWordsMatch = shorter.every(word => longerNorm.includes(word));
        if (allWordsMatch) return true;
        
        return false;
    }

    /**
     * Parse a single HTM file
     */
    async parseFile(filePath) {
        this.stats.filesProcessed++;
        
        try {
            const content = await fs.readFile(filePath, this.options.encoding);
            const $ = cheerio.load(content);
            const fileName = basename(filePath);
            
            // Skip non-operator files
            if (!this.isOperatorFile(fileName)) {
                return null;
            }
            
            // Check if experimental
            const isExperimental = fileName.toLowerCase().includes('experimental');
            if (isExperimental) {
                this.stats.experimentalOperators++;
            }
            
            // Extract operator info with enhanced matching
            const operatorInfo = this.extractOperatorInfoEnhanced($, fileName);
            if (!operatorInfo) {
                return null;
            }
            
            // Try to match to TRUE list if provided
            if (this.options.trueOperatorsList) {
                const trueMatch = this.matchToTrueOperator(operatorInfo, fileName);
                if (trueMatch && trueMatch.matchType === 'fuzzy') {
                    this.stats.fuzzyMatches++;
                    console.log(`[Fuzzy Match] "${operatorInfo.name}" → "${trueMatch.trueName}"`);
                    // Use the TRUE list name as canonical
                    operatorInfo.canonicalName = trueMatch.trueName;
                    operatorInfo.displayName = trueMatch.trueName;
                }
            }
            
            // Extract parameters using the proven DIV method
            const parameters = this.extractParameters($);
            
            // Create WikiEntry
            const entry = new WikiEntry({
                id: operatorInfo.id,
                name: operatorInfo.canonicalName || operatorInfo.name,
                displayName: operatorInfo.displayName,
                category: operatorInfo.category,
                subcategory: operatorInfo.subcategory,
                description: operatorInfo.description,
                summary: operatorInfo.summary,
                parameters: parameters,
                keywords: this.extractKeywords(operatorInfo.name, operatorInfo.description),
                tags: [operatorInfo.category, 'TouchDesigner', operatorInfo.name],
                experimental: isExperimental,
                sourceFile: filePath,
                lastUpdated: new Date().toISOString()
            });
            
            this.stats.entriesCreated++;
            this.stats.parametersExtracted += parameters.length;
            
            const expFlag = isExperimental ? ' [EXPERIMENTAL]' : '';
            console.log(`[HtmParserEnhanced] Parsed ${operatorInfo.displayName} (${operatorInfo.category})${expFlag} - ${parameters.length} parameters`);
            
            return entry;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[HtmParserEnhanced] Error parsing ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Determine if this is an operator documentation file
     */
    isOperatorFile(fileName) {
        // Handle experimental prefix
        const cleanName = fileName.replace(/^Experimental-/i, '');
        
        // Check for standard operator patterns
        const operatorPatterns = [
            /_CHOP\.htm$/i,
            /_TOP\.htm$/i,
            /_SOP\.htm$/i,
            /_DAT\.htm$/i,
            /_MAT\.htm$/i,
            /_COMP\.htm$/i,
            /_POP\.htm$/i,
            /CHOP_Class\.htm$/i,
            /TOP_Class\.htm$/i,
            /SOP_Class\.htm$/i,
            /DAT_Class\.htm$/i,
            /MAT_Class\.htm$/i,
            /COMP_Class\.htm$/i,
            /POP_Class\.htm$/i
        ];
        
        return operatorPatterns.some(pattern => pattern.test(cleanName));
    }

    /**
     * Enhanced operator info extraction with better name detection
     */
    extractOperatorInfoEnhanced($, fileName) {
        // Clean filename from experimental prefix
        const cleanFileName = fileName.replace(/^Experimental-/i, '');
        
        // Try multiple sources for operator name
        let operatorName = null;
        let displayName = null;
        
        // 1. Try .opName class (most reliable if present)
        const $opName = $('.opName').first();
        if ($opName.length > 0) {
            operatorName = $opName.text().trim();
        }
        
        // 2. Try H1 title
        if (!operatorName) {
            const h1Title = $('h1').first().text().trim();
            if (h1Title) {
                operatorName = h1Title;
            }
        }
        
        // 3. Try title tag
        if (!operatorName) {
            const title = $('title').text().trim();
            if (title) {
                // Remove TouchDesigner suffix
                operatorName = title.replace(/\s*-\s*TouchDesigner.*$/i, '').trim();
            }
        }
        
        if (!operatorName) {
            return null;
        }
        
        // Extract category
        const categoryMatch = operatorName.match(/\b(CHOP|TOP|SOP|DAT|MAT|COMP|POP)\b/);
        let category = null;
        
        if (categoryMatch) {
            category = categoryMatch[1];
        } else {
            // Try to extract from filename
            const fileMatch = cleanFileName.match(/_(CHOP|TOP|SOP|DAT|MAT|COMP|POP)/i);
            if (fileMatch) {
                category = fileMatch[1].toUpperCase();
            }
        }
        
        if (!category) {
            return null;
        }
        
        // Clean up operator name (remove category suffix if present)
        displayName = operatorName.replace(new RegExp(`\\s*${category}\\s*$`, 'i'), '').trim();
        
        // Check known mappings
        const normalizedName = this.normalize(displayName);
        if (this.operatorMappings.has(normalizedName)) {
            displayName = this.operatorMappings.get(normalizedName);
        }
        
        // Get description
        const description = $('p').first().text().trim() || `${displayName} operator for TouchDesigner`;
        
        return {
            id: `${displayName.toLowerCase().replace(/\s+/g, '_')}`,
            name: displayName,
            displayName: displayName,
            category: category,
            subcategory: this.determineSubcategory(displayName, category),
            description: description,
            summary: description.substring(0, 200)
        };
    }

    /**
     * Match parsed operator to TRUE list operator
     */
    matchToTrueOperator(operatorInfo, fileName) {
        if (!this.options.trueOperatorsList) return null;
        
        const category = operatorInfo.category;
        const categoryOps = this.options.trueOperatorsList[category];
        if (!categoryOps) return null;
        
        // First try exact match
        for (const trueOp of categoryOps) {
            if (this.normalize(trueOp) === this.normalize(operatorInfo.name)) {
                return { trueName: trueOp, matchType: 'exact' };
            }
        }
        
        // Try fuzzy match
        for (const trueOp of categoryOps) {
            if (this.isFuzzyMatch(trueOp, operatorInfo.name)) {
                return { trueName: trueOp, matchType: 'fuzzy' };
            }
        }
        
        // Try matching against filename patterns
        const baseFileName = fileName
            .replace(/^Experimental-/i, '')
            .replace(new RegExp(`_${category}\\.htm$`, 'i'), '')
            .replace(/_/g, ' ');
        
        for (const trueOp of categoryOps) {
            if (this.isFuzzyMatch(trueOp, baseFileName)) {
                return { trueName: trueOp, matchType: 'fuzzy' };
            }
        }
        
        return null;
    }

    /**
     * Extract parameters from DIV elements
     */
    extractParameters($) {
        const parameters = [];
        
        // Use the proven DIV-based extraction method
        $('div[id]').each((i, elem) => {
            const $div = $(elem);
            const divId = $div.attr('id');
            
            // Skip non-parameter divs
            if (!divId || divId === 'Palette:palette') return;
            
            // Find parameter name span with all possible class names
            const $paramName = $div.find('span.parNameSOP, span.parNameCHOP, span.parNameTOP, span.parNameDAT, span.parNameMAT, span.parNameCOMP, span.parNamePOP').first();
            
            if ($paramName.length > 0) {
                const paramName = $paramName.text().trim();
                if (paramName) {
                    // Get parameter description
                    const $clone = $div.clone();
                    $clone.find('span').remove();
                    const paramDescription = $clone.text().trim();
                    
                    parameters.push(new Parameter({
                        name: paramName,
                        displayName: paramName,
                        type: 'float', // Default type
                        defaultValue: null,
                        description: paramDescription || `${paramName} parameter`,
                        group: 'General'
                    }));
                }
            }
        });
        
        return parameters;
    }

    /**
     * Determine subcategory based on operator name and category
     */
    determineSubcategory(operatorName, category) {
        const name = operatorName.toLowerCase();
        
        if (category === 'CHOP') {
            if (name.includes('audio')) return 'Audio';
            if (name.includes('midi')) return 'MIDI';
            if (name.includes('osc')) return 'Network';
            if (name.includes('filter')) return 'Filters';
            if (name.includes('math')) return 'Math';
            return 'Generators';
        }
        
        if (category === 'TOP') {
            if (name.includes('blur') || name.includes('filter')) return 'Filters';
            if (name.includes('noise') || name.includes('ramp')) return 'Generators';
            if (name.includes('composite') || name.includes('over')) return 'Compositing';
            if (name.includes('nvidia')) return 'NVIDIA';
            return 'Filters';
        }
        
        if (category === 'SOP') {
            if (name.includes('primitive') || name.includes('sphere') || name.includes('box')) return 'Primitives';
            if (name.includes('deform') || name.includes('twist')) return 'Deformers';
            if (name.includes('copy') || name.includes('merge')) return 'Modifiers';
            return 'Generators';
        }
        
        if (category === 'DAT') {
            if (name.includes('script') || name.includes('execute')) return 'Scripts';
            if (name.includes('web') || name.includes('tcp')) return 'Network';
            if (name.includes('table') || name.includes('text')) return 'Data';
            return 'Utilities';
        }
        
        if (category === 'MAT') {
            if (name.includes('pbr')) return 'PBR';
            if (name.includes('phong') || name.includes('constant')) return 'Classic';
            return 'Materials';
        }
        
        if (category === 'COMP') {
            if (name.includes('ui') || name.includes('button') || name.includes('slider')) return 'UI';
            if (name.includes('light') || name.includes('camera')) return '3D';
            if (name.includes('container')) return 'Containers';
            return 'Components';
        }
        
        if (category === 'POP') {
            if (name.includes('force') || name.includes('wind')) return 'Forces';
            if (name.includes('sprite') || name.includes('render')) return 'Rendering';
            if (name.includes('limit') || name.includes('collision')) return 'Dynamics';
            return 'Particles';
        }
        
        return 'General';
    }

    /**
     * Extract keywords from operator name and description
     */
    extractKeywords(operatorName, description) {
        const keywords = [];
        
        // Add words from operator name
        const nameWords = operatorName.toLowerCase().split(/\s+/);
        keywords.push(...nameWords);
        
        // Add important words from description (skip common words)
        const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'operator']);
        
        const descWords = description.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word))
            .slice(0, 10);
        keywords.push(...descWords);
        
        // Remove duplicates
        return [...new Set(keywords)];
    }

    /**
     * Get parser statistics
     */
    getStats() {
        return { ...this.stats };
    }
}

// Default export for compatibility
export default HtmParserEnhanced;