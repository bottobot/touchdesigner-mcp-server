/**
 * Python API Parser for TouchDesigner Python Classes
 * Extracts Python class documentation from _Class.htm files
 */

import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import { basename } from 'path';

export class PythonApiParser {
    constructor(options = {}) {
        this.options = {
            encoding: options.encoding || 'utf-8',
            ...options
        };
        
        this.stats = {
            filesProcessed: 0,
            classesExtracted: 0,
            membersExtracted: 0,
            methodsExtracted: 0,
            errors: 0
        };
    }

    /**
     * Parse a single Python Class HTM file
     */
    async parseFile(filePath) {
        this.stats.filesProcessed++;
        
        try {
            const content = await fs.readFile(filePath, this.options.encoding);
            const $ = cheerio.load(content);
            const fileName = basename(filePath);
            
            // Check if this is a Python class file
            if (!this.isPythonClassFile(fileName)) {
                return null;
            }
            
            // Extract class information
            const classInfo = this.extractClassInfo($, fileName);
            if (!classInfo) {
                return null;
            }
            
            // Extract members and methods
            const members = this.extractMembers($);
            const methods = this.extractMethods($);
            
            this.stats.classesExtracted++;
            this.stats.membersExtracted += members.length;
            this.stats.methodsExtracted += methods.length;
            
            return {
                ...classInfo,
                members,
                methods
            };
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[PythonApiParser] Error parsing ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Check if file is a Python class documentation file
     */
    isPythonClassFile(fileName) {
        return fileName.endsWith('_Class.htm') || fileName === 'td_Module.htm';
    }

    /**
     * Extract class information from HTML
     */
    extractClassInfo($, fileName) {
        // Get class name from H1
        const h1Title = $('h1').first().text().trim();
        if (!h1Title) {
            return null;
        }
        
        // Clean up the class name
        const className = h1Title.replace(' Class', '').trim();
        
        // Get description from first paragraph
        const description = $('.mw-parser-output > p').first().text().trim();
        
        // Extract category if it's an operator class
        let category = 'General';
        if (className.match(/^(CHOP|TOP|SOP|DAT|MAT|COMP|POP)$/)) {
            category = 'Operator';
        } else if (className.includes('COMP')) {
            category = 'Component';
        }
        
        return {
            className,
            displayName: h1Title,
            description: description || `Python ${className} class documentation`,
            category,
            fileName
        };
    }

    /**
     * Extract class members (properties/attributes)
     */
    extractMembers($) {
        const members = [];
        
        // Find all member definitions
        $('div[id]').each((i, elem) => {
            const $elem = $(elem);
            const id = $elem.attr('id');
            
            // Skip non-member divs
            if (!id || id === 'toc' || id.startsWith('mw-')) return;
            
            // Look for member definition pattern
            const $code = $elem.find('code.python').first();
            if ($code.length > 0) {
                const signature = $code.text().trim();
                
                // Get return type
                const $return = $elem.find('code.return').first();
                const returnType = $return.text().trim();
                
                // Check if read-only
                const isReadOnly = $elem.find('b:contains("Read Only")').length > 0;
                
                // Get description
                const $blockquote = $elem.next('blockquote');
                const description = $blockquote.length > 0 ? 
                    $blockquote.find('p').first().text().trim() : '';
                
                // Skip if this looks like a method (has parentheses)
                if (signature.includes('(') && !signature.startsWith('[')) {
                    return;
                }
                
                members.push({
                    name: signature,
                    id: id,
                    returnType,
                    readOnly: isReadOnly,
                    description: description || `${signature} member`
                });
            }
        });
        
        return members;
    }

    /**
     * Extract class methods
     */
    extractMethods($) {
        const methods = [];
        
        // Find all method definitions
        $('div[id]').each((i, elem) => {
            const $elem = $(elem);
            const id = $elem.attr('id');
            
            // Skip non-method divs
            if (!id || id === 'toc' || id.startsWith('mw-')) return;
            
            // Look for method definition pattern
            const $code = $elem.find('code.python').first();
            if ($code.length > 0) {
                const signature = $code.text().trim();
                
                // Only process if it looks like a method (has parentheses)
                if (!signature.includes('(') || signature.startsWith('[')) {
                    return;
                }
                
                // Get return type
                const $return = $elem.find('code.return').first();
                const returnType = $return.text().trim();
                
                // Get description and parameters
                const $blockquote = $elem.next('blockquote');
                let description = '';
                const parameters = [];
                
                if ($blockquote.length > 0) {
                    description = $blockquote.find('p').first().text().trim();
                    
                    // Extract parameters from list items
                    $blockquote.find('ul li').each((j, li) => {
                        const $li = $(li);
                        const paramText = $li.text().trim();
                        
                        // Parse parameter format: "name - description"
                        const match = paramText.match(/^(\w+)\s*-\s*(.+)$/);
                        if (match) {
                            parameters.push({
                                name: match[1],
                                description: match[2]
                            });
                        }
                    });
                }
                
                methods.push({
                    name: id,
                    signature,
                    returnType,
                    description: description || `${signature} method`,
                    parameters
                });
            }
        });
        
        return methods;
    }

    /**
     * Get parser statistics
     */
    getStats() {
        return { ...this.stats };
    }
}

export default PythonApiParser;