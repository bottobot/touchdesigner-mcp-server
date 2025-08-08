/**
 * Content Extractor - Specialized content extraction module for TouchDesigner HTM documentation
 * Focuses on deep parameter extraction, section organization, and content structuring
 */

import * as cheerio from 'cheerio';
import Parameter from '../models/parameter.js';

export class ContentExtractor {
    /**
     * Create a new content extractor instance
     * @param {Object} options - Extractor configuration options
     */
    constructor(options = {}) {
        this.options = {
            strictParameterParsing: options.strictParameterParsing || false,
            extractHiddenParameters: options.extractHiddenParameters || true,
            normalizeParameterNames: options.normalizeParameterNames !== undefined ? options.normalizeParameterNames : true,
            groupParametersByPage: options.groupParametersByPage !== undefined ? options.groupParametersByPage : true,
            extractExpressionExamples: options.extractExpressionExamples !== undefined ? options.extractExpressionExamples : true,
            ...options
        };
        
        // Parameter type mappings and patterns
        this.parameterPatterns = {
            // TouchDesigner specific parameter types
            types: {
                'float': { type: 'Float', dataType: 'number' },
                'int': { type: 'Int', dataType: 'number' },
                'integer': { type: 'Int', dataType: 'number' },
                'string': { type: 'String', dataType: 'string' },
                'toggle': { type: 'Toggle', dataType: 'boolean' },
                'menu': { type: 'Menu', dataType: 'number' },
                'pulse': { type: 'Pulse', dataType: 'boolean' },
                'momentary': { type: 'Momentary', dataType: 'boolean' },
                'file': { type: 'File', dataType: 'string' },
                'folder': { type: 'Folder', dataType: 'string' },
                'op': { type: 'OP', dataType: 'string' },
                'chop': { type: 'CHOP', dataType: 'string' },
                'top': { type: 'TOP', dataType: 'string' },
                'sop': { type: 'SOP', dataType: 'string' },
                'dat': { type: 'DAT', dataType: 'string' },
                'mat': { type: 'MAT', dataType: 'string' },
                'comp': { type: 'COMP', dataType: 'string' },
                'pop': { type: 'POP', dataType: 'string' },
                'color': { type: 'Color', dataType: 'array', dimensions: 3 },
                'rgb': { type: 'Color', dataType: 'array', dimensions: 3 },
                'rgba': { type: 'Color', dataType: 'array', dimensions: 4 },
                'uv': { type: 'UV', dataType: 'array', dimensions: 2 },
                'xy': { type: 'XY', dataType: 'array', dimensions: 2 },
                'xyz': { type: 'XYZ', dataType: 'array', dimensions: 3 },
                'xyzw': { type: 'XYZW', dataType: 'array', dimensions: 4 },
                'wh': { type: 'WH', dataType: 'array', dimensions: 2 }
            },
            
            // Regex patterns for parameter detection
            ranges: /^([-\d.]+)\s*(?:to|\.\.\.|\-)\s*([-\d.]+)$/,
            defaultValue: /default:?\s*(.+?)(?:\n|$)/i,
            units: /\b(pixels?|seconds?|hz|db|degrees?|radians?|meters?|percent|%)\b/i,
            menuOptions: /\b(?:options?|choices?|values?):\s*(.+)/i
        };
        
        // Common parameter groups and pages
        this.parameterGroups = {
            'common': ['Active', 'Viewer Active', 'Real Time', 'Cooking', 'Info'],
            'transform': ['Translate', 'Rotate', 'Scale', 'Pivot', 'Pre-transform'],
            'material': ['Material', 'Diffuse', 'Specular', 'Ambient', 'Emission', 'Alpha'],
            'render': ['Render', 'Output', 'Resolution', 'Pixel Format', 'Aspect'],
            'geometry': ['Geometry', 'Primitives', 'Points', 'Vertices', 'Polygons'],
            'time': ['Time', 'Speed', 'Frame', 'Timeline', 'Playback'],
            'audio': ['Audio', 'Volume', 'Pan', 'Frequency', 'Amplitude', 'Sample Rate'],
            'data': ['Data', 'Channels', 'Samples', 'Rate', 'Input', 'Output']
        };
    }

