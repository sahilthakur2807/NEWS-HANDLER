(function(window, document) {
    if (!window.newsManager || !window.newsManager.fetchNews) {
        throw new Error('newsManager.fetchNews is not available.');
    }

    var fetchNews = window.newsManager.fetchNews;
    var pageSize = 12;
    var maxPages = 20;
    var favoritesKey = 'newsFavorites';
    var favoritesApiUrl = '/api/favorites';
    var fallbackImageUrl = '/assets/abstract-globe-background.webp';

    var state = {
        category: 'science',
        isLoading: false,
        favorites: [],
        favoritesLoaded: false
    };

    var gallery = document.getElementById('bento-gallery');
    var dateInput = document.getElementById('news-date');
    var searchInput = document.getElementById('news-search');
    var searchBtn = document.getElementById('search-news');
    var loadNewBtn = document.getElementById('load-new-news');
    var loadFavoritesBtn = document.getElementById('load-favorites');
    var navLinks = document.querySelectorAll('.nav-items a[data-category]');
    var favoritesList = document.getElementById('favorites-list');

    function setLoading(isLoading) {
        state.isLoading = isLoading;
        if (loadNewBtn) {
            loadNewBtn.disabled = isLoading;
            loadNewBtn.textContent = isLoading ? 'Loading...' : 'Load News';
        }
        if (searchBtn) {
            searchBtn.disabled = isLoading;
            searchBtn.textContent = isLoading ? 'Searching...' : 'Search';
        }
    }

    function clearGallery() {
        if (gallery) {
            gallery.innerHTML = '';
        }
    }

    function getLocalFavorites() {
        try {
            var raw = window.localStorage.getItem(favoritesKey);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            return [];
        }
    }

    function saveLocalFavorites(items) {
        window.localStorage.setItem(favoritesKey, JSON.stringify(items));
    }

    function clearLocalFavorites() {
        window.localStorage.removeItem(favoritesKey);
    }

    function setFavorites(items) {
        state.favorites = Array.isArray(items) ? items : [];
        state.favoritesLoaded = true;
    }

    function getFavorites() {
        return state.favoritesLoaded ? state.favorites : getLocalFavorites();
    }

    function fetchFavoritesFromApi() {
        return fetch(favoritesApiUrl).then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to load favorites from API');
            }
            return response.json();
        });
    }

    function saveFavoriteToApi(item) {
        return fetch(favoritesApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        }).then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to save favorite to API');
            }
            return response.json();
        });
    }

    function deleteFavoriteFromApi(url) {
        return fetch(favoritesApiUrl, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        }).then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to delete favorite from API');
            }
            return response.json();
        });
    }

    function loadFavorites() {
        return fetchFavoritesFromApi()
            .then(function(items) {
                setFavorites(items);
                clearLocalFavorites();
            })
            .catch(function() {
                setFavorites(getLocalFavorites());
            });
    }

    function isFavorite(url) {
        if (!url) return false;
        return getFavorites().some(function(item) {
            return item.url === url;
        });
    }

    function addFavorite(article) {
        if (!article || !article.url) return Promise.resolve();

        var items = getFavorites();
        if (items.some(function(item) {
            return item.url === article.url;
        })) {
            return Promise.resolve();
        }

        var item = {
            title: article.title || 'Untitled',
            url: article.url,
            source: article.source && article.source.name ? article.source.name : 'Unknown source'
        };

        return saveFavoriteToApi(item)
            .then(function() {
                items.unshift(item);
                setFavorites(items);
                clearLocalFavorites();
            })
            .catch(function() {
                items.unshift(item);
                setFavorites(items);
                saveLocalFavorites(items);
            });
    }

    function removeFavorite(url) {
        if (!url) return Promise.resolve();

        var items = getFavorites().filter(function(item) {
            return item.url !== url;
        });

        return deleteFavoriteFromApi(url)
            .then(function() {
                setFavorites(items);
                clearLocalFavorites();
            })
            .catch(function() {
                setFavorites(items);
                saveLocalFavorites(items);
            });
    }

    function renderFavoritesList() {
        if (!favoritesList) return;

        favoritesList.innerHTML = '';
        var items = getFavorites();

        if (!items.length) {
            var empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No favorites saved yet.';
            favoritesList.appendChild(empty);
            return;
        }

        items.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'favorite-card';

            var content = document.createElement('div');
            content.className = 'favorite-card-content';

            var link = document.createElement('a');
            link.href = item.url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = item.title;

            var meta = document.createElement('p');
            meta.textContent = item.source;

            content.appendChild(link);
            content.appendChild(meta);

            var actions = document.createElement('div');
            actions.className = 'favorite-card-actions';

            var removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'delete-favorite-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', function() {
                removeFavorite(item.url).then(function() {
                    renderFavoritesList();
                });
            });

            actions.appendChild(removeBtn);
            card.appendChild(content);
            card.appendChild(actions);
            favoritesList.appendChild(card);
        });
    }

    function renderEmpty(message) {
        if (!gallery) return;

        clearGallery();
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = message;
        gallery.appendChild(empty);
    }

    function getTileClass(index) {
        var mod = index % 6;
        if (mod === 0) return 'tile--large';
        if (mod === 3) return 'tile--small';
        return 'tile--medium';
    }

    function formatMeta(article) {
        var source = article.source && article.source.name ? article.source.name : 'Unknown source';
        var dateText = '';
        if (article.publishedAt) {
            var date = new Date(article.publishedAt);
            if (!isNaN(date.getTime())) {
                dateText = ' - ' + date.toLocaleDateString();
            }
        }
        return source + dateText;
    }

    function renderArticles(articles, append) {
        if (!gallery) return;
        if (!append) {
            clearGallery();
        }

        var offset = gallery.children.length;
        articles.forEach(function(article, index) {
            var tile = document.createElement('article');
            tile.className = 'bento-tile ' + getTileClass(offset + index);

            var link = document.createElement('a');
            link.className = 'bento-tile-link';
            link.href = article.url || '#';
            link.target = '_blank';
            link.rel = 'noopener';

            var img = document.createElement('img');
            img.src = article.urlToImage || fallbackImageUrl;
            img.alt = article.title || 'News image';
            img.onerror = function() {
                img.onerror = null;
                img.src = fallbackImageUrl;
            };
            link.appendChild(img);

            var caption = document.createElement('div');
            caption.className = 'tile-caption';
            caption.textContent = (article.title || 'Untitled') + ' - ' + formatMeta(article);

            var actions = document.createElement('div');
            actions.className = 'tile-actions';

            var favoriteBtn = document.createElement('button');
            favoriteBtn.type = 'button';
            favoriteBtn.className = 'favorite-btn';
            favoriteBtn.textContent = isFavorite(article.url) ? 'Saved' : 'Add to Favorites';
            favoriteBtn.disabled = isFavorite(article.url);
            favoriteBtn.addEventListener('click', function() {
                favoriteBtn.disabled = true;
                favoriteBtn.textContent = 'Saving...';
                addFavorite(article).then(function() {
                    favoriteBtn.textContent = 'Saved';
                    renderFavoritesList();
                });
            });

            actions.appendChild(favoriteBtn);
            tile.appendChild(link);
            tile.appendChild(caption);
            tile.appendChild(actions);
            gallery.appendChild(tile);
        });
    }

    function showReturnToRecentPrompt() {
        if (window.confirm('No more news for this date. Go back to recent news?')) {
            loadRecentNews(state.category);
        }
    }

    function loadRecentNews(category) {
        if (state.isLoading) return;
        setLoading(true);

        fetchNews(category, pageSize, 'us', { forceRefresh: true })
            .then(function(articles) {
                if (!articles.length) {
                    renderEmpty('No recent news found.');
                    return;
                }
                renderArticles(articles, false);
            })
            .catch(function() {
                renderEmpty('Failed to load recent news.');
            })
            .finally(function() {
                setLoading(false);
            });
    }

    function searchNews(query) {
        if (state.isLoading) return;

        var trimmed = (query || '').trim();
        if (!trimmed) {
            window.alert('Please enter a search term.');
            return;
        }

        setLoading(true);

        fetchNews(state.category, pageSize, 'us', { query: trimmed })
            .then(function(articles) {
                if (!articles.length) {
                    renderEmpty('No results found for "' + trimmed + '".');
                    return;
                }
                renderArticles(articles, false);
            })
            .catch(function() {
                renderEmpty('Failed to search news.');
            })
            .finally(function() {
                setLoading(false);
            });
    }

    function loadNewsForDate(dateValue) {
        if (state.isLoading) return;
        if (!dateValue) {
            window.alert('Please select a date first.');
            return;
        }

        setLoading(true);
        clearGallery();

        var page = 1;
        var totalLoaded = 0;
        var exhausted = false;

        function fetchNextPage() {
            var options = { date: dateValue, page: page };
            if (state.category && state.category !== 'home') {
                options.query = state.category;
            }

            return fetchNews(state.category, pageSize, 'us', options)
                .then(function(articles) {
                    if (articles.length) {
                        renderArticles(articles, true);
                        totalLoaded += articles.length;
                    }

                    if (!articles.length || articles.length < pageSize) {
                        exhausted = true;
                        return false;
                    }

                    page += 1;
                    if (page > maxPages) {
                        window.alert('Reached the maximum number of pages for this date.');
                        return false;
                    }

                    return fetchNextPage();
                });
        }

        fetchNextPage()
            .then(function() {
                if (!totalLoaded) {
                    renderEmpty('No news found for the selected date.');
                } else if (exhausted) {
                    showReturnToRecentPrompt();
                }
            })
            .catch(function() {
                renderEmpty('Failed to load news for the selected date.');
            })
            .finally(function() {
                setLoading(false);
            });
    }

    if (loadNewBtn) {
        loadNewBtn.addEventListener('click', function() {
            loadNewsForDate(dateInput ? dateInput.value : '');
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            searchNews(searchInput ? searchInput.value : '');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                searchNews(searchInput.value);
            }
        });
    }

    if (loadFavoritesBtn) {
        loadFavoritesBtn.addEventListener('click', function() {
            loadFavorites().then(function() {
                renderFavoritesList();
            });
        });
    }

    if (navLinks && navLinks.length) {
        navLinks.forEach(function(link) {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                state.category = link.getAttribute('data-category') || 'science';
                loadRecentNews(state.category);
            });
        });
    }

    loadRecentNews(state.category);
    loadFavorites().then(function() {
        renderFavoritesList();
    });
})(window, document);