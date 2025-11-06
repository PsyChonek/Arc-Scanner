const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
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
  getUserData 
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
    const GITHUB_API_BASE = 'https://api.github.com';
    const REPO_OWNER = 'RaidTheory';
    const REPO_NAME = 'arcraiders-data';
    const DATA_PATH = 'data';
    
    // Get the list of files in the data directory
    const filesUrl = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`;
    const files = await httpsGet(filesUrl);
    
    // Look for items.json or similar files
    const itemsFile = files.find(file => 
      file.name.toLowerCase().includes('item') && file.name.endsWith('.json')
    );
    
    if (!itemsFile) {
      return { success: false, error: 'No items file found in repository' };
    }
    
    // Fetch the items file content
    const itemsData = await httpsGet(itemsFile.download_url);
    
    return { success: true, data: itemsData };
  } catch (error) {
    console.error('Error fetching Arc Raiders data:', error);
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
