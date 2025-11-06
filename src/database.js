const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;
let SQL = null;
let dbPath = null;

async function initDatabase() {
  // Initialize sql.js - it will handle locating the WASM file
  SQL = await initSqlJs();
  
  // Get the user data path for the app
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'arc-scanner.db');
  
  // Load existing database or create new one
  let buffer;
  if (fs.existsSync(dbPath)) {
    buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables for items, relations, and user data
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      rarity TEXT,
      description TEXT,
      image_url TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES items(id),
      FOREIGN KEY (target_id) REFERENCES items(id),
      UNIQUE(source_id, target_id, relation_type)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS user_data (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run('CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id)');
  
  // Save the database to disk
  saveDatabase();
  
  return db;
}

function saveDatabase() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Item CRUD operations
function addItem(item) {
  db.run(
    `INSERT OR REPLACE INTO items (id, name, type, rarity, description, image_url, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.name,
      item.type || null,
      item.rarity || null,
      item.description || null,
      item.image_url || null,
      JSON.stringify(item.data || {})
    ]
  );
  saveDatabase();
  return { changes: 1 };
}

function getItem(id) {
  const result = db.exec('SELECT * FROM items WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const columns = result[0].columns;
  const values = result[0].values[0];
  const item = {};
  
  columns.forEach((col, idx) => {
    item[col] = values[idx];
  });
  
  if (item.data) {
    item.data = JSON.parse(item.data);
  }
  
  return item;
}

function getAllItems() {
  const result = db.exec('SELECT * FROM items ORDER BY name');
  if (result.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  const items = result[0].values.map(values => {
    const item = {};
    columns.forEach((col, idx) => {
      item[col] = values[idx];
    });
    if (item.data) {
      item.data = JSON.parse(item.data);
    }
    return item;
  });
  
  return items;
}

// Relation CRUD operations
function addRelation(relation) {
  db.run(
    `INSERT OR REPLACE INTO relations (source_id, target_id, relation_type, weight, data)
     VALUES (?, ?, ?, ?, ?)`,
    [
      relation.source_id,
      relation.target_id,
      relation.relation_type,
      relation.weight || 1.0,
      JSON.stringify(relation.data || {})
    ]
  );
  saveDatabase();
  return { changes: 1 };
}

function getRelationsForItem(itemId) {
  const result = db.exec(
    'SELECT * FROM relations WHERE source_id = ? OR target_id = ?',
    [itemId, itemId]
  );
  
  if (result.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  const relations = result[0].values.map(values => {
    const rel = {};
    columns.forEach((col, idx) => {
      rel[col] = values[idx];
    });
    if (rel.data) {
      rel.data = JSON.parse(rel.data);
    }
    return rel;
  });
  
  return relations;
}

function getAllRelations() {
  const result = db.exec('SELECT * FROM relations');
  if (result.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  const relations = result[0].values.map(values => {
    const rel = {};
    columns.forEach((col, idx) => {
      rel[col] = values[idx];
    });
    if (rel.data) {
      rel.data = JSON.parse(rel.data);
    }
    return rel;
  });
  
  return relations;
}

// User data operations
function setUserData(key, value) {
  db.run(
    `INSERT OR REPLACE INTO user_data (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [key, JSON.stringify(value)]
  );
  saveDatabase();
  return { changes: 1 };
}

function getUserData(key) {
  const result = db.exec('SELECT value FROM user_data WHERE key = ?', [key]);
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const value = result[0].values[0][0];
  return value ? JSON.parse(value) : null;
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  addItem,
  getItem,
  getAllItems,
  addRelation,
  getRelationsForItem,
  getAllRelations,
  setUserData,
  getUserData,
};
