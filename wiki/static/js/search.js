/**
 * TouchDesigner Documentation Wiki - Advanced Search JavaScript
 * Handles real-time search, filtering, and search result interactions
 */

(function() {
    'use strict';

    // Search application object
    window.SearchApp = {
        // Configuration
        config: {
            apiBaseUrl: '/api',
            searchDelay: 300,
            maxSuggestions: 10,
            resultsPerPage: 20
        },

        // State
        state: {
            currentQuery: '',
            currentCategory: '',
            currentFilters: {},
            searchTimeout: null,
            isSearching: false,
            searchHistory: [],
            recentSearches: []
        },

        // Initialize search functionality
        init: function() {
            console.log('[SearchApp] Initializing advanced search...');
            
            this.loadSearchHistory();
            this.initializeAdvancedSearch();
            this.initializeResultsHandling();
            this.initializeSearchFilters();
            this.initializeSearchHistory();
            
            console.log('[SearchApp] Advanced search initialized');
        },

        // Advanced search form handling
        initializeAdvancedSearch: function() {
            const searchForm = document.querySelector('.advanced-search-form');
            const searchInput = document.querySelector('.search-input-main');
            const categorySelect = document.querySelector('.category-select');
            
            if (!searchForm || !searchInput) return;

            // Real-time search as user types
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.state.searchTimeout);
                const query = e.target.value.trim();
                
                this.state.currentQuery = query;
                
                if (query.length >= 2) {
                    this.state.searchTimeout = setTimeout(() => {
                        this.performLiveSearch(query);
                    }, this.config.searchDelay);
                } else {
                    this.clearSearchSuggestions();
                }
            });

            // Category change handling
            if (categorySelect) {
                categorySelect.addEventListener('change', (e) => {
                    this.state.currentCategory = e.target.value;
                    if (this.state.currentQuery) {
                        this.performLiveSearch(this.state.currentQuery);
                    }
                });
            }

            // Form submission
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });

            // Search options handling
            const searchOptions = document.querySelectorAll('.search-options input[type="checkbox"]');
            searchOptions.forEach(option => {
                option.addEventListener('change', () => {
                    this.updateSearchFilters();
                    if (this.state.currentQuery) {
                        this.performLiveSearch(this.state.currentQuery);
                    }
                });
            });

            // Initialize with current URL parameters
            this.initializeFromURL();
        },

        // Initialize from URL parameters
        initializeFromURL: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('q') || '';
            const category = urlParams.get('category') || '';
            
            if (query) {
                this.state.currentQuery = query;
                const searchInput = document.querySelector('.search-input-main');
                if (searchInput) {
                    searchInput.value = query;
                }
            }
            
            if (category) {
                this.state.currentCategory = category;
                const categorySelect = document.querySelector('.category-select');
                if (categorySelect) {
                    categorySelect.value = category;
                }
            }
        },

        // Perform live search with suggestions
        performLiveSearch: async function(query) {
            if (this.state.isSearching) return;
            
            this.state.isSearching = true;
            this.showSearchLoading();
            
            try {
                const searchParams = new URLSearchParams({
                    q: query,
                    limit: this.config.maxSuggestions
                });
                
                if (this.state.currentCategory) {
                    searchParams.set('category', this.state.currentCategory);
                }
                
                const response = await fetch(`${this.config.apiBaseUrl}/search?${searchParams}`);
                const data = await response.json();
                
                this.displaySearchSuggestions(data.results || []);
                
            } catch (error) {
                console.error('[SearchApp] Live search error:', error);
                this.clearSearchSuggestions();
            } finally {
                this.state.isSearching = false;
                this.hideSearchLoading();
            }
        },

        // Perform full search
        performSearch: async function(updateURL = true) {
            const query = this.state.currentQuery.trim();
            if (!query) return;
            
            // Add to search history
            this.addToSearchHistory(query);
            
            // Update URL if needed
            if (updateURL) {
                const searchParams = new URLSearchParams();
                searchParams.set('q', query);
                if (this.state.currentCategory) {
                    searchParams.set('category', this.state.currentCategory);
                }
                
                const newURL = `${window.location.pathname}?${searchParams}`;
                history.pushState({ query, category: this.state.currentCategory }, '', newURL);
            }
            
            // Clear suggestions
            this.clearSearchSuggestions();
            
            // Show loading state
            this.showSearchLoading();
            
            try {
                const searchParams = new URLSearchParams({
                    q: query,
                    limit: this.config.resultsPerPage
                });
                
                if (this.state.currentCategory) {
                    searchParams.set('category', this.state.currentCategory);
                }
                
                // Add filter options
                Object.keys(this.state.currentFilters).forEach(key => {
                    if (this.state.currentFilters[key]) {
                        searchParams.set(key, 'true');
                    }
                });
                
                const response = await fetch(`${this.config.apiBaseUrl}/search?${searchParams}`);
                const data = await response.json();
                
                this.displaySearchResults(data);
                
            } catch (error) {
                console.error('[SearchApp] Search error:', error);
                this.displaySearchError(error);
            } finally {
                this.hideSearchLoading();
            }
        },

        // Display search suggestions
        displaySearchSuggestions: function(suggestions) {
            const searchInput = document.querySelector('.search-input-main');
            if (!searchInput) return;
            
            // Remove existing suggestions
            this.clearSearchSuggestions();
            
            if (suggestions.length === 0) return;
            
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'search-suggestions show';
            suggestionsContainer.id = 'search-suggestions';
            
            suggestions.forEach((suggestion, index) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.dataset.index = index;
                
                // Highlight matching text
                const highlightedName = this.highlightText(suggestion.name, this.state.currentQuery);
                
                item.innerHTML = `
                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zM4 19h16v2H4z"/>
                        </svg>
                    </div>
                    <div class="suggestion-content">
                        <div class="suggestion-name">${highlightedName}</div>
                        <div class="suggestion-category">${suggestion.category || ''}</div>
                        ${suggestion.description ? `<div class="suggestion-description">${this.truncateText(suggestion.description, 80)}</div>` : ''}
                    </div>
                    <div class="suggestion-score">
                        ${suggestion.score ? Math.round(suggestion.score) + '%' : ''}
                    </div>
                `;
                
                // Click handler
                item.addEventListener('click', () => {
                    window.location.href = `/operator/${encodeURIComponent(suggestion.name)}`;
                });
                
                // Keyboard navigation
                item.addEventListener('mouseenter', () => {
                    this.highlightSuggestion(index);
                });
                
                suggestionsContainer.appendChild(item);
            });
            
            // Position relative to search input
            const inputContainer = searchInput.closest('.input-container');
            if (inputContainer) {
                inputContainer.style.position = 'relative';
                inputContainer.appendChild(suggestionsContainer);
            }
            
            // Handle keyboard navigation
            this.setupSuggestionNavigation(searchInput, suggestionsContainer);
        },

        // Setup keyboard navigation for suggestions
        setupSuggestionNavigation: function(searchInput, suggestionsContainer) {
            let currentIndex = -1;
            
            searchInput.addEventListener('keydown', (e) => {
                const items = suggestionsContainer.querySelectorAll('.suggestion-item');
                
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        currentIndex = (currentIndex + 1) % items.length;
                        this.highlightSuggestion(currentIndex);
                        break;
                        
                    case 'ArrowUp':
                        e.preventDefault();
                        currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                        this.highlightSuggestion(currentIndex);
                        break;
                        
                    case 'Enter':
                        if (currentIndex >= 0 && items[currentIndex]) {
                            e.preventDefault();
                            items[currentIndex].click();
                        }
                        break;
                        
                    case 'Escape':
                        this.clearSearchSuggestions();
                        break;
                }
            });
        },

        // Highlight suggestion item
        highlightSuggestion: function(index) {
            const suggestions = document.querySelectorAll('.suggestion-item');
            suggestions.forEach((item, i) => {
                item.classList.toggle('highlighted', i === index);
            });
        },

        // Clear search suggestions
        clearSearchSuggestions: function() {
            const existing = document.getElementById('search-suggestions');
            if (existing) {
                existing.remove();
            }
        },

        // Update search filters
        updateSearchFilters: function() {
            const checkboxes = document.querySelectorAll('.search-options input[type="checkbox"]');
            this.state.currentFilters = {};
            
            checkboxes.forEach(checkbox => {
                this.state.currentFilters[checkbox.name] = checkbox.checked;
            });
        },

        // Results handling
        initializeResultsHandling: function() {
            // Sort dropdown handling
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortResults(e.target.value);
                });
            }
            
            // Result interaction tracking
            document.addEventListener('click', (e) => {
                const resultLink = e.target.closest('.result-link');
                if (resultLink) {
                    this.trackResultClick(resultLink.textContent, this.state.currentQuery);
                }
            });
        },

        // Sort search results
        sortResults: function(sortBy) {
            const resultsList = document.querySelector('.results-list');
            if (!resultsList) return;
            
            const results = Array.from(resultsList.children);
            
            results.sort((a, b) => {
                switch (sortBy) {
                    case 'name':
                        const nameA = a.querySelector('.result-link').textContent;
                        const nameB = b.querySelector('.result-link').textContent;
                        return nameA.localeCompare(nameB);
                        
                    case 'category':
                        const catA = a.querySelector('.category-badge').textContent;
                        const catB = b.querySelector('.category-badge').textContent;
                        return catA.localeCompare(catB);
                        
                    case 'relevance':
                    default:
                        // Default order (relevance) - no sorting needed
                        return 0;
                }
            });
            
            // Re-append sorted results
            results.forEach(result => resultsList.appendChild(result));
        },

        // Search history management
        initializeSearchHistory: function() {
            this.loadSearchHistory();
            
            // Handle browser back/forward
            window.addEventListener('popstate', (e) => {
                if (e.state) {
                    this.state.currentQuery = e.state.query || '';
                    this.state.currentCategory = e.state.category || '';
                    this.initializeFromURL();
                }
            });
        },

        addToSearchHistory: function(query) {
            if (!query || this.state.searchHistory.includes(query)) return;
            
            this.state.searchHistory.unshift(query);
            this.state.searchHistory = this.state.searchHistory.slice(0, 10); // Keep last 10
            
            this.saveSearchHistory();
        },

        loadSearchHistory: function() {
            try {
                const stored = localStorage.getItem('td-wiki-search-history');
                if (stored) {
                    this.state.searchHistory = JSON.parse(stored);
                }
            } catch (error) {
                console.error('[SearchApp] Error loading search history:', error);
                this.state.searchHistory = [];
            }
        },

        saveSearchHistory: function() {
            try {
                localStorage.setItem('td-wiki-search-history', JSON.stringify(this.state.searchHistory));
            } catch (error) {
                console.error('[SearchApp] Error saving search history:', error);
            }
        },

        // Track result clicks for analytics
        trackResultClick: function(operatorName, query) {
            // Could be extended to send analytics data
            console.log(`[SearchApp] Result clicked: ${operatorName} for query: ${query}`);
        },

        // Loading states
        showSearchLoading: function() {
            const loadingIndicator = document.getElementById('search-loading') || this.createLoadingIndicator();
            loadingIndicator.style.display = 'block';
        },

        hideSearchLoading: function() {
            const loadingIndicator = document.getElementById('search-loading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        },

        createLoadingIndicator: function() {
            const indicator = document.createElement('div');
            indicator.id = 'search-loading';
            indicator.className = 'search-loading';
            indicator.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Searching...</span>
            `;
            indicator.style.display = 'none';
            
            const searchForm = document.querySelector('.search-form-section');
            if (searchForm) {
                searchForm.appendChild(indicator);
            }
            
            return indicator;
        },

        // Utility functions
        highlightText: function(text, query) {
            if (!query || !text) return this.escapeHtml(text);
            
            const escapedText = this.escapeHtml(text);
            const escapedQuery = this.escapeHtml(query);
            const regex = new RegExp(`(${escapedQuery})`, 'gi');
            
            return escapedText.replace(regex, '<mark>$1</mark>');
        },

        truncateText: function(text, maxLength) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        escapeHtml: function(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, function(m) { return map[m]; });
        },

        // Display search results (for dynamic loading)
        displaySearchResults: function(data) {
            // This would be used if we implement dynamic result loading
            console.log('[SearchApp] Search results:', data);
        },

        // Display search error
        displaySearchError: function(error) {
            console.error('[SearchApp] Search error:', error);
            // Could implement user-friendly error display
        }
    };

    // Auto-initialize if we're on a search page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector('.search-page, .advanced-search-form')) {
                window.SearchApp.init();
            }
        });
    } else {
        if (document.querySelector('.search-page, .advanced-search-form')) {
            window.SearchApp.init();
        }
    }

})();