    /**
     * Extract comprehensive parameter information from HTML content
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Object} options - Extraction options
     * @returns {Object} Extracted parameter data
     */
    extractParameters($, options = {}) {
        const results = {
            parameters: [],
            groups: {},
            pages: {},
            metadata: {
                totalParameters: 0,
                parametersByType: {},
                parametersByGroup: {},
                extractionMethod: []
            }
        };
        
        // Try multiple extraction methods
        const extractionMethods = [
            () => this.extractFromParameterTables($),
            () => this.extractFromParameterDivs($),
            () => this.extractFromDefinitionLists($),
            () => this.extractFromParameterSections($),
            () => this.extractFromParameterIDs($)
        ];
        
        for (const method of extractionMethods) {
            try {
                const methodResults = method();
                if (methodResults.length > 0) {
                    results.parameters.push(...methodResults);
                    results.metadata.extractionMethod.push(method.name || 'anonymous');
                }
            } catch (error) {
                console.warn('[Content Extractor] Parameter extraction method failed:', error);
            }
        }
        
        // Remove duplicates and normalize
        results.parameters = this.deduplicateParameters(results.parameters);
        
        // Group parameters
        if (this.options.groupParametersByPage) {
            this.groupParameters(results);
        }
        
        // Update metadata
        results.metadata.totalParameters = results.parameters.length;
        results.parameters.forEach(param => {
            // Count by type
            results.metadata.parametersByType[param.type] = 
                (results.metadata.parametersByType[param.type] || 0) + 1;
            
            // Count by group
            if (param.group) {
                results.metadata.parametersByGroup[param.group] = 
                    (results.metadata.parametersByGroup[param.group] || 0) + 1;
            }
        });
        
        return results;
    }

    /**
     * Extract parameters from table structures
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {Array} Array of Parameter objects
     */
    extractFromParameterTables($) {
        const parameters = [];
        
        $('table').each((tableIndex, table) => {
            const $table = $(table);
            const tableText = $table.text().toLowerCase();
            
            // Check if this table contains parameters
            if (!this.isParameterTable(tableText)) return;
            
            const headers = this.extractTableHeaders($table);
            const headerMap = this.mapTableHeaders(headers);
            
            $table.find('tbody tr, tr').each((rowIndex, row) => {
                const $row = $(row);
                const cells = $row.find('td, th');
                
                if (cells.length < 2 || $row.find('th').length > 0) return; // Skip header rows
                
                const param = this.extractParameterFromTableRow($, cells, headerMap, tableIndex, rowIndex);
                if (param && param.name) {
                    parameters.push(param);
                }
            });
        });
        
        return parameters;
    }

    /**
     * Extract parameters from div elements with parameter IDs
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {Array} Array of Parameter objects
     */
    extractFromParameterDivs($) {
        const parameters = [];
        
        // Look for divs with parameter-like IDs or classes
        $('div[id*="param"], div[class*="param"], .parameter, .param').each((index, div) => {
            const $div = $(div);
            const param = this.extractParameterFromDiv($, $div, index);
            if (param && param.name) {
                parameters.push(param);
            }
        });
        
        return parameters;
    }

    /**
     * Extract parameters from definition lists
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {Array} Array of Parameter objects
     */
    extractFromDefinitionLists($) {
        const parameters = [];
        
        $('dl').each((listIndex, dl) => {
            const $dl = $(dl);
            const listText = $dl.text().toLowerCase();
            
            // Check if this list contains parameters
            if (!this.isParameterList(listText)) return;
            
            $dl.find('dt').each((termIndex, dt) => {
                const $dt = $(dt);
                const $dd = $dt.next('dd');
                
                const param = this.extractParameterFromDefinitionTerm($, $dt, $dd, listIndex, termIndex);
                if (param && param.name) {
                    parameters.push(param);
                }
            });
        });
        
        return parameters;
    }

    /**
     * Extract parameters from parameter sections identified by headings
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {Array} Array of Parameter objects
     */
    extractFromParameterSections($) {
        const parameters = [];
        
        $('h1, h2, h3, h4, h5, h6').each((index, heading) => {
            const $heading = $(heading);
            const headingText = $heading.text().toLowerCase();
            
            if (this.isParameterHeading(headingText)) {
                const sectionParams = this.extractParametersFromSection($, $heading, index);
                parameters.push(...sectionParams);
            }
        });
        
        return parameters;
    }

