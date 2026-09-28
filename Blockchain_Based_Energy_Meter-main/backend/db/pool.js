// ============================================================
// db/pool.js – Database Connection Pool (PostgreSQL with SQLite Fallback)
// ============================================================

const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config();

let isPgConnected = false;
let sqliteDb = null;

const usePostgres = process.env.USE_POSTGRESQL === 'true';
let pgPool = null;

if (usePostgres && process.env.DB_HOST && process.env.DB_HOST.trim() !== '') {
  pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'enargy',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  console.info('ℹ️ PostgreSQL disabled or not configured. Using SQLite fallback.');
}

function initSqlite() {
  if (sqliteDb) return;

  const dbPath = path.join(__dirname, '../enargy.sqlite');
  sqliteDb = new DatabaseSync(dbPath);

  console.log('✅ SQLite database active at:', dbPath);

  sqliteDb.exec(`
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

  sqliteDb.exec(`
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

  sqliteDb.exec(`
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

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS rfid_cards (
      card_uid TEXT PRIMARY KEY,
      meter_id TEXT NOT NULL,
      owner_name TEXT,
      status TEXT DEFAULT 'ACTIVE',
      last_seen TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_meter_id ON energy_readings(meter_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_payment_meter ON payments(meter_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_rfid_meter ON rfid_cards(meter_id);`);

  try {
    sqliteDb.exec(`ALTER TABLE energy_readings ADD COLUMN signature TEXT;`);
  } catch (err) {
    // ignore duplicate column error
  }

  try {
    sqliteDb.exec(`ALTER TABLE energy_readings ADD COLUMN sequence INTEGER;`);
  } catch (err) {
    // ignore duplicate column error
  }

  try {
    sqliteDb.exec(`ALTER TABLE energy_readings ADD COLUMN verification_status TEXT DEFAULT 'PENDING';`);
  } catch (err) {
    // ignore duplicate column error
  }
}

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
  }

  initSqlite();
  return querySqlite(text, params);
}

function querySqlite(text, params = []) {
  const sqliteSql = text.replace(/\$\d+/g, '?');
  const trimmedSql = sqliteSql.trim();
  const isSelect = /^SELECT/i.test(trimmedSql);
  const isInsert = /^INSERT/i.test(trimmedSql);

  if (isSelect) {
    const rows = sqliteDb.prepare(sqliteSql).all(...params);
    return { rows: rows || [], count: (rows || []).length, rowCount: (rows || []).length };
  }

  if (isInsert) {
    const prepared = sqliteDb.prepare(sqliteSql);
    const result = prepared.run(...params);
    const hasReturning = /RETURNING\s+id/i.test(sqliteSql);
    if (hasReturning) {
      const lastId = sqliteDb.prepare('SELECT last_insert_rowid() AS id').get().id;
      return { rows: [{ id: lastId }], lastID: lastId, rowCount: 1 };
    }
    return { rows: [], lastID: result.lastInsertRowid ?? null, rowCount: result.changes ?? 0 };
  }

  const prepared = sqliteDb.prepare(sqliteSql);
  const result = prepared.run(...params);
  return { rows: [], rowCount: result.changes ?? 0, lastID: result.lastInsertRowid ?? null };
}

module.exports = {
  query,
  connect: (cb) => {
    if (isPgConnected) {
      pgPool.connect(cb);
      return;
    }

    initSqlite();
    if (cb) {
      cb(null, { release: () => {} }, () => {});
    }
  }
};
