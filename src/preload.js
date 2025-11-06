// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Item operations
  addItem: (item) => ipcRenderer.invoke('db:addItem', item),
  getItem: (id) => ipcRenderer.invoke('db:getItem', id),
  getAllItems: () => ipcRenderer.invoke('db:getAllItems'),
  
  // Relation operations
  addRelation: (relation) => ipcRenderer.invoke('db:addRelation', relation),
  getRelationsForItem: (itemId) => ipcRenderer.invoke('db:getRelationsForItem', itemId),
  getAllRelations: () => ipcRenderer.invoke('db:getAllRelations'),
  
  // User data operations
  setUserData: (key, value) => ipcRenderer.invoke('db:setUserData', key, value),
  getUserData: (key) => ipcRenderer.invoke('db:getUserData', key),
  
  // Inventory operations
  addToInventory: (itemId, quantity) => ipcRenderer.invoke('db:addToInventory', itemId, quantity),
  removeFromInventory: (itemId) => ipcRenderer.invoke('db:removeFromInventory', itemId),
  getInventory: () => ipcRenderer.invoke('db:getInventory'),
  updateInventoryQuantity: (itemId, quantity) => ipcRenderer.invoke('db:updateInventoryQuantity', itemId, quantity),
  
  // Tracked items operations
  addTrackedItem: (itemId, name, type, notes) => ipcRenderer.invoke('db:addTrackedItem', itemId, name, type, notes),
  removeTrackedItem: (trackedItemId) => ipcRenderer.invoke('db:removeTrackedItem', trackedItemId),
  markTrackedItemCompleted: (trackedItemId, completed) => ipcRenderer.invoke('db:markTrackedItemCompleted', trackedItemId, completed),
  getAllTrackedItems: () => ipcRenderer.invoke('db:getAllTrackedItems'),
  addTrackedItemRequirement: (trackedItemId, requiredItemId, quantityNeeded) => ipcRenderer.invoke('db:addTrackedItemRequirement', trackedItemId, requiredItemId, quantityNeeded),
  getTrackedItemRequirements: (trackedItemId) => ipcRenderer.invoke('db:getTrackedItemRequirements', trackedItemId),
  removeTrackedItemRequirement: (requirementId) => ipcRenderer.invoke('db:removeTrackedItemRequirement', requirementId),
  
  // Arc Raiders data operations
  fetchArcRaidersData: () => ipcRenderer.invoke('arc:fetchData'),
});