    /**
     * Extract parameters from elements with parameter-specific IDs
     * @param {CheerioAPI} $ - Cheerio instance
     * @returns {Array} Array of Parameter objects
     */
    extractFromParameterIDs($) {
        const parameters = [];
        
        // Look for elements with TouchDesigner parameter naming patterns
        $('[id]').each((index, element) => {
            const $element = $(element);
            const id = $element.attr('id');
            
            if (this.isParameterID(id)) {
                const param = this.extractParameterFromIDElement($, $element, index);
                if (param && param.name) {
                    parameters.push(param);
                }
            }
        });
        
        return parameters;
    }

    /**
     * Extract a parameter from a table row
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} cells - Table cells
     * @param {Object} headerMap - Header to index mapping
     * @param {number} tableIndex - Table index
     * @param {number} rowIndex - Row index
     * @returns {Parameter} Parameter object
     */
    extractParameterFromTableRow($, cells, headerMap, tableIndex, rowIndex) {
        const paramData = {
            sourceElement: 'table',
            rawData: {
                tableIndex,
                rowIndex,
                cellCount: cells.length
            }
        };
        
        // Extract basic information
        paramData.name = this.getCellText($(cells[headerMap.name || 0]));
        paramData.type = this.getCellText($(cells[headerMap.type || 1]));
        paramData.defaultValue = this.getCellText($(cells[headerMap.default || 2]));
        paramData.description = this.getCellText($(cells[headerMap.description || 3]));
        
        // Extract additional information from other columns
        if (headerMap.range !== undefined) {
            const rangeText = this.getCellText($(cells[headerMap.range]));
            const range = this.parseParameterRange(rangeText);
            if (range) {
                paramData.minValue = range.min;
                paramData.maxValue = range.max;
            }
        }
        
        if (headerMap.units !== undefined) {
            paramData.units = this.getCellText($(cells[headerMap.units]));
        }
        
        if (headerMap.group !== undefined) {
            paramData.group = this.getCellText($(cells[headerMap.group]));
        }
        
        // Parse type information
        if (paramData.type) {
            const typeInfo = this.parseParameterType(paramData.type);
            Object.assign(paramData, typeInfo);
        }
        
        // Parse default value
        if (paramData.defaultValue) {
            paramData.defaultValue = this.parseParameterValue(paramData.defaultValue, paramData.type);
        }
        
        // Extract menu options if it's a menu parameter
        if (paramData.type === 'Menu' || paramData.type === 'menu') {
            const menuInfo = this.extractMenuOptions($, $(cells[headerMap.description || 3]));
            if (menuInfo.items.length > 0) {
                paramData.menuItems = menuInfo.items;
                paramData.menuLabels = menuInfo.labels;
            }
        }
        
        return new Parameter(paramData);
    }

    /**
     * Extract a parameter from a div element
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $div - Div element
     * @param {number} index - Element index
     * @returns {Parameter} Parameter object
     */
    extractParameterFromDiv($, $div, index) {
        const paramData = {
            sourceElement: 'div',
            rawData: { index, id: $div.attr('id'), class: $div.attr('class') }
        };
        
        // Try different extraction strategies
        paramData.name = this.extractFromDiv($div, ['.name', '.param-name', '.parameter-name', '[data-name]']) ||
                         this.extractParameterNameFromID($div.attr('id'));
        
        paramData.type = this.extractFromDiv($div, ['.type', '.param-type', '.parameter-type', '[data-type]']);
        
        paramData.defaultValue = this.extractFromDiv($div, ['.default', '.param-default', '.default-value', '[data-default]']);
        
        paramData.description = this.extractFromDiv($div, ['.description', '.desc', '.param-desc', '.help', '[data-description]']);
        
        paramData.group = this.extractFromDiv($div, ['.group', '.param-group', '.page', '[data-group]']);
        
        // Look for range information
        const rangeText = this.extractFromDiv($div, ['.range', '.min-max', '[data-range]']);
        if (rangeText) {
            const range = this.parseParameterRange(rangeText);
            if (range) {
                paramData.minValue = range.min;
                paramData.maxValue = range.max;
            }
        }
        
        // Parse type information
        if (paramData.type) {
            const typeInfo = this.parseParameterType(paramData.type);
            Object.assign(paramData, typeInfo);
        }
        
        return paramData.name ? new Parameter(paramData) : null;
    }

