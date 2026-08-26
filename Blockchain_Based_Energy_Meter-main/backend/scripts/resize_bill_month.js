const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function resize() {
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('ALTER TABLE payments ALTER COLUMN bill_month TYPE VARCHAR(100);');
    console.log('✅ Column bill_month resized to VARCHAR(100)');
  } catch (err) {
    console.error('❌ Resize failed:', err.message);
  } finally {
    await client.end();
  }
}

resize();
