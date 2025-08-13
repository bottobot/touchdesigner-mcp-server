#!/usr/bin/env node

// Script to integrate additional TouchDesigner tutorials into TD-MCP server
// This script parses HTML tutorial files and converts them to JSON format

import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { HtmParserPerfect } from '../wiki/processor/htm-parser-perfect.js';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const TD_DOCS_PATH = 'C:\\Program Files\\Derivative\\TouchDesigner\\Samples\\Learn\\OfflineHelp\\https.docs.derivative.ca';
const OUTPUT_PATH = join(__dirname, '..', 'wiki', 'data', 'tutorials');

// List of tutorials to integrate
const TUTORIALS_TO_INTEGRATE = [
    {
        htmlFile: 'Introduction_to_Python_Tutorial.htm',
        id: 'introduction_to_python_tutorial',
        name: 'Introduction to Python Tutorial',
        subcategory: 'Python Tutorial',
        description: 'Essential guide for beginners learning TouchDesigner Python scripting'
    },
    {
        htmlFile: 'Write_a_CPlusPlus_Plugin.htm',
        id: 'write_a_cplusplus_plugin',
        name: 'Write a C++ Plugin',
        subcategory: 'C++ Tutorial',
        description: 'Advanced C++ integration for creating TouchDesigner plugins'
    },
    {
        htmlFile: 'Write_a_CUDA_DLL.htm',
        id: 'write_a_cuda_dll',
        name: 'Write a CUDA DLL',
        subcategory: 'CUDA Tutorial',
        description: 'GPU programming with CUDA for TouchDesigner'
    },
    {
        htmlFile: 'Write_a_GLSL_Material.htm',
        id: 'write_a_glsl_material',
        name: 'Write a GLSL Material',
        subcategory: 'GLSL Tutorial',
        description: 'Creating custom GLSL materials for rendering in TouchDesigner'
    },
    {
        htmlFile: 'Video_Streaming_User_Guide.htm',
        id: 'video_streaming_user_guide',
        name: 'Video Streaming User Guide',
        subcategory: 'Video Guide',
        description: 'Complete guide for video streaming workflows in TouchDesigner'
    },
    {
        htmlFile: 'TouchDesigner_Video_Server_Specification_Guide.htm',
        id: 'touchdesigner_video_server_specification_guide',
        name: 'TouchDesigner Video Server Specification Guide',
        subcategory: 'Video Guide',
        description: 'Professional video server setup and specifications'
    },
    {
        htmlFile: 'TDBitwig_User_Guide.htm',
        id: 'tdbitwig_user_guide',
        name: 'TDBitwig User Guide',
        subcategory: 'Integration Guide',
        description: 'Integration guide for using TouchDesigner with Bitwig Studio DAW'
    }
];

// Initialize parser
const htmParser = new HtmParserPerfect();

/**
 * Parse and convert a single tutorial HTML file to JSON
 */
