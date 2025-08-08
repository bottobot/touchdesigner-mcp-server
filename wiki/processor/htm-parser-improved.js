/**
 * Improved metadata extraction method for HTM Parser
 * This replaces the extractMetadata method in htm-parser.js
 * Priority: H1 content > Title > Meta tags > Filename (last resort)
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
    
    // Extract subcategory from content
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
        'utility': 'Utility'
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
    
    return metadata;
}