require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD || '',
    host: process.env.PGHOST,
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE
});

async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
}

app.get('/', (req, res) => {
    res.json({ message: 'News API Server', endpoints: ['/api/health', '/api/favorites'] });
});

app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

app.get('/api/favorites', async (req, res) => {
    try {
        const result = await pool.query('SELECT title, url, source FROM favorites ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

app.post('/api/favorites', async (req, res) => {
    const { title, url, source } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO favorites (title, url, source) VALUES ($1, $2, $3) ON CONFLICT (url) DO NOTHING RETURNING *',
            [title || 'Untitled', url, source || 'Unknown']
        );
        res.json(result.rows[0] || { message: 'Already exists' });
    } catch (error) {
        console.error('Error saving favorite:', error);
        res.status(500).json({ error: 'Failed to save favorite' });
    }
});

app.delete('/api/favorites', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const result = await pool.query('DELETE FROM favorites WHERE url = $1 RETURNING *', [url]);
        res.json(result.rows[0] || { message: 'Not found' });
    } catch (error) {
        console.error('Error deleting favorite:', error);
        res.status(500).json({ error: 'Failed to delete favorite' });
    }
});

initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
});
