const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('ALTER TABLE energy_readings ADD COLUMN IF NOT EXISTS power_factor NUMERIC(5,3) DEFAULT 0.95;');
    console.log('✅ Added power_factor column');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
