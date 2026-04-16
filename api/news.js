module.exports = async function handler(req, res) {
    try {
        const apiKey = process.env.NEWS_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'NEWS_API_KEY is not configured' });
        }

        const query = req.query || {};
        const category = query.category || 'science';
        const country = query.country || 'us';
        const pageSize = Number(query.pageSize) || 12;
        const page = Number(query.page) || 1;
        const searchQuery = query.query;
        const date = query.date;

        const params = new URLSearchParams({
            apiKey: apiKey,
            pageSize: String(pageSize),
            page: String(page)
        });

        let endpoint = 'https://newsapi.org/v2/top-headlines';

        if (date) {
            endpoint = 'https://newsapi.org/v2/everything';
            params.set('q', searchQuery || category || 'news');
            params.set('language', 'en');
            params.set('sortBy', 'publishedAt');
            params.set('from', date);
            params.set('to', date);
        } else {
            params.set('country', country);
            if (category && category !== 'home') {
                params.set('category', category);
            }
            if (searchQuery) {
                params.set('q', searchQuery);
            }
        }

        const response = await fetch(endpoint + '?' + params.toString());
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data && data.message ? data.message : 'Failed to fetch news'
            });
        }

        return res.status(200).json({
            articles: Array.isArray(data.articles) ? data.articles : []
        });
    } catch (error) {
        return res.status(500).json({ error: 'News API request failed' });
    }
};
