require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE
});

async function initDatabase() {
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
    res.json({ ok: true, endpoints: ['/api/health', '/api/favorites'] });
});

app.get('/api/health', function(req, res) {
    res.json({ ok: true });
});

app.get('/api/favorites', async function(req, res) {
    try {
        const result = await pool.query('SELECT title, url, source FROM favorites ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load favorites' });
    }
});

app.post('/api/favorites', async function(req, res) {
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
        process.exit(1);
    });
