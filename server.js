require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/styles', express.static(path.join(__dirname, 'src/styles')));
app.use('/scripts', express.static(path.join(__dirname, 'src/scripts')));
app.use('/assets', express.static(path.join(__dirname, 'src/assets')));

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const hasLocalDbConfig = Boolean(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE);
const hasDbConfig = Boolean(connectionString || hasLocalDbConfig);

const pool = hasDbConfig
    ? new Pool(
        connectionString
            ? {
                connectionString: connectionString,
                ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
            }
            : {
                host: process.env.PGHOST,
                port: Number(process.env.PGPORT) || 5432,
                user: process.env.PGUSER,
                password: process.env.PGPASSWORD || '',
                database: process.env.PGDATABASE,
                ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
            }
    )
    : null;

async function initDatabase() {
    if (!pool) {
        return;
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            source TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'src/pages/index.html'));
});

app.get('/api/news', async function(req, res) {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'NEWS_API_KEY is not configured' });
    }

    try {
        const category = req.query.category || 'science';
        const country = req.query.country || 'us';
        const pageSize = Number(req.query.pageSize) || 12;
        const page = Number(req.query.page) || 1;
        const searchQuery = req.query.query;
        const date = req.query.date;

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
});

app.get('/api/health', function(req, res) {
    res.json({ ok: true });
});

app.get('/api/favorites', async function(req, res) {
    if (!pool) {
        return res.status(500).json({ error: 'Database is not configured' });
    }

    try {
        const result = await pool.query('SELECT title, url, source FROM favorites ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load favorites' });
    }
});

app.post('/api/favorites', async function(req, res) {
    if (!pool) {
        return res.status(500).json({ error: 'Database is not configured' });
    }

    const title = req.body.title || 'Untitled';
    const url = req.body.url;
    const source = req.body.source || 'Unknown source';

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO favorites (title, url, source) VALUES ($1, $2, $3) ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title, source = EXCLUDED.source RETURNING title, url, source',
            [title, url, source]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save favorite' });
    }
});

app.delete('/api/favorites', async function(req, res) {
    if (!pool) {
        return res.status(500).json({ error: 'Database is not configured' });
    }

    const url = req.body.url;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        await pool.query('DELETE FROM favorites WHERE url = $1', [url]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete favorite' });
    }
});

initDatabase()
    .then(function() {
        app.listen(port, function() {
            console.log('Server running on http://localhost:' + port);
        });
    })
    .catch(function(error) {
        console.error('Database initialization failed:', error);

        if (process.env.VERCEL) {
            app.listen(port, function() {
                console.log('Server running on http://localhost:' + port);
            });
            return;
        }

        process.exit(1);
    });
