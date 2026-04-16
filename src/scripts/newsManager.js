(function () {
    function buildNewsApiUrl(category, pageSize, country, options) {
        options = options || {};
        var params = new URLSearchParams({
            category: category || 'science',
            pageSize: String(pageSize || 16),
            country: country || 'us',
            page: String(options.page || 1)
        });

        if (options.query) {
            params.set('query', options.query);
        }

        if (options.date) {
            params.set('date', options.date);
        }

        return '/api/news?' + params.toString();
    }

    function fetchNews(category, pageSize, country, options) {
        options = options || {};
        var url = buildNewsApiUrl(category, pageSize, country, options);

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