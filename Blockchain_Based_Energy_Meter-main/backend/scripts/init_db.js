const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ Initializing database schema...');
    await pool.query(sql);
    console.log('✅ Database schema initialized successfully!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  }
}

initializeDatabase();
