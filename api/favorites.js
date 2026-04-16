const { Pool } = require('pg');

let pool = null;
let poolInitError = null;

let initialized = false;

function hasLocalDbConfig() {
    return Boolean(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE);
}

function resolveSslConfig(connectionString) {
    if (process.env.PGSSL === 'true') {
        return { rejectUnauthorized: false };
    }

    if (process.env.PGSSL === 'false') {
        return false;
    }

    if (!connectionString) {
        return undefined;
    }

    try {
        var parsed = new URL(connectionString);
        var host = (parsed.hostname || '').toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1') {
            return false;
        }
    } catch (error) {
        return undefined;
    }

    return { rejectUnauthorized: false };
}

function getPool() {
    if (pool) return pool;
    if (poolInitError) throw poolInitError;

    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!connectionString && !hasLocalDbConfig()) {
        poolInitError = new Error('Database is not configured. Set POSTGRES_URL (recommended) or PGHOST/PGUSER/PGDATABASE.');
        throw poolInitError;
    }

    try {
        const sslConfig = resolveSslConfig(connectionString);

        pool = connectionString
            ? new Pool({
                connectionString: connectionString,
                ssl: sslConfig
            })
            : new Pool({
                host: process.env.PGHOST,
                port: Number(process.env.PGPORT) || 5432,
                user: process.env.PGUSER,
                password: process.env.PGPASSWORD || '',
                database: process.env.PGDATABASE,
                ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
            });

        return pool;
    } catch (error) {
        poolInitError = error;
        throw poolInitError;
    }
}

async function initTable() {
    if (initialized) return;

    const db = getPool();

    await db.query(`
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
        const db = getPool();
        await initTable();

        if (req.method === 'GET') {
            const result = await db.query(
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

            const result = await db.query(
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

            await db.query('DELETE FROM favorites WHERE url = $1', [url]);
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: 'Favorites API failed', details: error.message });
    }
};
