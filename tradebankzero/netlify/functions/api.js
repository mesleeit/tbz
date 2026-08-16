const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tbz_users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            portfolio JSONB DEFAULT '{}',
            note TEXT DEFAULT '',
            owned_company TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS tbz_companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            valuation NUMERIC NOT NULL,
            stocks INTEGER NOT NULL,
            price NUMERIC NOT NULL,
            growth NUMERIC DEFAULT 0,
            history JSONB DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS tbz_orders (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            date TEXT NOT NULL,
            username TEXT NOT NULL,
            company TEXT NOT NULL,
            qty INTEGER NOT NULL,
            total NUMERIC NOT NULL,
            status TEXT NOT NULL
        );
    `);
}

initDB().catch(err => console.error("Errore inizializzazione DB:", err));

exports.handler = async (event) => {
    // Intercetta il percorso indipendentemente dal prefisso di Netlify
    let path = event.path.replace('/.netlify/functions/api', '');
    if (path.startsWith('/api')) {
        path = path.replace('/api', '');
    }
    if (path === '') path = '/';

    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // ---- USERS ----
        if (path === '/users' && method === 'GET') {
            const result = await pool.query('SELECT * FROM tbz_users');
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.rows) };
        }
        if (path === '/users' && method === 'POST') {
            const { username, password, role, portfolio, note, ownedCompany } = body;
            await pool.query(
                `INSERT INTO tbz_users (username, password, role, portfolio, note, owned_company) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 ON CONFLICT (username) DO UPDATE SET password=$2, role=$3, portfolio=$4, note=$5, owned_company=$6`,
                [username, password, role, JSON.stringify(portfolio || {}), note || '', ownedCompany || '']
            );
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
        }
        if (path === '/users' && method === 'DELETE') {
            const { username } = body;
            await pool.query('DELETE FROM tbz_users WHERE username = $1', [username]);
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
        }

        // ---- COMPANIES ----
        if (path === '/companies' && method === 'GET') {
            const result = await pool.query('SELECT * FROM tbz_companies');
            const rows = result.rows.map(r => ({
                id: r.id,
                name: r.name,
                valuation: parseFloat(r.valuation),
                stocks: r.stocks,
                price: parseFloat(r.price),
                growth: parseFloat(r.growth),
                history: r.history
            }));
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) };
        }
        if (path === '/companies' && method === 'POST') {
            const { id, name, valuation, stocks, price, growth, history } = body;
            await pool.query(
                `INSERT INTO tbz_companies (id, name, valuation, stocks, price, growth, history) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO UPDATE SET name=$2, valuation=$3, stocks=$4, price=$5, growth=$6, history=$7`,
                [id, name, valuation, stocks, price, growth, JSON.stringify(history)]
            );
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
        }
        if (path === '/companies' && method === 'DELETE') {
            const { id } = body;
            await pool.query('DELETE FROM tbz_companies WHERE id = $1', [id]);
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
        }

        // ---- ORDERS ----
        if (path === '/orders' && method === 'GET') {
            const result = await pool.query('SELECT * FROM tbz_orders');
            const rows = result.rows.map(r => ({
                id: r.id,
                code: r.code,
                date: r.date,
                user: r.username,
                company: r.company,
                qty: r.qty,
                total: parseFloat(r.total),
                status: r.status
            }));
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) };
        }
        if (path === '/orders' && method === 'POST') {
            const { id, code, date, user, company, qty, total, status } = body;
            await pool.query(
                `INSERT INTO tbz_orders (id, code, date, username, company, qty, total, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET code=$2, date=$3, username=$4, company=$5, qty=$6, total=$7, status=$8`,
                [id, code, date, user, company, qty, total, status]
            );
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
        }
        if (path === '/orders' && method === 'DELETE') {
            const { id } = body;
            await pool.query('DELETE FROM tbz_orders WHERE id = $1', [id]);
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "Endpoint non trovato", path }) };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
    }
};