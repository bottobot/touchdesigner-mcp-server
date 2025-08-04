# TouchDesigner Wiki Fallback Solution Design

## Overview
This document outlines a fallback solution for POP operator categorization using the TouchDesigner Wiki search function at https://docs.derivative.ca/Special:Categories. This solution would be used if the current whitelist-based approach fails or needs verification against the live wiki.

## Design Goals
1. Query the live TouchDesigner Wiki for accurate, up-to-date operator categorization
2. Minimize false positives by using the official category structure
3. Provide a verification mechanism for the whitelist
4. Cache results to avoid excessive API calls

## Architecture

### 1. Wiki API Integration Module
```javascript
// wikiClient.js
class TouchDesignerWikiClient {
  constructor() {
    this.baseUrl = 'https://docs.derivative.ca/api.php';
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  async getCategoryMembers(category) {
    // Check cache first
    if (this.cache.has(category)) {
      const cached = this.cache.get(category);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    // Make API request
    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: '500',
      format: 'json'
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    const data = await response.json();
    
    // Cache the result
    this.cache.set(category, {
      data: data.query.categorymembers,
      timestamp: Date.now()
    });

    return data.query.categorymembers;
  }

  async searchOperator(operatorName) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: operatorName,
      srnamespace: '0',
      srlimit: '10',
      format: 'json'
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    const data = await response.json();
    return data.query.search;
  }
}
```

### 2. Category Verification Service
```javascript
// categoryVerifier.js
class CategoryVerifier {
  constructor(wikiClient) {
    this.wikiClient = wikiClient;
    this.categoryMap = {
      'POP': 'Particle_Operators',
      'CHOP': 'Channel_Operators',
      'TOP': 'Texture_Operators',
      'SOP': 'Surface_Operators',
      'DAT': 'Data_Operators',
      'MAT': 'Material_Operators',
      'COMP': 'Component_Operators'
    };
  }

  async verifyOperatorCategory(operatorName, expectedCategory) {
    try {
      // Get members of the expected category
      const categoryMembers = await this.wikiClient.getCategoryMembers(
        this.categoryMap[expectedCategory]
      );

      // Check if operator exists in category
      const found = categoryMembers.some(member => 
        member.title.toLowerCase().includes(operatorName.toLowerCase())
      );

      return {
        verified: found,
        category: expectedCategory,
        confidence: found ? 1.0 : 0.0
      };
    } catch (error) {
      console.error(`Failed to verify category: ${error.message}`);
      return {
        verified: false,
        category: expectedCategory,
        confidence: 0.0,
        error: error.message
      };
    }
  }

  async findOperatorCategory(operatorName) {
    const results = [];

    // Search across all categories
    for (const [category, wikiCategory] of Object.entries(this.categoryMap)) {
      const members = await this.wikiClient.getCategoryMembers(wikiCategory);
      const matches = members.filter(member =>
        member.title.toLowerCase().includes(operatorName.toLowerCase())
      );

      if (matches.length > 0) {
        results.push({
          category,
          matches: matches.map(m => m.title),
          confidence: 1.0
        });
      }
    }

    return results;
  }
}
```

### 3. Fallback Integration
```javascript
// Enhanced analyzeOperator method
async analyzeOperatorWithFallback(filepath) {
  // First try local analysis
  const localResult = await this.analyzeOperator(filepath);
  
  // If confidence is low or category is uncertain, use wiki fallback
  if (localResult.confidence < 0.5 || localResult.category === 'UNKNOWN') {
    const verifier = new CategoryVerifier(new TouchDesignerWikiClient());
    
    // Try to find the operator in wiki categories
    const wikiResults = await verifier.findOperatorCategory(localResult.name);
    
    if (wikiResults.length > 0) {
      // Use wiki result if found
      const bestMatch = wikiResults[0];
      localResult.category = bestMatch.category;
      localResult.confidence = bestMatch.confidence;
      localResult.source = 'wiki';
      localResult.reasoning.push('Verified via TouchDesigner Wiki');
    }
  }
  
  return localResult;
}
```

