/**
 * FIXED HTM Parser - Properly handles actual TouchDesigner documentation HTML structure
 * This version correctly extracts parameters from div elements, not tables
 */

import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import WikiEntry from '../models/wiki-entry.js';
import Parameter from '../models/parameter.js';

export class HtmParser {
    constructor(options = {}) {
        this.options = {
            encoding: options.encoding || 'utf-8',
            ...options
        };
        
        this.stats = {
            filesProcessed: 0,
            entriesCreated: 0,
            parametersExtracted: 0,
            errors: 0,
            warnings: 0
        };
    }

    async parseFile(filePath) {
        try {
            console.log(`[HTM Parser] Processing: ${filePath}`);
            
            // Read the file
            const htmlContent = await fs.readFile(filePath, this.options.encoding);
            
            // Parse with cheerio
            const $ = cheerio.load(htmlContent, {
                normalizeWhitespace: false,
                xmlMode: false,
                decodeEntities: true
            });
            
            // Extract metadata from H1 and title
            const metadata = this.extractMetadata($, filePath);
            
            // Extract parameters from DIV elements (not tables!)
            const parameters = this.extractParametersFromDivs($);
            
            // Extract description
            const description = this.extractDescription($);
            
            // Create WikiEntry
            const entry = new WikiEntry({
                id: WikiEntry.generateId(metadata.name, metadata.category),
                name: metadata.name,
                displayName: metadata.displayName,
                category: metadata.category,
                subcategory: metadata.subcategory,
                description: description,
                summary: description,
                parameters: parameters,
                sourceFile: filePath,
                url: metadata.url,
                rawHtml: htmlContent,
                processingDate: new Date().toISOString(),
                contentHash: WikiEntry.calculateHash(htmlContent)
            });
            
            // Update statistics
            this.stats.filesProcessed++;
            this.stats.entriesCreated++;
            this.stats.parametersExtracted += parameters.length;
            
            console.log(`[HTM Parser] Successfully processed: ${metadata.name} ${metadata.category} (${parameters.length} parameters)`);
            
            return entry;
            
        } catch (error) {
            console.error(`[HTM Parser] Error processing ${filePath}:`, error);
            this.stats.errors++;
            throw error;
        }
    }

    extractMetadata($, filePath) {
        const metadata = {
            name: '',
            displayName: '',
            category: '',
            subcategory: '',
            url: ''
        };
        
        // PRIMARY: Extract from H1 - most reliable
        const h1Text = $('h1.firstHeading, h1').first().text().trim();
        if (h1Text) {
            // Pattern: "Operator Name CATEGORY" (e.g., "Add SOP", "Noise CHOP")
            const operatorMatch = h1Text.match(/^(.+?)\s+(CHOP|TOP|SOP|DAT|MAT|COMP|POP)$/i);
            if (operatorMatch) {
                metadata.name = operatorMatch[1].trim();
                metadata.category = operatorMatch[2].toUpperCase();
                metadata.displayName = h1Text;
            }
            // Pattern for class pages: "operatorCATEGORY Class"
            else if (h1Text.includes('Class')) {
                const classMatch = h1Text.match(/^(\w+)\s+Class$/i);
                if (classMatch) {
                    const className = classMatch[1];
                    const categories = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
                    for (const cat of categories) {
                        if (className.toUpperCase().includes(cat)) {
                            metadata.category = cat;
                            // Remove category from name
                            const opName = className.replace(new RegExp(cat, 'i'), '');
                            // Convert camelCase to proper name
                            metadata.name = opName.replace(/([A-Z])/g, ' $1').trim();
                            metadata.name = metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1);
                            metadata.displayName = `${metadata.name} ${cat}`;
                            break;
                        }
                    }
                }
            }
        }
        
        // SECONDARY: Check title tag if needed
        if (!metadata.name || !metadata.category) {
            const title = $('title').text().trim();
            if (title && title !== 'TouchDesigner Documentation') {
                const cleanTitle = title.replace(/\s*-\s*Derivative\s*$/i, '').trim();
                
                // Try to extract from title
                const titleMatch = cleanTitle.match(/^(.+?)\s+(CHOP|TOP|SOP|DAT|MAT|COMP|POP)$/i);
                if (titleMatch) {
                    if (!metadata.name) metadata.name = titleMatch[1].trim();
                    if (!metadata.category) metadata.category = titleMatch[2].toUpperCase();
                    if (!metadata.displayName) metadata.displayName = cleanTitle;
                }
            }
        }
        
        // FALLBACK: Use filename as last resort
        if (!metadata.name) {
            const fileName = basename(filePath, extname(filePath));
            // Try to extract from filename patterns
            const fileMatch = fileName.match(/^(.+?)_(CHOP|TOP|SOP|DAT|MAT|COMP|POP)$/i);
            if (fileMatch) {
                metadata.name = fileMatch[1].replace(/_/g, ' ').trim();
                metadata.category = fileMatch[2].toUpperCase();
            } else {
                // Just use cleaned filename
                metadata.name = fileName.replace(/_/g, ' ').replace(/class$/i, '').trim();
            }
        }
        