async function parseTutorial(tutorialConfig) {
    console.log(`[Tutorial Parser] Processing: ${tutorialConfig.name}`);
    
    try {
        const htmlPath = join(TD_DOCS_PATH, tutorialConfig.htmlFile);
        
        // Check if file exists
        try {
            await fs.access(htmlPath);
        } catch (error) {
            console.error(`[Tutorial Parser] File not found: ${htmlPath}`);
            return null;
        }
        
        // Read and parse HTML content
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        const $ = cheerio.load(htmlContent);
        
        // Extract content from HTML
        const title = $('h1').first().text().trim() || tutorialConfig.name;
        const description = $('p').first().text().trim() || tutorialConfig.description;
        
        // Extract sections
        const sections = [];
        const tableOfContents = [];
        
        // Process H2 and H3 headings as sections
        let currentSection = null;
        $('h2, h3, h4, p, ul, ol, pre, code').each((i, elem) => {
            const $elem = $(elem);
            const tagName = elem.tagName.toLowerCase();
            
            if (tagName === 'h2') {
                // New main section
                if (currentSection) {
                    sections.push(currentSection);
                }
                const sectionTitle = $elem.text().trim();
                currentSection = {
                    title: sectionTitle,
                    level: 2,
                    content: []
                };
                tableOfContents.push({
                    number: `${sections.length + 1}`,
                    text: sectionTitle,
                    href: `#${sectionTitle.replace(/\s+/g, '_')}`
                });
            } else if (tagName === 'h3' || tagName === 'h4') {
                // Subsection
                const subsectionTitle = $elem.text().trim();
                const level = tagName === 'h3' ? 3 : 4;
                if (currentSection) {
                    currentSection.content.push({
                        type: 'subsection',
                        title: subsectionTitle,
                        level: level
                    });
                }
            } else if (tagName === 'p') {
                // Paragraph
                const text = $elem.text().trim();
                if (text && currentSection) {
                    currentSection.content.push({
                        type: 'paragraph',
                        text: text
                    });
                }
            } else if (tagName === 'ul' || tagName === 'ol') {
                // List
                const items = [];
                $elem.find('li').each((j, li) => {
                    items.push($(li).text().trim());
                });
                if (items.length > 0 && currentSection) {
                    currentSection.content.push({
                        type: tagName === 'ul' ? 'unordered-list' : 'ordered-list',
                        items: items
                    });
                }
            } else if (tagName === 'pre' || tagName === 'code') {
                // Code block
                const code = $elem.text().trim();
                if (code && currentSection) {
                    currentSection.content.push({
                        type: 'code',
                        text: code,
                        language: 'python' // Default to Python for TouchDesigner
                    });
                }
            }
        });
        
        // Add the last section
        if (currentSection) {
            sections.push(currentSection);
        }
        
        // Extract related links
        const relatedLinks = [];
        $('a').each((i, elem) => {
            const $link = $(elem);
            const href = $link.attr('href');
            const text = $link.text().trim();
            if (href && text && href.endsWith('.htm')) {
                relatedLinks.push({
                    text: text,
                    href: href
                });
            }
        });
        
        // Extract images
        const images = [];
        $('img').each((i, elem) => {
            const $img = $(elem);
            const src = $img.attr('src');
            const alt = $img.attr('alt') || '';
            if (src) {
                images.push({
                    src: src,
                    alt: alt,
                    caption: alt
                });
            }
        });
        
        // Generate keywords
        const titleWords = tutorialConfig.name.toLowerCase().split(/\s+/);
        const categoryWords = tutorialConfig.subcategory.toLowerCase().split(/\s+/);
        const descWords = description.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3)
            .slice(0, 10);
        const keywords = [...new Set([...titleWords, ...categoryWords, ...descWords])];
        
        // Create tutorial JSON structure
        const tutorial = {
            id: tutorialConfig.id,
            name: tutorialConfig.name,
            displayName: title,
            category: 'TUTORIAL',
            subcategory: tutorialConfig.subcategory,
            type: 'tutorial',
            description: description,
            summary: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
            content: {
                sections: sections,
                tableOfContents: tableOfContents,
                relatedLinks: relatedLinks.slice(0, 10), // Limit to 10 related links
                images: images
            },
            keywords: keywords,
            tags: ['Tutorial', 'TouchDesigner', tutorialConfig.name],
            searchWeight: 2,
            lastUpdated: new Date().toISOString(),
            sourceFile: htmlPath,
            isValid: true,
            validationErrors: []
        };
        
        console.log(`[Tutorial Parser] Successfully parsed: ${tutorialConfig.name}`);
        return tutorial;
        
    } catch (error) {
        console.error(`[Tutorial Parser] Error parsing ${tutorialConfig.name}:`, error);
        return null;
    }
}

/**
 * Save tutorial JSON to file
 */
async function saveTutorial(tutorial) {
    if (!tutorial) return false;
    
    try {
        const outputPath = join(OUTPUT_PATH, `${tutorial.id}.json`);
        await fs.writeFile(outputPath, JSON.stringify(tutorial, null, 2), 'utf-8');
        console.log(`[Tutorial Parser] Saved: ${outputPath}`);
        return true;
    } catch (error) {
        console.error(`[Tutorial Parser] Error saving ${tutorial.name}:`, error);
        return false;
    }
}

/**
 * Main integration function
 */
async function integrateTutorials() {
    console.log('========================================');
    console.log('TD-MCP Tutorial Integration Script');
    console.log('========================================\n');
    
    // Ensure output directory exists
    try {
        await fs.mkdir(OUTPUT_PATH, { recursive: true });
    } catch (error) {
        console.error('[Tutorial Parser] Error creating output directory:', error);
        return;
    }
    
    const results = {
        successful: [],
        failed: []
    };
    
    // Process each tutorial
    for (const tutorialConfig of TUTORIALS_TO_INTEGRATE) {
        const tutorial = await parseTutorial(tutorialConfig);
        if (tutorial) {
            const saved = await saveTutorial(tutorial);
            if (saved) {
                results.successful.push(tutorialConfig.name);
            } else {
                results.failed.push(tutorialConfig.name);
            }
        } else {
            results.failed.push(tutorialConfig.name);
        }
    }
    
    // Print summary
    console.log('\n========================================');
    console.log('Integration Summary');
    console.log('========================================');
    console.log(`✅ Successfully integrated: ${results.successful.length} tutorials`);
    if (results.successful.length > 0) {
        results.successful.forEach(name => console.log(`   - ${name}`));
    }
    
    if (results.failed.length > 0) {
        console.log(`\n❌ Failed to integrate: ${results.failed.length} tutorials`);
        results.failed.forEach(name => console.log(`   - ${name}`));
    }
    
    console.log('\n✓ Tutorial integration complete!');
    console.log('The new tutorials have been added to:', OUTPUT_PATH);
    console.log('Restart the TD-MCP server to use the new tutorials.');
}

// Run the integration
integrateTutorials().catch(error => {
    console.error('[Tutorial Parser] Fatal error:', error);
    process.exit(1);
});