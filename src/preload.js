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
});

