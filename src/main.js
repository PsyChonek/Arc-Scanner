const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const https = require('https');
const { 
  initDatabase, 
  closeDatabase, 
  addItem, 
  getItem, 
  getAllItems, 
  addRelation, 
  getRelationsForItem, 
  getAllRelations,
  setUserData,
  getUserData,
  addToInventory,
  removeFromInventory,
  getInventory,
  updateInventoryQuantity,
  addTrackedItem,
  removeTrackedItem,
  markTrackedItemCompleted,
  getAllTrackedItems,
  addTrackedItemRequirement,
  getTrackedItemRequirements,
  removeTrackedItemRequirement
} = require('./database');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// IPC handlers for database operations
ipcMain.handle('db:addItem', async (event, item) => {
  return addItem(item);
});

ipcMain.handle('db:getItem', async (event, id) => {
  return getItem(id);
});

ipcMain.handle('db:getAllItems', async () => {
  return getAllItems();
});

ipcMain.handle('db:addRelation', async (event, relation) => {
  return addRelation(relation);
});

ipcMain.handle('db:getRelationsForItem', async (event, itemId) => {
  return getRelationsForItem(itemId);
});

ipcMain.handle('db:getAllRelations', async () => {
  return getAllRelations();
});

ipcMain.handle('db:setUserData', async (event, key, value) => {
  return setUserData(key, value);
});

ipcMain.handle('db:getUserData', async (event, key) => {
  return getUserData(key);
});

// Inventory IPC handlers
ipcMain.handle('db:addToInventory', async (event, itemId, quantity) => {
  return addToInventory(itemId, quantity);
});

ipcMain.handle('db:removeFromInventory', async (event, itemId) => {
  return removeFromInventory(itemId);
});

ipcMain.handle('db:getInventory', async () => {
  return getInventory();
});

ipcMain.handle('db:updateInventoryQuantity', async (event, itemId, quantity) => {
  return updateInventoryQuantity(itemId, quantity);
});

// Tracked items IPC handlers
ipcMain.handle('db:addTrackedItem', async (event, itemId, name, type, notes) => {
  return addTrackedItem(itemId, name, type, notes);
});

ipcMain.handle('db:removeTrackedItem', async (event, trackedItemId) => {
  return removeTrackedItem(trackedItemId);
});

ipcMain.handle('db:markTrackedItemCompleted', async (event, trackedItemId, completed) => {
  return markTrackedItemCompleted(trackedItemId, completed);
});

ipcMain.handle('db:getAllTrackedItems', async () => {
  return getAllTrackedItems();
});

ipcMain.handle('db:addTrackedItemRequirement', async (event, trackedItemId, requiredItemId, quantityNeeded) => {
  return addTrackedItemRequirement(trackedItemId, requiredItemId, quantityNeeded);
});

ipcMain.handle('db:getTrackedItemRequirements', async (event, trackedItemId) => {
  return getTrackedItemRequirements(trackedItemId);
});

ipcMain.handle('db:removeTrackedItemRequirement', async (event, requirementId) => {
  return removeTrackedItemRequirement(requirementId);
});

// Helper function to make HTTPS requests
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Arc-Scanner-App'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', reject);
  });
}

// IPC handler for fetching Arc Raiders data
ipcMain.handle('arc:fetchData', async () => {
  try {
    // Load Arc Raiders data from bundled assets
    // In development: assets/ is in the project root
    // In production: assets/ is copied to app.getAppPath()/assets or process.resourcesPath/assets
    let dataPath;
    
    if (app.isPackaged) {
      // Production: assets are in the resources directory
      dataPath = path.join(process.resourcesPath, 'assets/arcraiders-data-main/items.json');
    } else {
      // Development: assets are in the project root
      dataPath = path.join(__dirname, '../assets/arcraiders-data-main/items.json');
    }
    
    console.log('Looking for Arc Raiders data at:', dataPath);
    
    if (!fs.existsSync(dataPath)) {
      console.error('Arc Raiders data file not found at:', dataPath);
      return { 
        success: false, 
        error: `Arc Raiders data file not found at: ${dataPath}. Please ensure assets/arcraiders-data-main/items.json exists.` 
      };
    }
    
    // Read and parse the items.json file
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const itemsData = JSON.parse(fileContent);
    
    // Transform imageFilename from URL to local path
    const transformedData = itemsData.map(item => {
      const transformed = { ...item };
      
      // Replace image URL with local path to assets
      if (transformed.imageFilename && transformed.imageFilename.includes('cdn.arctracker.io')) {
        // Extract filename from URL (e.g., "fabric.png")
        const filename = transformed.imageFilename.split('/').pop();
        // Point to local images/items directory
        if (app.isPackaged) {
          transformed.imageFilename = path.join(process.resourcesPath, `assets/arcraiders-data-main/images/items/${filename}`);
        } else {
          transformed.imageFilename = `assets/arcraiders-data-main/images/items/${filename}`;
        }
      }
      
      return transformed;
    });
    
    console.log(`Loaded ${transformedData.length} items from Arc Raiders data`);
    
    return { 
      success: true, 
      data: transformedData,
      note: `Loaded ${transformedData.length} items from Arc Raiders community data`
    };
  } catch (error) {
    console.error('Error loading Arc Raiders data:', error);
    return { success: false, error: error.message };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize database (now async)
  await initDatabase();
  
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Close database when app quits
app.on('before-quit', () => {
  closeDatabase();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
