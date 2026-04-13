(function(window, document) {
    if (!window.newsManager || !window.newsManager.fetchNews) {
        throw new Error('newsManager.fetchNews is not available.');
    }

    var fetchNews = window.newsManager.fetchNews;
    var pageSize = 12;
    var maxPages = 20;

    var state = {
        category: 'home',
        isLoading: false
    };

    var gallery = document.getElementById('bento-gallery');
    var dateInput = document.getElementById('news-date');
    var loadNewBtn = document.getElementById('load-new-news');
    var navLinks = document.querySelectorAll('.nav-items a[data-category]');

    function setLoading(isLoading) {
        state.isLoading = isLoading;
        if (loadNewBtn) {
            loadNewBtn.disabled = isLoading;
            loadNewBtn.textContent = isLoading ? 'Loading...' : 'Load New News';
        }
    }

    function clearGallery() {
        if (gallery) {
            gallery.innerHTML = '';
        }
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
            img.src = article.urlToImage || 'https://via.placeholder.com/800x600?text=News';
            img.alt = article.title || 'News image';
            link.appendChild(img);

            var caption = document.createElement('div');
            caption.className = 'tile-caption';
                caption.textContent = (article.title || 'Untitled') + ' - ' + formatMeta(article);

            tile.appendChild(link);
            tile.appendChild(caption);
            gallery.appendChild(tile);
        });
    }

    function showReturnToRecentPrompt() {
        var goBack = window.confirm('No more news for this date. Go back to recent news?');
        if (goBack) {
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
            .catch(function(error) {
                renderEmpty('Failed to load recent news.');
                console.error(error);
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

        function fetchNextPage() {
            return fetchNews(state.category, pageSize, 'us', { date: dateValue, page: page })
                .then(function(articles) {
                    if (articles.length) {
                        renderArticles(articles, true);
                        totalLoaded += articles.length;
                    }

                    if (!articles.length || articles.length < pageSize) {
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
                }
                showReturnToRecentPrompt();
            })
            .catch(function(error) {
                renderEmpty('Failed to load news for the selected date.');
                console.error(error);
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

    if (navLinks && navLinks.length) {
        navLinks.forEach(function(link) {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                state.category = link.getAttribute('data-category') || 'home';
                loadRecentNews(state.category);
            });
        });
    }

    loadRecentNews(state.category);
})(window, document);