    /**
     * Extract a parameter from definition term/description pair
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $dt - Definition term
     * @param {Cheerio} $dd - Definition description
     * @param {number} listIndex - List index
     * @param {number} termIndex - Term index
     * @returns {Parameter} Parameter object
     */
    extractParameterFromDefinitionTerm($, $dt, $dd, listIndex, termIndex) {
        const paramData = {
            sourceElement: 'dl',
            rawData: { listIndex, termIndex }
        };
        
        // Extract name from term
        paramData.name = $dt.text().trim();
        
        // Extract information from description
        const descriptionText = $dd.text().trim();
        paramData.description = descriptionText;
        
        // Try to extract type information from description
        const typeMatch = descriptionText.match(/\b(float|int|integer|string|toggle|menu|pulse|file|folder|op|chop|top|sop|dat|mat|comp|pop)\b/i);
        if (typeMatch) {
            paramData.type = typeMatch[1];
        }
        
        // Try to extract default value
        const defaultMatch = descriptionText.match(this.parameterPatterns.defaultValue);
        if (defaultMatch) {
            paramData.defaultValue = defaultMatch[1].trim();
        }
        
        // Try to extract range
        const rangeMatch = descriptionText.match(this.parameterPatterns.ranges);
        if (rangeMatch) {
            paramData.minValue = parseFloat(rangeMatch[1]);
            paramData.maxValue = parseFloat(rangeMatch[2]);
        }
        
        // Try to extract units
        const unitsMatch = descriptionText.match(this.parameterPatterns.units);
        if (unitsMatch) {
            paramData.units = unitsMatch[1];
        }
        
        // Parse type information
        if (paramData.type) {
            const typeInfo = this.parseParameterType(paramData.type);
            Object.assign(paramData, typeInfo);
        }
        
        return new Parameter(paramData);
    }

    /**
     * Parse parameter type string and return type information
     * @param {string} typeString - Type string to parse
     * @returns {Object} Type information
     */
    parseParameterType(typeString) {
        const normalized = typeString.trim().toLowerCase();
        const typeInfo = this.parameterPatterns.types[normalized] || {
            type: typeString,
            dataType: 'string'
        };
        
        // Check for array indicators
        const isArray = typeString.includes('[') || typeString.includes('vector') || typeString.includes('array');
        if (isArray) {
            typeInfo.isArray = true;
            const sizeMatch = typeString.match(/\[(\d+)\]/);
            if (sizeMatch) {
                typeInfo.arraySize = parseInt(sizeMatch[1]);
            }
        }
        
        return typeInfo;
    }

    /**
     * Parse parameter value based on type
     * @param {string} valueString - Value string to parse
     * @param {string} type - Parameter type
     * @returns {*} Parsed value
     */
    parseParameterValue(valueString, type) {
        if (!valueString || valueString === '') return null;
        
        const trimmed = valueString.trim();
        const normalizedType = (type || '').toLowerCase();
        
        switch (normalizedType) {
            case 'int':
            case 'integer':
                const intValue = parseInt(trimmed);
                return isNaN(intValue) ? null : intValue;
                
            case 'float':
                const floatValue = parseFloat(trimmed);
                return isNaN(floatValue) ? null : floatValue;
                
            case 'toggle':
                return trimmed.toLowerCase() === 'true' || 
                       trimmed.toLowerCase() === 'on' || 
                       trimmed === '1';
                       
            case 'menu':
                const menuValue = parseInt(trimmed);
                return isNaN(menuValue) ? trimmed : menuValue;
                
            default:
                return trimmed;
        }
    }

    /**
     * Parse parameter range string
     * @param {string} rangeString - Range string to parse
     * @returns {Object|null} Range object with min/max or null
     */
    parseParameterRange(rangeString) {
        if (!rangeString) return null;
        
        const match = rangeString.match(this.parameterPatterns.ranges);
        if (match) {
            return {
                min: parseFloat(match[1]),
                max: parseFloat(match[2])
            };
        }
        
        return null;
    }

