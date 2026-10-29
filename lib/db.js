import pg from 'pg';

const g = globalThis;
export const pool = (g.__pool ??= new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
}));
export const q = (text, params) => pool.query(text, params);

export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};

export const route = (method, fn) => async (req, res) => {
  if (req.method !== method) {
    res.setHeader('Allow', method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await fn(req, res);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    if (e.code === '23503' || e.code === '23514' || e.code === '22P02')
      return res.status(400).json({ error: 'Ugyldig data' });
    console.error(e);
    res.status(500).json({ error: 'Serverfeil' });
  }
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
export const oneOf = (v, list) => list.includes(v);
