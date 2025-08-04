/**
 * Dynamic operator detail scraper for TouchDesigner documentation
 */

import * as cheerio from 'cheerio';

/**
 * Scrape detailed information for a specific operator from TouchDesigner wiki
 */
export async function scrapeOperatorDetails(operatorName, category) {
  const urlName = operatorName.replace(/ /g, '_');
  let url = `https://docs.derivative.ca/${urlName}_${category}`;
  
  try {
    console.log(`[Scraper] Fetching details from: ${url}`);
    let response = await fetch(url);
    
    if (!response.ok) {
      console.log(`[Scraper] Failed to fetch ${url}: ${response.status}`);
      // Try with Experimental: prefix
      const experimentalUrl = `https://docs.derivative.ca/Experimental:${urlName}_${category}`;
      console.log(`[Scraper] Trying experimental URL: ${experimentalUrl}`);
      response = await fetch(experimentalUrl);
      
      if (!response.ok) {
        return null;
      }
      url = experimentalUrl;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract the main content
    const content = $('#mw-content-text');
    
    // Check if this is a redirect page
    const redirectText = content.text();
    
    // Check for redirect - TouchDesigner wiki uses "REDIRECT" text
    if (redirectText.includes('REDIRECT')) {
      // Find the redirect link
      const redirectLink = content.find('a').filter((i, el) => {
        const href = $(el).attr('href');
        const title = $(el).attr('title');
        return href && (href.includes('Experimental:') || title?.includes('Experimental:'));
      }).first();
      
      if (redirectLink.length) {
        const redirectUrl = `https://docs.derivative.ca${redirectLink.attr('href')}`;
        console.log(`[Scraper] Following redirect to: ${redirectUrl}`);
        
        const redirectResponse = await fetch(redirectUrl);
        if (redirectResponse.ok) {
          const redirectHtml = await redirectResponse.text();
          const $redirect = cheerio.load(redirectHtml);
          // Update content to use the redirected page
          content.html($redirect('#mw-content-text').html());
          url = redirectUrl;
        }
      }
    }
    
    // Get the summary (first paragraph)
    const summary = content.find('p').first().text().trim() ||
                   `The ${operatorName} ${category} operator provides functionality for...`;
    
    // Get the full description (multiple paragraphs)
    const descriptionParagraphs = [];
    content.find('p').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && !text.startsWith('See also') && i < 5) {
        descriptionParagraphs.push(text);
      }
    });
    const description = descriptionParagraphs.join('\n\n') || summary;
    
    // Extract parameters from the Parameters section
    const parameters = [];
    
    // Try different parameter section formats
    // Format 1: Parameters as a heading with a table
    const paramTable = content.find('h2:contains("Parameters")').nextUntil('h2').filter('table').first();
    if (paramTable.length) {
      paramTable.find('tr').each((i, elem) => {
        if (i === 0) return; // Skip header row
        const cells = $(elem).find('td');
        if (cells.length >= 2) {
          const name = cells.eq(0).text().trim();
          const desc = cells.eq(1).text().trim();
          if (name) {
            parameters.push({
              name: name,
              description: desc || 'Parameter description'
            });
          }
        }
      });
    }
    
    // Format 2: Parameters as definition list
    if (parameters.length === 0) {
      const paramDL = content.find('h2:contains("Parameters")').nextUntil('h2').filter('dl').first();
      if (paramDL.length) {
        paramDL.find('dt').each((i, elem) => {
          const name = $(elem).text().trim();
          const desc = $(elem).next('dd').text().trim();
          if (name) {
            parameters.push({
              name: name,
              description: desc || 'Parameter description'
            });
          }
        });
      }
    }
    
    // Format 3: Parameters as bullet list
    if (parameters.length === 0) {
      const paramList = content.find('h2:contains("Parameters")').nextUntil('h2').filter('ul').first();
      if (paramList.length) {
        paramList.find('li').each((i, elem) => {
          const paramText = $(elem).text().trim();
          const [name, ...descParts] = paramText.split(' - ');
          if (name) {
            parameters.push({
              name: name.trim(),
              description: descParts.join(' - ').trim() || 'Parameter description'
            });
          }
        });
      }
    }
    
    // Extract inputs
    const inputs = [];
    const inputSection = content.find('h2:contains("Inputs")').next('ul');
    if (inputSection.length) {
      inputSection.find('li').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          inputs.push(text);
        }
      });
    }
    
    // Extract outputs
    const outputs = [];
    const outputSection = content.find('h2:contains("Outputs")').next('ul');
    if (outputSection.length) {
      outputSection.find('li').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          outputs.push(text);
        }
      });
    }
    
    // Extract related operators
    const related = [];
    const relatedSection = content.find('h2:contains("See Also")').next('ul');
    if (relatedSection.length) {
      relatedSection.find('li a').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.includes(' ')) {
          related.push(text);
        }
      });
    }
    
    // Extract attributes from tables (common in POP operators)
    const attributes = [];
    content.find('table').each((i, table) => {
      const $table = $(table);
      const headers = $table.find('th').map((i, el) => $(el).text().trim()).get();
      
      // Check if this looks like an attributes table
      if (headers.includes('Attribute Name') || headers.includes('Name')) {
        $table.find('tr').each((rowIndex, row) => {
          if (rowIndex === 0) return; // Skip header
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            const name = cells.eq(0).text().trim();
            const type = cells.eq(1).text().trim();
            const desc = cells.eq(2).text().trim() || '';
            if (name) {
              attributes.push({
                name: name,
                type: type,
                description: desc
              });
            }
          }
        });
      }
    });
    
    return {
      summary,
      description,
      parameters,
      attributes,
      inputs,
      outputs,
      related,
      wiki_url: url
    };
    
  } catch (error) {
    console.error(`[Scraper] Error scraping ${url}:`, error.message);
    return null;
  }
}

/**
 * Get cached or fresh operator details
 */
const detailsCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour

export async function getOperatorDetails(operatorName, category) {
  const cacheKey = `${operatorName}_${category}`;
  const cached = detailsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[Scraper] Using cached details for ${cacheKey}`);
    return cached.data;
  }
  
  const details = await scrapeOperatorDetails(operatorName, category);
  if (details) {
    detailsCache.set(cacheKey, {
      data: details,
      timestamp: Date.now()
    });
  }
  
  return details;
}