    /**
     * Extract menu options from parameter description
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $element - Element containing menu information
     * @returns {Object} Menu items and labels
     */
    extractMenuOptions($, $element) {
        const menuData = { items: [], labels: [] };
        const text = $element.text();
        
        // Try to find menu options in text
        const menuMatch = text.match(this.parameterPatterns.menuOptions);
        if (menuMatch) {
            const optionsText = menuMatch[1];
            const options = optionsText.split(/[,;|]/).map(opt => opt.trim()).filter(opt => opt.length > 0);
            
            options.forEach((option, index) => {
                // Check if option has label format "value:label" or "label(value)"
                const labelMatch = option.match(/^(.+?)[:\(]\s*(.+?)\s*[\)]?$/);
                if (labelMatch) {
                    menuData.items.push(labelMatch[2]);
                    menuData.labels.push(labelMatch[1]);
                } else {
                    menuData.items.push(option);
                    menuData.labels.push(option);
                }
            });
        }
        
        // Look for list elements that might contain menu options
        $element.find('ul li, ol li').each((index, li) => {
            const text = $(li).text().trim();
            if (text) {
                menuData.items.push(text);
                menuData.labels.push(text);
            }
        });
        
        return menuData;
    }

    /**
     * Helper method to extract text from div using selectors
     * @param {Cheerio} $div - Div element
     * @param {Array} selectors - Array of selectors to try
     * @returns {string} Extracted text or empty string
     */
    extractFromDiv($div, selectors) {
        for (const selector of selectors) {
            const element = $div.find(selector).first();
            if (element.length > 0) {
                return element.text().trim();
            }
        }
        return '';
    }

    /**
     * Extract parameter name from ID attribute
     * @param {string} id - Element ID
     * @returns {string} Parameter name or empty string
     */
    extractParameterNameFromID(id) {
        if (!id) return '';
        
        // Common patterns for parameter IDs
        const patterns = [
            /^param[_-](.+)$/i,
            /^(.+)[_-]param$/i,
            /^p[_-](.+)$/i,
            /^(.+)[_-]p$/i
        ];
        
        for (const pattern of patterns) {
            const match = id.match(pattern);
            if (match) {
                return match[1].replace(/[_-]/g, ' ').trim();
            }
        }
        
        return id;
    }

    /**
     * Check if a table contains parameters
     * @param {string} tableText - Table text content
     * @returns {boolean} True if table contains parameters
     */
    isParameterTable(tableText) {
        const indicators = [
            'parameter', 'param', 'name', 'type', 'default', 'description',
            'value', 'range', 'min', 'max', 'units'
        ];
        
        return indicators.some(indicator => tableText.includes(indicator));
    }

    /**
     * Check if a list contains parameters
     * @param {string} listText - List text content
     * @returns {boolean} True if list contains parameters
     */
    isParameterList(listText) {
        return listText.includes('parameter') || 
               listText.includes('param') || 
               (listText.includes('name') && listText.includes('type'));
    }

    /**
     * Check if a heading indicates a parameter section
     * @param {string} headingText - Heading text
     * @returns {boolean} True if heading indicates parameters
     */
    isParameterHeading(headingText) {
        return /parameters?|params?|settings?|options?|controls?/.test(headingText);
    }

    /**
     * Check if an ID indicates a parameter element
     * @param {string} id - Element ID
     * @returns {boolean} True if ID indicates parameter
     */
    isParameterID(id) {
        if (!id) return false;
        return /param|setting|option|control|value/.test(id.toLowerCase());
    }

    /**
     * Extract table headers and create mapping
     * @param {Cheerio} $table - Table element
     * @returns {Array} Array of header texts
     */
    extractTableHeaders($table) {
        const headers = [];
        $table.find('thead th, thead td, tr:first-child th, tr:first-child td').each((index, cell) => {
            headers.push($(cell).text().trim().toLowerCase());
        });
        return headers;
    }

    /**
     * Map table headers to column indices
     * @param {Array} headers - Array of header texts
     * @returns {Object} Header to index mapping
     */
    mapTableHeaders(headers) {
        const mapping = {};
        
        headers.forEach((header, index) => {
            if (header.includes('name') || header.includes('parameter')) {
                mapping.name = index;
            } else if (header.includes('type')) {
                mapping.type = index;
            } else if (header.includes('default')) {
                mapping.default = index;
            } else if (header.includes('description') || header.includes('desc')) {
                mapping.description = index;
            } else if (header.includes('range') || header.includes('min') || header.includes('max')) {
                mapping.range = index;
            } else if (header.includes('units')) {
                mapping.units = index;
            } else if (header.includes('group') || header.includes('page')) {
                mapping.group = index;
            }
        });
        
        return mapping;
    }

