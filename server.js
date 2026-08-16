const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Inizializzazione tabelle database[cite: 1]
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
initDB().catch(err => console.error(err));

// --- API USERS ---[cite: 1]
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tbz_users');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, role, portfolio, note, ownedCompany } = req.body;
        await pool.query(
            `INSERT INTO tbz_users (username, password, role, portfolio, note, owned_company) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (username) DO UPDATE SET password=$2, role=$3, portfolio=$4, note=$5, owned_company=$6`,
            [username, password, role, JSON.stringify(portfolio || {}), note || '', ownedCompany || '']
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/users', async (req, res) => {
    try {
        const { username } = req.body;
        await pool.query('DELETE FROM tbz_users WHERE username = $1', [username]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- API COMPANIES ---[cite: 1]
app.get('/api/companies', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tbz_companies');
        res.json(result.rows.map(r => ({
            ...r,
            valuation: parseFloat(r.valuation),
            price: parseFloat(r.price),
            growth: parseFloat(r.growth)
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/companies', async (req, res) => {
    try {
        const { id, name, valuation, stocks, price, growth, history } = req.body;
        await pool.query(
            `INSERT INTO tbz_companies (id, name, valuation, stocks, price, growth, history) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET name=$2, valuation=$3, stocks=$4, price=$5, growth=$6, history=$7`,
            [id, name, valuation, stocks, price, growth, JSON.stringify(history)]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/companies', async (req, res) => {
    try {
        const { id } = req.body;
        await pool.query('DELETE FROM tbz_companies WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- API ORDERS ---[cite: 1]
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tbz_orders');
        res.json(result.rows.map(r => ({
            id: r.id, code: r.code, date: r.date, user: r.username,
            company: r.company, qty: r.qty, total: parseFloat(r.total), status: r.status
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/orders', async (req, res) => {
    try {
        const { id, code, date, user, company, qty, total, status } = req.body;
        await pool.query(
            `INSERT INTO tbz_orders (id, code, date, username, company, qty, total, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET code=$2, date=$3, username=$4, company=$5, qty=$6, total=$7, status=$8`,
            [id, code, date, user, company, qty, total, status]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/orders', async (req, res) => {
    try {
        const { id } = req.body;
        await pool.query('DELETE FROM tbz_orders WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Per far funzionare Express su Vercel come serverless function unica
module.exports = app;
