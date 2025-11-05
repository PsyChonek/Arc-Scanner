const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

function initDatabase() {
  // Get the user data path for the app
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'arc-scanner.db');
  
  db = new Database(dbPath);
  
  // Create tables for items, relations, and user data
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      rarity TEXT,
      description TEXT,
      image_url TEXT,
      data JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      data JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES items(id),
      FOREIGN KEY (target_id) REFERENCES items(id),
      UNIQUE(source_id, target_id, relation_type)
    );
    
    CREATE TABLE IF NOT EXISTS user_data (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
    CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
  `);
  
  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// Item CRUD operations
function addItem(item) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO items (id, name, type, rarity, description, image_url, data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    item.id,
    item.name,
    item.type || null,
    item.rarity || null,
    item.description || null,
    item.image_url || null,
    JSON.stringify(item.data || {})
  );
}

function getItem(id) {
  const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
  const item = stmt.get(id);
  if (item && item.data) {
    item.data = JSON.parse(item.data);
  }
  return item;
}

function getAllItems() {
  const stmt = db.prepare('SELECT * FROM items ORDER BY name');
  const items = stmt.all();
  return items.map(item => {
    if (item.data) {
      item.data = JSON.parse(item.data);
    }
    return item;
  });
}

// Relation CRUD operations
function addRelation(relation) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO relations (source_id, target_id, relation_type, weight, data)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(
    relation.source_id,
    relation.target_id,
    relation.relation_type,
    relation.weight || 1.0,
    JSON.stringify(relation.data || {})
  );
}

function getRelationsForItem(itemId) {
  const stmt = db.prepare(`
    SELECT * FROM relations 
    WHERE source_id = ? OR target_id = ?
  `);
  const relations = stmt.all(itemId, itemId);
  return relations.map(rel => {
    if (rel.data) {
      rel.data = JSON.parse(rel.data);
    }
    return rel;
  });
}

function getAllRelations() {
  const stmt = db.prepare('SELECT * FROM relations');
  const relations = stmt.all();
  return relations.map(rel => {
    if (rel.data) {
      rel.data = JSON.parse(rel.data);
    }
    return rel;
  });
}

// User data operations
function setUserData(key, value) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO user_data (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  return stmt.run(key, JSON.stringify(value));
}

function getUserData(key) {
  const stmt = db.prepare('SELECT value FROM user_data WHERE key = ?');
  const row = stmt.get(key);
  return row ? JSON.parse(row.value) : null;
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
