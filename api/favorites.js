const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
});

let initialized = false;

async function initTable() {
    if (initialized) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            source TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    initialized = true;
}

function parseBody(body) {
    if (!body) return {};
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch (error) {
            return {};
        }
    }
    return body;
}

module.exports = async function handler(req, res) {
    try {
        await initTable();

        if (req.method === 'GET') {
            const result = await pool.query(
                'SELECT title, url, source FROM favorites ORDER BY created_at DESC'
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const body = parseBody(req.body);
            const title = body.title || 'Untitled';
            const url = body.url;
            const source = body.source || 'Unknown source';

            if (!url) {
                return res.status(400).json({ error: 'URL is required' });
            }

            const result = await pool.query(
                'INSERT INTO favorites (title, url, source) VALUES ($1, $2, $3) ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title, source = EXCLUDED.source RETURNING title, url, source',
                [title, url, source]
            );

            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'DELETE') {
            const body = parseBody(req.body);
            const url = body.url;

            if (!url) {
                return res.status(400).json({ error: 'URL is required' });
            }

            await pool.query('DELETE FROM favorites WHERE url = $1', [url]);
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: 'Favorites API failed' });
    }
};