    /**
     * Get clean text from table cell
     * @param {Cheerio} $cell - Table cell element
     * @returns {string} Clean text content
     */
    getCellText($cell) {
        return $cell.text().trim().replace(/\s+/g, ' ');
    }

    /**
     * Remove duplicate parameters based on name and group
     * @param {Array} parameters - Array of parameters
     * @returns {Array} Deduplicated parameters
     */
    deduplicateParameters(parameters) {
        const seen = new Set();
        const unique = [];
        
        for (const param of parameters) {
            const key = `${param.name}_${param.group || 'default'}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(param);
            }
        }
        
        return unique;
    }

    /**
     * Group parameters by page/group and organize hierarchically
     * @param {Object} results - Extraction results to modify
     */
    groupParameters(results) {
        const { parameters } = results;
        
        // Group by page/group
        parameters.forEach(param => {
            const group = param.group || 'General';
            const page = param.page || this.inferParameterPage(param);
            
            if (!results.groups[group]) {
                results.groups[group] = [];
            }
            results.groups[group].push(param);
            
            if (!results.pages[page]) {
                results.pages[page] = {};
            }
            if (!results.pages[page][group]) {
                results.pages[page][group] = [];
            }
            results.pages[page][group].push(param);
            
            // Update parameter with inferred page
            param.page = page;
        });
    }

    /**
     * Infer parameter page based on group and name
     * @param {Parameter} param - Parameter to analyze
     * @returns {string} Inferred page name
     */
    inferParameterPage(param) {
        const paramName = param.name.toLowerCase();
        const paramGroup = (param.group || '').toLowerCase();
        
        // Check against known parameter groups
        for (const [page, groups] of Object.entries(this.parameterGroups)) {
            if (groups.some(group => 
                paramGroup.includes(group.toLowerCase()) || 
                paramName.includes(group.toLowerCase())
            )) {
                return page.charAt(0).toUpperCase() + page.slice(1);
            }
        }
        
        // Default categorization based on parameter name
        if (paramName.includes('transform') || paramName.includes('translate') || 
            paramName.includes('rotate') || paramName.includes('scale')) {
            return 'Transform';
        }
        
        if (paramName.includes('render') || paramName.includes('output') || 
            paramName.includes('resolution')) {
            return 'Render';
        }
        
        if (paramName.includes('material') || paramName.includes('color') || 
            paramName.includes('texture')) {
            return 'Material';
        }
        
        return 'Common';
    }

    /**
     * Extract parameters from a section following a heading
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $heading - Heading element
     * @param {number} index - Heading index
     * @returns {Array} Array of parameters
     */
    extractParametersFromSection($, $heading, index) {
        const parameters = [];
        let current = $heading.next();
        
        // Collect all content until next heading
        while (current.length > 0 && !current.is('h1, h2, h3, h4, h5, h6')) {
            if (current.is('table')) {
                const tableParams = this.extractFromParameterTables($.load(current.prop('outerHTML')));
                parameters.push(...tableParams);
            } else if (current.is('dl')) {
                const listParams = this.extractFromDefinitionLists($.load(current.prop('outerHTML')));
                parameters.push(...listParams);
            } else if (current.is('div')) {
                const divParams = this.extractFromParameterDivs($.load(current.prop('outerHTML')));
                parameters.push(...divParams);
            }
            
            current = current.next();
        }
        
        return parameters;
    }

    /**
     * Extract parameter from element with parameter ID
     * @param {CheerioAPI} $ - Cheerio instance
     * @param {Cheerio} $element - Element with parameter ID
     * @param {number} index - Element index
     * @returns {Parameter} Parameter object
     */
    extractParameterFromIDElement($, $element, index) {
        const id = $element.attr('id');
        const paramData = {
            name: this.extractParameterNameFromID(id),
            sourceElement: 'id',
            rawData: { index, id, tagName: $element.prop('tagName') }
        };
        
        // Try to extract additional information from element content and attributes
        paramData.description = $element.text().trim();
        paramData.type = $element.attr('data-type') || $element.attr('type') || '';
        paramData.defaultValue = $element.attr('data-default') || $element.attr('value') || null;
        paramData.group = $element.attr('data-group') || '';
        
        return new Parameter(paramData);
    }
}

export default ContentExtractor;