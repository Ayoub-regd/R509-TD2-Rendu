'use strict';

const http = require('http');
const { Pool } = require('pg');

const PORT = 5000;
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: 5432,
  user: process.env.DB_USER || 'app',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'appdb',
  connectionTimeoutMillis: 3000
});

const app = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('OK\n');
  }

  try {
    const result = await pool.query(
      'SELECT current_database() AS database, current_user AS username, NOW() AS db_time'
    );
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      application: 'TD2 R509',
      pod: process.env.HOSTNAME || 'local',
      postgres: result.rows[0]
    }, null, 2) + '\n');
  } catch (err) {
    console.error('Erreur PostgreSQL :', err.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'error', message: 'PostgreSQL indisponible' }) + '\n');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Application TD2 : HTTP sur 0.0.0.0:${PORT}`);
});