### 4. Whitelist Updater
```javascript
// whitelistUpdater.js
class WhitelistUpdater {
  constructor(wikiClient) {
    this.wikiClient = wikiClient;
  }

  async updatePOPWhitelist() {
    try {
      // Get all POP operators from wiki
      const popMembers = await this.wikiClient.getCategoryMembers('Particle_Operators');
      
      // Extract operator names
      const popOperators = popMembers
        .map(member => member.title)
        .filter(title => !title.startsWith('Category:'))
        .sort();

      // Generate updated whitelist code
      const whitelistCode = `// Auto-generated from TouchDesigner Wiki
// Last updated: ${new Date().toISOString()}

export const POP_OPERATOR_WHITELIST = [
${popOperators.map(op => `  '${op}'`).join(',\n')}
];

export const POP_FALSE_POSITIVE_PATTERNS = [
  /popup/i,
  /popmenu/i,
  /popdialog/i,
  /pophelp/i,
  /pop-up/i,
  /pop_up/i
];

export function isTruePOPOperator(name) {
  return POP_OPERATOR_WHITELIST.includes(name);
}

export function isPOPFalsePositive(name) {
  return POP_FALSE_POSITIVE_PATTERNS.some(pattern => pattern.test(name));
}
`;

      return {
        operators: popOperators,
        count: popOperators.length,
        code: whitelistCode
      };
    } catch (error) {
      console.error('Failed to update whitelist:', error);
      throw error;
    }
  }
}
```

## Implementation Strategy

### Phase 1: Wiki Client Development
1. Implement the TouchDesignerWikiClient class
2. Add proper error handling and rate limiting
3. Implement response caching to minimize API calls
4. Add unit tests for API integration

### Phase 2: Category Verification
1. Implement CategoryVerifier service
2. Map internal categories to wiki category names
3. Add fuzzy matching for operator names
4. Handle edge cases (redirects, disambiguations)

### Phase 3: Integration
1. Add wiki fallback option to main server
2. Make it configurable (enable/disable via environment variable)
3. Add logging for wiki queries
4. Implement performance monitoring

### Phase 4: Whitelist Maintenance
1. Create update script using WhitelistUpdater
2. Add scheduled task to check for updates
3. Generate diff reports for whitelist changes
4. Add manual review process for updates

## Usage Examples

### Manual Category Verification
```javascript
const client = new TouchDesignerWikiClient();
const verifier = new CategoryVerifier(client);

// Verify a specific operator
const result = await verifier.verifyOperatorCategory('Particle SOP', 'POP');
console.log(result); // { verified: true, category: 'POP', confidence: 1.0 }
```

### Automatic Fallback
```javascript
// In main server, when confidence is low
if (operatorInfo.confidence < 0.5) {
  const wikiResult = await verifier.findOperatorCategory(operatorInfo.name);
  if (wikiResult.length > 0) {
    operatorInfo.category = wikiResult[0].category;
    operatorInfo.confidence = 1.0;
    operatorInfo.verifiedByWiki = true;
  }
}
```

### Whitelist Update
```javascript
const updater = new WhitelistUpdater(new TouchDesignerWikiClient());
const update = await updater.updatePOPWhitelist();
console.log(`Found ${update.count} POP operators in wiki`);
// Review and apply update
```

## Benefits
1. **Accuracy**: Direct verification against official documentation
2. **Freshness**: Always up-to-date with latest TouchDesigner releases
3. **Flexibility**: Can verify any operator, not just whitelisted ones
4. **Transparency**: Clear source of truth for categorization

## Limitations
1. **Network Dependency**: Requires internet connection
2. **API Rate Limits**: Wiki may have rate limiting
3. **Performance**: Network calls are slower than local lookup
4. **Availability**: Wiki must be accessible and API enabled

## Conclusion
This fallback solution provides a robust way to verify operator categorization against the official TouchDesigner Wiki. While the current whitelist approach is efficient and accurate, this wiki-based solution offers a way to:
- Verify uncertain categorizations
- Keep the whitelist up-to-date
- Handle new operators not yet in the whitelist
- Provide transparency in categorization decisions

The solution is designed to complement, not replace, the current whitelist-based approach, providing additional confidence and accuracy when needed.