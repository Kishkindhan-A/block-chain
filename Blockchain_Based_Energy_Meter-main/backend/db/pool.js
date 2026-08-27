// ============================================================
// db/pool.js – Database Connection Pool (PostgreSQL with SQLite Fallback)
// ============================================================

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

let isPgConnected = false;
let sqliteDb = null;

// Initialize PostgreSQL pool only if explicitly enabled via USE_POSTGRESQL env var.
const usePostgres = process.env.USE_POSTGRESQL === 'true';
let pgPool = null;
if (usePostgres && process.env.DB_HOST && process.env.DB_HOST.trim() !== '') {
  pgPool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'enargy',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'yourpassword',
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  console.info('ℹ️ PostgreSQL disabled or not configured. Using SQLite fallback.');
}

function initSqlite() {
  if (sqliteDb) return;
  const dbPath = path.join(__dirname, '../enargy.sqlite');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite initialization error:', err.message);
    } else {
      console.log('✅ SQLite database active at:', dbPath);
      // Auto-create tables if PostgreSQL is not available
        sqliteDb.serialize(() => {
          // Core readings table (includes new security columns)
          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS energy_readings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              meter_id TEXT NOT NULL,
              timestamp TEXT NOT NULL,
              voltage REAL,
              current REAL,
              power REAL,
              power_factor REAL,
              energy_kwh REAL,
              hash TEXT,
              signature TEXT,
              sequence INTEGER,
              verification_status TEXT DEFAULT 'PENDING',
              blockchain_tx_hash TEXT
            );
          `);
          // Ensure any older DB gets the new columns – make ALTER statements idempotent
          function safeAlter(sql) {
            sqliteDb.run(sql, err => {
              if (err && !err.message.includes('duplicate column')) {
                console.error('⚠️ SQLite ALTER error:', err.message);
              }
            });
          }
          safeAlter(`ALTER TABLE energy_readings ADD COLUMN signature TEXT;`);
          safeAlter(`ALTER TABLE energy_readings ADD COLUMN sequence INTEGER;`);
          safeAlter(`ALTER TABLE energy_readings ADD COLUMN verification_status TEXT DEFAULT 'PENDING';`);

          // Meter registry for public keys and replay protection
          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS meter_registry (
              meter_id TEXT PRIMARY KEY,
              public_key TEXT NOT NULL,
              algorithm TEXT NOT NULL,
              status TEXT DEFAULT 'ACTIVE',
              registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
              last_sequence INTEGER DEFAULT 0,
              last_seen TEXT
            );
          `);
          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS payments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              meter_id TEXT NOT NULL,
              bill_month TEXT NOT NULL,
              amount REAL NOT NULL,
              razorpay_order_id TEXT,
              razorpay_payment_id TEXT,
              status TEXT DEFAULT 'pending',
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);
          sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_meter_id ON energy_readings(meter_id);`);
          sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_payment_meter ON payments(meter_id);`);
        });
    }
  });
}

// Test PostgreSQL connection
if (pgPool) {
  pgPool.connect((err, client, release) => {
    if (err) {
      console.warn('⚠️ PostgreSQL connection failed (' + err.message + '). Falling back to SQLite.');
      isPgConnected = false;
      initSqlite();
    } else {
      console.log('✅ PostgreSQL connected successfully');
      isPgConnected = true;
      release();
    }
  });
} else {
  // Directly initialize SQLite when PostgreSQL is disabled or not configured.
  initSqlite();
}

async function query(text, params = []) {
  if (isPgConnected) {
    try {
      return await pgPool.query(text, params);
    } catch (err) {
      initSqlite();
      return querySqlite(text, params);
    }
  } else {
    initSqlite();
    return querySqlite(text, params);
  }
}

function querySqlite(text, params = []) {
  return new Promise((resolve, reject) => {
    let sqliteSql = text.replace(/\$\d+/g, '?');
    const hasReturning = /RETURNING\s+id/i.test(sqliteSql);
    sqliteSql = sqliteSql.replace(/RETURNING\s+id/i, '');

    const trimmedSql = sqliteSql.trim();
    const isInsert = /^INSERT/i.test(trimmedSql);
    const isSelect = /^SELECT/i.test(trimmedSql);

    if (isSelect) {
      sqliteDb.all(sqliteSql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], count: (rows || []).length, rowCount: (rows || []).length });
      });
    } else if (isInsert) {
      sqliteDb.run(sqliteSql, params, function (err) {
        if (err) return reject(err);
        const rows = hasReturning ? [{ id: this.lastID }] : [];
        resolve({ rows, lastID: this.lastID, rowCount: this.changes });
      });
    } else {
      sqliteDb.run(sqliteSql, params, function (err) {
        if (err) return reject(err);
        resolve({ rows: [], rowCount: this.changes });
      });
    }
  });
}

module.exports = {
  query,
  connect: (cb) => {
    if (isPgConnected) pgPool.connect(cb);
    else if (cb) {
      initSqlite();
      cb(null, { release: () => {} }, () => {});
    }
  }
};