        // Try to extract category from filename if still missing
        if (!metadata.category) {
            const fileName = basename(filePath, extname(filePath));
            const categories = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
            const fileNameLower = fileName.toLowerCase();
            for (const cat of categories) {
                if (fileNameLower.includes(cat.toLowerCase())) {
                    metadata.category = cat;
                    break;
                }
            }
        }
        
        // Extract URL
        metadata.url = $('link[rel="canonical"]').attr('href') || 
                      $('meta[property="og:url"]').attr('content') || '';
        
        // Set display name if missing
        if (!metadata.displayName) {
            metadata.displayName = metadata.name + (metadata.category ? ` ${metadata.category}` : '');
        }
        
        return metadata;
    }

    extractDescription($) {
        // Try meta description first
        let description = $('meta[name="description"]').attr('content') || '';
        
        // If not found, get first paragraph after summary heading
        if (!description) {
            const summarySection = $('h2:contains("Summary")').first();
            if (summarySection.length > 0) {
                const nextP = summarySection.nextAll('p').first();
                if (nextP.length > 0) {
                    description = nextP.text().trim();
                }
            }
        }
        
        // Fallback to first paragraph
        if (!description) {
            const firstP = $('p').first();
            if (firstP.length > 0) {
                description = firstP.text().trim();
            }
        }
        
        return description;
    }

    /**
     * Extract parameters from DIV elements (actual HTML structure!)
     */
    extractParametersFromDivs($) {
        const parameters = [];
        
        // Find parameter divs - they have IDs and contain parameter info
        // Pattern 1: Direct parameter divs with id attribute
        $('div[id]').each((i, elem) => {
            const $div = $(elem);
            const divId = $div.attr('id');
            
            // Skip navigation and non-parameter divs
            if (!divId || divId.includes('mw-') || divId.includes('toc') || 
                divId === 'content' || divId === 'footer' || divId === 'header') {
                return;
            }
            
            // Look for parameter name span
            const $paramName = $div.find('span.parNameSOP, span.parNameCHOP, span.parNameTOP, span.parNameDAT, span.parNameMAT, span.parNameCOMP, span.parName').first();
            
            if ($paramName.length > 0) {
                // Extract parameter name (text before any code element)
                let paramNameText = $paramName.clone().children('code').remove().end().text().trim();
                
                // Extract parameter code/id
                const $code = $div.find('code').first();
                const paramCode = $code.text().trim();
                
                // Extract description (text after the dash)
                const divText = $div.clone().children().remove().end().text().trim();
                let description = divText;
                
                // If there's a dash, get text after it
                if (divText.includes(' - ')) {
                    description = divText.split(' - ')[1] || divText;
                }
                
                // Also get any following text in p or div elements
                const $nextP = $div.find('p').first();
                if ($nextP.length > 0) {
                    description = $nextP.text().trim();
                }
                
                if (paramNameText && paramCode) {
                    const param = new Parameter({
                        name: paramCode, // Use the code as the actual parameter name
                        label: paramNameText, // Display name
                        description: description,
                        sourceElement: 'div'
                    });
                    
                    parameters.push(param);
                }
            }
        });
        
        // Pattern 2: Parameters might also be in definition lists (dt/dd)
        $('dt').each((i, elem) => {
            const $dt = $(elem);
            const $dd = $dt.next('dd');
            
            if ($dd.length > 0) {
                const name = $dt.text().trim();
                const description = $dd.text().trim();
                
                // Check if this looks like a parameter
                if (name && !name.includes('Contents') && !name.includes('Navigation')) {
                    const param = new Parameter({
                        name: name,
                        description: description,
                        sourceElement: 'dl'
                    });
                    
                    parameters.push(param);
                }
            }
        });
        
        // Pattern 3: Check for parameter tables (some pages might have them)
        $('table').each((i, table) => {
            const $table = $(table);
            const tableText = $table.text().toLowerCase();
            
            // Check if this looks like a parameter table
            if (tableText.includes('parameter') || tableText.includes('name')) {
                const headers = [];
                $table.find('th, thead td').each((i, th) => {
                    headers.push($(th).text().trim().toLowerCase());
                });
                
                const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('parameter'));
                const descIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
                
                if (nameIndex >= 0) {
                    $table.find('tbody tr, tr').each((i, row) => {
                        const $row = $(row);
                        const cells = $row.find('td');
                        
                        if (cells.length > nameIndex) {
                            const name = $(cells[nameIndex]).text().trim();
                            const description = descIndex >= 0 && cells.length > descIndex ? 
                                               $(cells[descIndex]).text().trim() : '';
                            
                            if (name) {
                                const param = new Parameter({
                                    name: name,
                                    description: description,
                                    sourceElement: 'table'
                                });
                                
                                parameters.push(param);
                            }
                        }
                    });
                }
            }
        });
        
        return parameters;
    }

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
            console.warn(`[HTM Parser] ${errors.length} files failed to process`);
        }
        
        return entries;
    }

    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    getStats() {
        return { ...this.stats };
    }

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