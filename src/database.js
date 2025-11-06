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
  
  // Inventory tracking - what the user owns
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      item_id TEXT PRIMARY KEY,
      quantity INTEGER DEFAULT 1,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id)
    )
  `);
  
  // Tracked items - upgrades/quests the user wants to track
  db.run(`
    CREATE TABLE IF NOT EXISTS tracked_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'upgrade',
      completed BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (item_id) REFERENCES items(id)
    )
  `);
  
  // Required items for tracked items (what materials/items are needed)
  db.run(`
    CREATE TABLE IF NOT EXISTS tracked_item_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracked_item_id INTEGER NOT NULL,
      required_item_id TEXT NOT NULL,
      quantity_needed INTEGER DEFAULT 1,
      FOREIGN KEY (tracked_item_id) REFERENCES tracked_items(id) ON DELETE CASCADE,
      FOREIGN KEY (required_item_id) REFERENCES items(id)
    )
  `);
  
  db.run('CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tracked_items_completed ON tracked_items(completed)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tracked_requirements ON tracked_item_requirements(tracked_item_id)');
  
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

// Inventory operations
function addToInventory(itemId, quantity = 1) {
  const existing = db.exec('SELECT quantity FROM inventory WHERE item_id = ?', [itemId]);
  
  if (existing.length > 0 && existing[0].values.length > 0) {
    const currentQty = existing[0].values[0][0];
    db.run('UPDATE inventory SET quantity = ? WHERE item_id = ?', [currentQty + quantity, itemId]);
  } else {
    db.run('INSERT INTO inventory (item_id, quantity) VALUES (?, ?)', [itemId, quantity]);
  }
  
  saveDatabase();
  return { changes: 1 };
}

function removeFromInventory(itemId) {
  db.run('DELETE FROM inventory WHERE item_id = ?', [itemId]);
  saveDatabase();
  return { changes: 1 };
}

function getInventory() {
  const result = db.exec(`
    SELECT i.id, i.name, i.type, i.rarity, i.image_url, inv.quantity, inv.added_at
    FROM inventory inv
    JOIN items i ON inv.item_id = i.id
    ORDER BY i.name
  `);
  
  if (result.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const item = {};
    columns.forEach((col, idx) => {
      item[col] = values[idx];
    });
    return item;
  });
}

function updateInventoryQuantity(itemId, quantity) {
  if (quantity <= 0) {
    return removeFromInventory(itemId);
  }
  
  db.run('INSERT OR REPLACE INTO inventory (item_id, quantity) VALUES (?, ?)', [itemId, quantity]);
  saveDatabase();
  return { changes: 1 };
}

// Tracked items operations
function addTrackedItem(itemId, name, type = 'upgrade', notes = '') {
  db.run(
    'INSERT INTO tracked_items (item_id, name, type, notes) VALUES (?, ?, ?, ?)',
    [itemId, name, type, notes]
  );
  saveDatabase();
  
  // Get the ID of the inserted row
  const result = db.exec('SELECT last_insert_rowid()');
  return result[0].values[0][0];
}

function removeTrackedItem(trackedItemId) {
  db.run('DELETE FROM tracked_items WHERE id = ?', [trackedItemId]);
  saveDatabase();
  return { changes: 1 };
}

function markTrackedItemCompleted(trackedItemId, completed = true) {
  if (completed) {
    db.run(
      'UPDATE tracked_items SET completed = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [1, trackedItemId]
    );
  } else {
    db.run(
      'UPDATE tracked_items SET completed = ?, completed_at = NULL WHERE id = ?',
      [0, trackedItemId]
    );
  }
  saveDatabase();
  return { changes: 1 };
}

function getAllTrackedItems() {
  const result = db.exec(`
    SELECT t.*, i.type as item_type, i.rarity, i.image_url
    FROM tracked_items t
    LEFT JOIN items i ON t.item_id = i.id
    ORDER BY t.completed ASC, t.created_at DESC
  `);
  
  if (result.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const item = {};
    columns.forEach((col, idx) => {
      item[col] = values[idx];
    });
    return item;
  });
}

function addTrackedItemRequirement(trackedItemId, requiredItemId, quantityNeeded = 1) {
  db.run(
    'INSERT INTO tracked_item_requirements (tracked_item_id, required_item_id, quantity_needed) VALUES (?, ?, ?)',
    [trackedItemId, requiredItemId, quantityNeeded]
  );
  saveDatabase();
  return { changes: 1 };
}

function getTrackedItemRequirements(trackedItemId) {
  const result = db.exec(`
    SELECT r.*, i.name, i.type, i.rarity, i.image_url,
           COALESCE(inv.quantity, 0) as owned_quantity
    FROM tracked_item_requirements r
    JOIN items i ON r.required_item_id = i.id
    LEFT JOIN inventory inv ON r.required_item_id = inv.item_id
    WHERE r.tracked_item_id = ?
    ORDER BY i.name
  `, [trackedItemId]);
  
  if (result.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const item = {};
    columns.forEach((col, idx) => {
      item[col] = values[idx];
    });
    return item;
  });
}

function removeTrackedItemRequirement(requirementId) {
  db.run('DELETE FROM tracked_item_requirements WHERE id = ?', [requirementId]);
  saveDatabase();
  return { changes: 1 };
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
  // Inventory
  addToInventory,
  removeFromInventory,
  getInventory,
  updateInventoryQuantity,
  // Tracked items
  addTrackedItem,
  removeTrackedItem,
  markTrackedItemCompleted,
  getAllTrackedItems,
  addTrackedItemRequirement,
  getTrackedItemRequirements,
  removeTrackedItemRequirement,
};
