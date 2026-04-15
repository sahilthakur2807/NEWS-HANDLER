(function () {
    var TOP_HEADLINES_API = 'https://newsapi.org/v2/top-headlines';
    var EVERYTHING_API = 'https://newsapi.org/v2/everything';

    function buildTopHeadlinesUrl(category, pageSize, country, page, options) {
        options = options || {};
        var params = new URLSearchParams({
            apiKey: window.NEWS_API_KEY,
            country: country || 'us',
            pageSize: String(pageSize || 16),
            page: String(page || 1)
        });

        if (category && category !== 'home') {
            params.set('category', category);
        }
        if (options.query) {
            params.set('q', options.query);
        }

        return TOP_HEADLINES_API + '?' + params.toString();
    }

    function buildEverythingUrl(query, pageSize, selectedDate, page) {
        var params = new URLSearchParams({
            apiKey: window.NEWS_API_KEY,
            q: query || 'news',
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: String(pageSize || 16),
            page: String(page || 1)
        });

        if (selectedDate) {
            params.set('from', selectedDate);
            params.set('to', selectedDate);
        }

        return EVERYTHING_API + '?' + params.toString();
    }

    function fetchNews(category, pageSize, country, options) {
        options = options || {};

        if (!window.NEWS_API_KEY) {
            return Promise.reject(new Error('API key not found in config.js'));
        }

        var hasDateFilter = Boolean(options.date);
        var url = hasDateFilter
            ? buildEverythingUrl(options.query, pageSize, options.date, options.page)
            : buildTopHeadlinesUrl(category, pageSize, country, options.page, options);

        return fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                return Array.isArray(data.articles) ? data.articles : [];
            });
    }

    window.newsManager = {
        fetchNews: fetchNews
    };
})();
