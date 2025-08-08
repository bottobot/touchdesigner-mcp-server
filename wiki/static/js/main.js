/**
 * TouchDesigner Documentation Wiki - Main JavaScript
 * Handles navigation, UI interactions, and core functionality
 */

(function() {
    'use strict';

    // Global wiki application object
    window.WikiApp = {
        // Configuration
        config: {
            apiBaseUrl: '/api',
            searchDelay: 300,
            maxSuggestions: 8
        },

        // State
        state: {
            isInitialized: false,
            mobileMenuOpen: false,
            currentSearch: null,
            searchSuggestions: []
        },

        // Initialize the application
        init: function() {
            if (this.state.isInitialized) return;

            console.log('[WikiApp] Initializing...');
            
            this.initializeNavigation();
            this.initializeSearch();
            this.initializeMobileMenu();
            this.initializeStatsLoader();
            this.initializeUtilities();
            
            this.state.isInitialized = true;
            console.log('[WikiApp] Initialized successfully');
        },

        // Navigation functionality
        initializeNavigation: function() {
            // Dropdown menus
            this.initializeDropdowns();
            
            // Active link highlighting
            this.highlightActiveLinks();
            
            // Smooth scrolling for anchor links
            this.initializeSmoothScrolling();
        },

        initializeDropdowns: function() {
            const dropdowns = document.querySelectorAll('.nav-dropdown');
            
            dropdowns.forEach(dropdown => {
                const trigger = dropdown.querySelector('.dropdown-trigger');
                const menu = dropdown.querySelector('.dropdown-menu');
                
                if (!trigger || !menu) return;

                // Show/hide on hover
                dropdown.addEventListener('mouseenter', () => {
                    menu.style.opacity = '1';
                    menu.style.visibility = 'visible';
                    menu.style.transform = 'translateY(0)';
                });

                dropdown.addEventListener('mouseleave', () => {
                    menu.style.opacity = '0';
                    menu.style.visibility = 'hidden';
                    menu.style.transform = 'translateY(-10px)';
                });

                // Keyboard navigation
                trigger.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const isVisible = menu.style.visibility === 'visible';
                        menu.style.visibility = isVisible ? 'hidden' : 'visible';
                        menu.style.opacity = isVisible ? '0' : '1';
                        menu.style.transform = isVisible ? 'translateY(-10px)' : 'translateY(0)';
                    }
                });
            });
        },

        highlightActiveLinks: function() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('.nav-link, .dropdown-item');
            
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && (currentPath === href || currentPath.startsWith(href + '/'))) {
                    link.classList.add('active');
                }
            });
        },

        initializeSmoothScrolling: function() {
            const anchorLinks = document.querySelectorAll('a[href^="#"]');
            
            anchorLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    const targetId = link.getAttribute('href').substring(1);
                    const target = document.getElementById(targetId);
                    
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        },

        // Search functionality
        initializeSearch: function() {
            const searchInputs = document.querySelectorAll('.search-input, .hero-search-input, .category-search-input');
            
            searchInputs.forEach(input => {
                // Real-time search suggestions
                let searchTimeout;
                
                input.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    const query = e.target.value.trim();
                    
                    if (query.length < 2) {
                        this.hideSuggestions(input);
                        return;
                    }
                    
                    searchTimeout = setTimeout(() => {
                        this.fetchSuggestions(query, input);
                    }, this.config.searchDelay);
                });

                // Handle keyboard navigation in suggestions
                input.addEventListener('keydown', (e) => {
                    this.handleSuggestionNavigation(e, input);
                });

                // Hide suggestions when clicking outside
                document.addEventListener('click', (e) => {
                    if (!input.contains(e.target)) {
                        this.hideSuggestions(input);
                    }
                });
            });

            // Search form submissions
            const searchForms = document.querySelectorAll('.search-form, .hero-search-form, .category-search-form');
            searchForms.forEach(form => {
                form.addEventListener('submit', (e) => {
                    const input = form.querySelector('input[name="q"]');
                    if (input && !input.value.trim()) {
                        e.preventDefault();
                        input.focus();
                    }
                });
            });
        },

        fetchSuggestions: async function(query, inputElement) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/search?q=${encodeURIComponent(query)}&limit=${this.config.maxSuggestions}`);
                const data = await response.json();
                
                if (data.results && data.results.length > 0) {
                    this.showSuggestions(data.results, inputElement);
                } else {
                    this.hideSuggestions(inputElement);
                }
            } catch (error) {
                console.error('[WikiApp] Error fetching suggestions:', error);
                this.hideSuggestions(inputElement);
            }
        },

        showSuggestions: function(suggestions, inputElement) {
            // Remove existing suggestions
            this.hideSuggestions(inputElement);
            
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'search-suggestions show';
            
            suggestions.forEach((suggestion, index) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.dataset.index = index;
                
                item.innerHTML = `
                    <div class="suggestion-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                    </div>
                    <div class="suggestion-content">
                        <div class="suggestion-name">${this.escapeHtml(suggestion.name)}</div>
                        <div class="suggestion-category">${suggestion.category || ''}</div>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    window.location.href = `/operator/${encodeURIComponent(suggestion.name)}`;
                });
                
                suggestionsContainer.appendChild(item);
            });
            
            // Position the suggestions container
            const inputContainer = inputElement.closest('.search-input-container, .search-container');
            if (inputContainer) {
                inputContainer.style.position = 'relative';
                inputContainer.appendChild(suggestionsContainer);
            }
        },

        hideSuggestions: function(inputElement) {
            const inputContainer = inputElement.closest('.search-input-container, .search-container');
            if (inputContainer) {
                const existing = inputContainer.querySelector('.search-suggestions');
                if (existing) {
                    existing.remove();
                }
            }
        },

        handleSuggestionNavigation: function(e, inputElement) {
            const suggestionsContainer = inputElement.closest('.search-input-container, .search-container')?.querySelector('.search-suggestions');
            if (!suggestionsContainer) return;
            
            const items = suggestionsContainer.querySelectorAll('.suggestion-item');
            const currentHighlighted = suggestionsContainer.querySelector('.suggestion-item.highlighted');
            let newIndex = -1;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentHighlighted) {
                    newIndex = parseInt(currentHighlighted.dataset.index) + 1;
                    if (newIndex >= items.length) newIndex = 0;
                } else {
                    newIndex = 0;
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentHighlighted) {
                    newIndex = parseInt(currentHighlighted.dataset.index) - 1;
                    if (newIndex < 0) newIndex = items.length - 1;
                } else {
                    newIndex = items.length - 1;
                }
            } else if (e.key === 'Enter' && currentHighlighted) {
                e.preventDefault();
                currentHighlighted.click();
                return;
            } else if (e.key === 'Escape') {
                this.hideSuggestions(inputElement);
                return;
            }
            
            // Update highlighting
            items.forEach(item => item.classList.remove('highlighted'));
            if (newIndex >= 0 && items[newIndex]) {
                items[newIndex].classList.add('highlighted');
            }
        },

        // Mobile menu functionality
        initializeMobileMenu: function() {
            const menuToggle = document.querySelector('.mobile-menu-toggle');
            const mobileNav = document.querySelector('.mobile-nav');
            
            if (menuToggle && mobileNav) {
                menuToggle.addEventListener('click', () => {
                    this.state.mobileMenuOpen = !this.state.mobileMenuOpen;
                    
                    if (this.state.mobileMenuOpen) {
                        mobileNav.style.display = 'block';
                        menuToggle.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    } else {
                        mobileNav.style.display = 'none';
                        menuToggle.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                });
                
                // Close mobile menu when clicking on links
                const mobileLinks = mobileNav.querySelectorAll('.mobile-nav-link');
                mobileLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        this.state.mobileMenuOpen = false;
                        mobileNav.style.display = 'none';
                        menuToggle.classList.remove('active');
                        document.body.style.overflow = '';
                    });
                });
                
                // Close mobile menu on window resize
                window.addEventListener('resize', () => {
                    if (window.innerWidth > 768 && this.state.mobileMenuOpen) {
                        this.state.mobileMenuOpen = false;
                        mobileNav.style.display = 'none';
                        menuToggle.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                });
            }
        },

        // Stats loader for footer
        initializeStatsLoader: function() {
            const statsContainer = document.getElementById('wiki-stats');
            if (statsContainer) {
                this.loadWikiStats(statsContainer);
            }
        },

        loadWikiStats: async function(container) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/stats`);
                const stats = await response.json();
                
                container.innerHTML = `
                    <div class="stats-item">
                        <span class="stats-number">${stats.totalEntries || 0}</span>
                        <span class="stats-label">operators</span>
                    </div>
                    <div class="stats-item">
                        <span class="stats-number">${stats.totalParameters || 0}</span>
                        <span class="stats-label">parameters</span>
                    </div>
                `;
            } catch (error) {
                console.error('[WikiApp] Error loading stats:', error);
                container.innerHTML = '<span class="stats-error">Stats unavailable</span>';
            }
        },

        // Utility functions
        initializeUtilities: function() {
            // Lazy loading for images
            this.initializeLazyLoading();
            
            // Copy to clipboard functionality
            this.initializeCopyButtons();
            
            // Scroll to top button
            this.initializeScrollToTop();
            
            // Print functionality
            this.initializePrintHandlers();
        },

        initializeLazyLoading: function() {
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.classList.remove('lazy');
                            observer.unobserve(img);
                        }
                    });
                });

                document.querySelectorAll('img[data-src]').forEach(img => {
                    imageObserver.observe(img);
                });
            }
        },

        initializeCopyButtons: function() {
            const codeBlocks = document.querySelectorAll('pre code');
            
            codeBlocks.forEach(block => {
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-code-btn';
                copyBtn.textContent = 'Copy';
                copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
                
                copyBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(block.textContent);
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy';
                        }, 2000);
                    } catch (error) {
                        console.error('[WikiApp] Error copying code:', error);
                        copyBtn.textContent = 'Error';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy';
                        }, 2000);
                    }
                });
                
                const pre = block.parentElement;
                pre.style.position = 'relative';
                pre.appendChild(copyBtn);
            });
        },

        initializeScrollToTop: function() {
            const scrollBtn = document.createElement('button');
            scrollBtn.className = 'scroll-to-top';
            scrollBtn.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                </svg>
            `;
            scrollBtn.setAttribute('aria-label', 'Scroll to top');
            
            document.body.appendChild(scrollBtn);
            
            // Show/hide based on scroll position
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    scrollBtn.classList.add('show');
                } else {
                    scrollBtn.classList.remove('show');
                }
            });
            
            scrollBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        },

        initializePrintHandlers: function() {
            // Add print styles when printing
            window.addEventListener('beforeprint', () => {
                document.body.classList.add('printing');
            });
            
            window.addEventListener('afterprint', () => {
                document.body.classList.remove('printing');
            });
        },

        // Utility functions
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

        debounce: function(func, wait, immediate) {
            let timeout;
            return function executedFunction() {
                const context = this;
                const args = arguments;
                const later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        },

        throttle: function(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.WikiApp.init();
        });
    } else {
        window.WikiApp.init();
    }

})();