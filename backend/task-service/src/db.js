const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'somp_db',
  user: process.env.DB_USER || 'somp_user',
  password: process.env.DB_PASSWORD || 'somp_password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => console.error('Unexpected DB error:', err));

module.exports = pool;
