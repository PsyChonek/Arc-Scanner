import React, { useState, useEffect } from 'react';
import {
  loadHideoutModules,
  loadProjects,
  loadQuests,
  loadItemsWithRecipes,
  hideoutModuleToTrackable,
  projectPhaseToTrackable,
  questToTrackable,
  itemRecipeToTrackable
} from '../utils/arcRaidersLoader';

// Small component to show requirements summary inline
function RequirementsSummary({ trackedItemId, inventory, allItems }) {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequirements();
  }, [trackedItemId]);

  const loadRequirements = async () => {
    try {
      const reqs = await window.electronAPI.getTrackedItemRequirements(trackedItemId);
      setRequirements(reqs);
    } catch (error) {
      console.error('Error loading requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || requirements.length === 0) return null;

  const fulfilled = requirements.filter(req => req.owned_quantity >= req.quantity_needed).length;
  const total = requirements.length;

  return (
    <div className="text-xs text-gray-600 mt-1">
      Requirements: {fulfilled}/{total} fulfilled
      {fulfilled < total && (
        <span className="ml-2 text-red-600">
          ({requirements.filter(req => req.owned_quantity < req.quantity_needed)
            .map(req => {
              const item = allItems.find(i => i.id === req.required_item_id);
              return item ? `${req.quantity_needed - req.owned_quantity}x ${item.name}` : null;
            })
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')})
          {requirements.filter(req => req.owned_quantity < req.quantity_needed).length > 2 && '...'}
        </span>
      )}
    </div>
  );
}

function TrackerPage() {
  const [trackedItems, setTrackedItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTrackedItem, setNewTrackedItem] = useState({
    itemId: '',
    name: '',
    type: 'upgrade',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tracked, inv, items] = await Promise.all([
        window.electronAPI.getAllTrackedItems(),
        window.electronAPI.getInventory(),
        window.electronAPI.getAllItems()
      ]);
      
      setTrackedItems(tracked);
      setInventory(inv);
      setAllItems(items);
    } catch (error) {
      console.error('Error loading tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrackedItem = async () => {
    if (!newTrackedItem.name) {
      setErrorMessage('Please enter a name for the tracked item');
      return;
    }

    try {
      await window.electronAPI.addTrackedItem(
        newTrackedItem.itemId,
        newTrackedItem.name,
        newTrackedItem.type,
        newTrackedItem.notes
      );
      
      setShowAddModal(false);
      setNewTrackedItem({ itemId: '', name: '', type: 'upgrade', notes: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding tracked item:', error);
      setErrorMessage('Failed to add tracked item');
    }
  };

  const handleToggleCompleted = async (trackedItemId, currentStatus) => {
    try {
      await window.electronAPI.markTrackedItemCompleted(trackedItemId, !currentStatus);
      await loadData();
    } catch (error) {
      console.error('Error toggling completion status:', error);
      setErrorMessage('Failed to update completion status');
    }
  };

  const handleRemoveTrackedItem = async (trackedItemId) => {
    setShowDeleteConfirm(trackedItemId);
  };

  const confirmRemoveTrackedItem = async () => {
    if (!showDeleteConfirm) return;

    try {
      await window.electronAPI.removeTrackedItem(showDeleteConfirm);
      setShowDeleteConfirm(null);
      await loadData();
    } catch (error) {
      console.error('Error removing tracked item:', error);
      setErrorMessage('Failed to remove tracked item');
    }
  };

  const handleAddToInventory = async (itemId) => {
    try {
      await window.electronAPI.addToInventory(itemId, 1);
      await loadData();
    } catch (error) {
      console.error('Error adding to inventory:', error);
      setErrorMessage('Failed to add item to inventory');
    }
  };

  const handleRemoveFromInventory = async (itemId) => {
    try {
      await window.electronAPI.removeFromInventory(itemId);
      await loadData();
    } catch (error) {
      console.error('Error removing from inventory:', error);
      setErrorMessage('Failed to remove item from inventory');
    }
  };

  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      await window.electronAPI.updateInventoryQuantity(itemId, parseInt(quantity));
      await loadData();
    } catch (error) {
      console.error('Error updating quantity:', error);
      setErrorMessage('Failed to update quantity');
    }
  };

  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isInInventory = (itemId) => {
    return inventory.some(inv => inv.id === itemId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-gray-600">Loading tracker...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Tracked Items Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Tracked Upgrades & Quests</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBrowseModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                >
                  📚 Browse Game Data
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  + Add Custom
                </button>
              </div>
            </div>

            {trackedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No tracked items yet</p>
                <p className="text-sm mt-2">Click "Add Tracked Item" to start tracking upgrades and quests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trackedItems.map(item => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 transition-all ${
                      item.completed
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleCompleted(item.id, item.completed)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className={`text-lg font-semibold ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {item.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              item.type === 'quest' ? 'bg-purple-100 text-purple-800' : 
                              item.type === 'hideout_upgrade' ? 'bg-orange-100 text-orange-800' :
                              item.type === 'project' ? 'bg-teal-100 text-teal-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {item.type === 'hideout_upgrade' ? 'hideout' : item.type}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                          )}
                          <RequirementsSummary trackedItemId={item.id} inventory={inventory} allItems={allItems} />
                          {item.completed && item.completed_at && (
                            <p className="text-xs text-green-600 mt-1">
                              Completed: {new Date(item.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowRequirementsModal(item)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        >
                          Requirements
                        </button>
                        <button
                          onClick={() => handleRemoveTrackedItem(item.id)}
                          className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Inventory</h2>
              
              {/* Search and Add */}
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search items to add..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchTerm && filteredItems.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredItems.slice(0, 20).map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            handleAddToInventory(item.id);
                            setSearchTerm('');
                          }}
                          disabled={isInInventory(item.id)}
                          className={`w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                            isInInventory(item.id) ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-xs text-gray-500">{item.type}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {inventory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">Your inventory is empty</p>
                <p className="text-sm mt-2">Search and add items you own</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map(item => (
                  <div key={item.id} className="border border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.type}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromInventory(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Remove from inventory"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Quantity:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Tracked Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Tracked Item</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newTrackedItem.name}
                  onChange={(e) => setNewTrackedItem({ ...newTrackedItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Upgrade Hideout Module"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                <select
                  value={newTrackedItem.type}
                  onChange={(e) => setNewTrackedItem({ ...newTrackedItem, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="upgrade">Upgrade</option>
                  <option value="quest">Quest</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newTrackedItem.notes}
                  onChange={(e) => setNewTrackedItem({ ...newTrackedItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddTrackedItem}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Deletion</h2>
            <p className="text-gray-700 mb-6">Are you sure you want to remove this tracked item? This action cannot be undone.</p>
            
            <div className="flex space-x-3">
              <button
                onClick={confirmRemoveTrackedItem}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center space-x-2">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-white hover:text-gray-200 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Browse Game Data Modal */}
      {showBrowseModal && (
        <BrowseGameDataModal
          onClose={() => setShowBrowseModal(false)}
          onSelect={async (trackableItem) => {
            try {
              console.log('Adding tracked item:', trackableItem);
              
              // Add the tracked item
              const trackedId = await window.electronAPI.addTrackedItem(
                trackableItem.itemId,
                trackableItem.name,
                trackableItem.type,
                trackableItem.notes
              );
              
              console.log('Tracked ID:', trackedId);
              console.log('Requirements to add:', trackableItem.requirements);
              
              // Add all requirements automatically
              if (trackableItem.requirements && trackableItem.requirements.length > 0) {
                for (const req of trackableItem.requirements) {
                  console.log('Adding requirement:', req);
                  await window.electronAPI.addTrackedItemRequirement(
                    trackedId,
                    req.itemId,
                    req.quantity
                  );
                }
              } else {
                console.warn('No requirements found for tracked item');
              }
              
              setShowBrowseModal(false);
              await loadData();
            } catch (error) {
              console.error('Error adding tracked item from game data:', error);
              setErrorMessage('Failed to add tracked item');
            }
          }}
          allItems={allItems}
        />
      )}

      {/* Requirements Modal */}
      {showRequirementsModal && (
        <RequirementsModal
          trackedItem={showRequirementsModal}
          onClose={() => setShowRequirementsModal(null)}
          onUpdate={loadData}
          allItems={allItems}
          inventory={inventory}
        />
      )}
    </div>
  );
}

function RequirementsModal({ trackedItem, onClose, onUpdate, allItems, inventory }) {
  const [requirements, setRequirements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequirements();
  }, [trackedItem.id]);

  const loadRequirements = async () => {
    try {
      const reqs = await window.electronAPI.getTrackedItemRequirements(trackedItem.id);
      setRequirements(reqs);
    } catch (error) {
      console.error('Error loading requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequirement = async (itemId) => {
    try {
      await window.electronAPI.addTrackedItemRequirement(trackedItem.id, itemId, 1);
      await loadRequirements();
      await onUpdate();
      setSearchTerm('');
    } catch (error) {
      console.error('Error adding requirement:', error);
    }
  };

  const handleRemoveRequirement = async (requirementId) => {
    try {
      await window.electronAPI.removeTrackedItemRequirement(requirementId);
      await loadRequirements();
      await onUpdate();
    } catch (error) {
      console.error('Error removing requirement:', error);
    }
  };

  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !requirements.some(req => req.required_item_id === item.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Requirements: {trackedItem.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
        </div>

        <div className="p-6">
          {/* Add Requirements Search */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Add Required Items</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && filteredItems.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredItems.slice(0, 20).map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAddRequirement(item.id)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-gray-500">{item.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Requirements List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Items</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : requirements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No requirements added yet</p>
                <p className="text-sm mt-1">Search and add items needed for this {trackedItem.type}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requirements.map(req => {
                  const hasEnough = req.owned_quantity >= req.quantity_needed;
                  return (
                    <div key={req.id} className={`border rounded-lg p-3 ${hasEnough ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{req.name}</span>
                            {hasEnough && <span className="text-green-600 text-sm">✓</span>}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Need: <span className="font-semibold">{req.quantity_needed}</span> | 
                            Own: <span className={`font-semibold ${hasEnough ? 'text-green-600' : 'text-red-600'}`}>{req.owned_quantity}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveRequirement(req.id)}
                          className="text-red-500 hover:text-red-700 transition-colors ml-4"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BrowseGameDataModal({ onClose, onSelect, allItems }) {
  const [activeTab, setActiveTab] = useState('hideout');
  const [loading, setLoading] = useState(true);
  const [hideoutModules, setHideoutModules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [quests, setQuests] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      const [hideout, proj, quest, rec] = await Promise.all([
        loadHideoutModules(),
        loadProjects(),
        loadQuests(),
        loadItemsWithRecipes()
      ]);
      
      setHideoutModules(hideout);
      setProjects(proj);
      setQuests(quest);
      setRecipes(rec);
    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHideoutLevel = (module, level) => {
    const trackable = hideoutModuleToTrackable(module, level);
    if (trackable) {
      onSelect(trackable);
    }
  };

  const handleSelectProjectPhase = (project, phase) => {
    const trackable = projectPhaseToTrackable(project, phase);
    if (trackable) {
      onSelect(trackable);
    }
  };

  const handleSelectQuest = (quest) => {
    const trackable = questToTrackable(quest);
    if (trackable) {
      onSelect(trackable);
    }
  };

  const handleSelectRecipe = (item) => {
    const trackable = itemRecipeToTrackable(item);
    if (trackable) {
      onSelect(trackable);
    }
  };

  const filteredQuests = quests.filter(q =>
    q.name.toLowerCase().includes(searchFilter.toLowerCase()) &&
    q.requiredItemIds && q.requiredItemIds.length > 0
  );

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-bold text-gray-900">Browse Game Data</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('hideout')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'hideout'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hideout Modules
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'projects'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveTab('quests')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'quests'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quests
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'recipes'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Item Recipes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading game data...</div>
          ) : (
            <>
              {activeTab === 'hideout' && (
                <div className="space-y-4">
                  {hideoutModules.map(module => {
                    // Filter levels with requirements
                    const levelsWithReqs = module.levels.filter(l => 
                      l.level > 0 && l.requirementItemIds && l.requirementItemIds.length > 0
                    );
                    
                    // Skip module if no levels have requirements
                    if (levelsWithReqs.length === 0) return null;
                    
                    return (
                      <div key={module.id} className="border border-gray-300 rounded-lg p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{module.name}</h3>
                        <div className="space-y-2">
                          {levelsWithReqs.map(level => (
                            <button
                              key={level.level}
                              onClick={() => handleSelectHideoutLevel(module, level.level)}
                              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-semibold">Level {level.level}</span>
                                <span className="text-sm text-gray-600">
                                  {level.requirementItemIds?.length || 0} requirements
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {level.requirementItemIds.slice(0, 3).map(req => {
                                  const item = allItems.find(i => i.id === req.itemId);
                                  return item ? `${req.quantity}x ${item.name}` : null;
                                }).filter(Boolean).join(', ')}
                                {level.requirementItemIds.length > 3 && '...'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-4">
                  {projects.map(project => {
                    // Filter phases with requirements
                    const phasesWithReqs = project.phases.filter(phase =>
                      phase.requirementItemIds && phase.requirementItemIds.length > 0
                    );
                    
                    // Skip project if no phases have requirements
                    if (phasesWithReqs.length === 0) return null;
                    
                    return (
                      <div key={project.id} className="border border-gray-300 rounded-lg p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                        )}
                        <div className="space-y-2">
                          {phasesWithReqs.map(phase => (
                            <button
                              key={phase.phase}
                              onClick={() => handleSelectProjectPhase(project, phase.phase)}
                              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-semibold">Phase {phase.phase}: {phase.name}</span>
                                <span className="text-sm text-gray-600">
                                  {phase.requirementItemIds?.length || 0} requirements
                                </span>
                              </div>
                              {phase.description && (
                                <div className="text-xs text-gray-500 mt-1">{phase.description}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}

              {activeTab === 'quests' && (
                <div>
                  <div className="mb-4">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search quests..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    {filteredQuests.map(quest => (
                      <button
                        key={quest.id}
                        onClick={() => handleSelectQuest(quest)}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{quest.name}</div>
                            {quest.trader && (
                              <div className="text-xs text-gray-500">Trader: {quest.trader}</div>
                            )}
                            {quest.requiredItemIds && quest.requiredItemIds.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                Requires: {quest.requiredItemIds.map(req => {
                                  const item = allItems.find(i => i.id === req.itemId);
                                  return item ? `${req.quantity}x ${item.name}` : null;
                                }).filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-gray-600 ml-2">
                            {quest.requiredItemIds?.length || 0} items
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'recipes' && (
                <div>
                  <div className="mb-4">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search items..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    {filteredRecipes.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectRecipe(item)}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Recycles into: {Object.entries(item.recyclesInto).map(([id, qty]) => {
                                const targetItem = allItems.find(i => i.id === id);
                                return targetItem ? `${qty}x ${targetItem.name}` : null;
                              }).filter(Boolean).join(', ')}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrackerPage;
