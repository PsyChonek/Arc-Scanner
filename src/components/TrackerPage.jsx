import React, { useState, useEffect, useMemo } from 'react';
import {
  loadHideoutModules,
  loadProjects,
  loadQuests,
  loadItemsWithRecipes,
  hideoutModuleToTrackable,
  projectPhaseToTrackable,
  questToTrackable,
  itemRecipeToTrackable,
  prepareAutoTrackingItems
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

// Component to show all items needed across all tracked items
const ConsolidatedRequirementsPanel = React.memo(function ConsolidatedRequirementsPanel({ trackedItems, allItems, inventory }) {
  const [consolidatedReqs, setConsolidatedReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('shortage'); // 'shortage', 'name', 'quantity'

  useEffect(() => {
    loadConsolidatedRequirements();
  }, [trackedItems]);

  // Separate effect for sorting to avoid full reload
  useEffect(() => {
    if (consolidatedReqs.length > 0) {
      sortRequirements();
    }
  }, [sortBy]);

  const sortRequirements = () => {
    setConsolidatedReqs(prev => {
      const sorted = [...prev];

      if (sortBy === 'shortage') {
        sorted.sort((a, b) => {
          const shortageA = Math.max(0, a.quantity_needed - a.owned_quantity);
          const shortageB = Math.max(0, b.quantity_needed - b.owned_quantity);
          return shortageB - shortageA;
        });
      } else if (sortBy === 'name') {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === 'quantity') {
        sorted.sort((a, b) => b.quantity_needed - a.quantity_needed);
      }

      return sorted;
    });
  };

  const loadConsolidatedRequirements = async () => {
    try {
      // Only show loading on initial load
      if (consolidatedReqs.length === 0) {
        setLoading(true);
      }

      const reqsMap = new Map();

      // Load requirements for all active (non-completed) tracked items
      for (const trackedItem of trackedItems.filter(t => !t.completed)) {
        const reqs = await window.electronAPI.getTrackedItemRequirements(trackedItem.id);

        for (const req of reqs) {
          const existing = reqsMap.get(req.required_item_id);
          if (existing) {
            existing.quantity_needed += req.quantity_needed;
          } else {
            reqsMap.set(req.required_item_id, {
              item_id: req.required_item_id,
              name: req.name,
              type: req.type,
              rarity: req.rarity,
              image_url: req.image_url,
              quantity_needed: req.quantity_needed,
              owned_quantity: req.owned_quantity
            });
          }
        }
      }

      let consolidated = Array.from(reqsMap.values());

      // Apply current sort
      if (sortBy === 'shortage') {
        consolidated.sort((a, b) => {
          const shortageA = Math.max(0, a.quantity_needed - a.owned_quantity);
          const shortageB = Math.max(0, b.quantity_needed - b.owned_quantity);
          return shortageB - shortageA;
        });
      } else if (sortBy === 'name') {
        consolidated.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === 'quantity') {
        consolidated.sort((a, b) => b.quantity_needed - a.quantity_needed);
      }

      setConsolidatedReqs(consolidated);
    } catch (error) {
      console.error('Error loading consolidated requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading requirements...
      </div>
    );
  }

  if (consolidatedReqs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No requirements found</p>
        <p className="text-sm mt-1">Add tracked items to see what materials you need</p>
      </div>
    );
  }

  const totalNeeded = consolidatedReqs.reduce((sum, req) => sum + req.quantity_needed, 0);
  const totalOwned = consolidatedReqs.reduce((sum, req) => sum + req.owned_quantity, 0);
  const totalShortage = consolidatedReqs.reduce((sum, req) =>
    sum + Math.max(0, req.quantity_needed - req.owned_quantity), 0
  );
  const fulfilledCount = consolidatedReqs.filter(req => req.owned_quantity >= req.quantity_needed).length;

  return (
    <div>
      {/* Summary Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{consolidatedReqs.length}</div>
          <div className="text-xs text-blue-600">Unique Items</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{fulfilledCount}</div>
          <div className="text-xs text-green-600">Fulfilled</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{totalShortage}</div>
          <div className="text-xs text-red-600">Items Short</div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-semibold text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="shortage">Shortage (High to Low)</option>
            <option value="quantity">Quantity Needed</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {consolidatedReqs.map((req, index) => {
          const shortage = Math.max(0, req.quantity_needed - req.owned_quantity);
          const hasEnough = req.owned_quantity >= req.quantity_needed;

          return (
            <div
              key={req.item_id}
              className={`border rounded-lg p-3 transition-all duration-300 transform hover:scale-102 ${
                hasEnough ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'
              }`}
              style={{
                animation: `fadeIn 0.3s ease-out ${index * 0.03}s both`
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{req.name}</span>
                    {hasEnough && <span className="text-green-600 text-sm transition-opacity duration-300">✓</span>}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Need: <span className="font-semibold transition-all duration-300">{req.quantity_needed}</span> |
                    Own: <span className={`font-semibold transition-all duration-300 ${hasEnough ? 'text-green-600' : 'text-gray-900'}`}>
                      {req.owned_quantity}
                    </span>
                    {shortage > 0 && (
                      <span className="ml-2 text-red-600 font-semibold transition-all duration-300">
                        (Short {shortage})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

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
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [autoTrackingStatus, setAutoTrackingStatus] = useState(null);
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [trackedItemsFilter, setTrackedItemsFilter] = useState({
    type: 'all', // 'all', 'hideout_upgrade', 'project', 'quest', 'upgrade', 'recipe'
    status: 'all' // 'all', 'active', 'completed'
  });
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
      // Close modal and reset form immediately for better UX
      setShowAddModal(false);
      setNewTrackedItem({ itemId: '', name: '', type: 'upgrade', notes: '' });

      // Add the tracked item to database
      await window.electronAPI.addTrackedItem(
        newTrackedItem.itemId,
        newTrackedItem.name,
        newTrackedItem.type,
        newTrackedItem.notes
      );

      // Reload data to ensure consistency (without showing loading state)
      const [tracked, inv, items] = await Promise.all([
        window.electronAPI.getAllTrackedItems(),
        window.electronAPI.getInventory(),
        window.electronAPI.getAllItems()
      ]);

      setTrackedItems(tracked);
      setInventory(inv);
      setAllItems(items);
    } catch (error) {
      console.error('Error adding tracked item:', error);
      setErrorMessage('Failed to add tracked item');
      // Reload on error to ensure consistency
      await loadData();
    }
  };

  const handleToggleCompleted = async (trackedItemId, currentStatus) => {
    try {
      // Update the UI optimistically
      setTrackedItems(prev =>
        prev.map(item =>
          item.id === trackedItemId
            ? { ...item, completed: !currentStatus, completed_at: !currentStatus ? new Date().toISOString() : null }
            : item
        )
      );

      // Then update the database in the background
      await window.electronAPI.markTrackedItemCompleted(trackedItemId, !currentStatus);

      // Reload data to ensure consistency (without showing loading state)
      const [tracked, inv, items] = await Promise.all([
        window.electronAPI.getAllTrackedItems(),
        window.electronAPI.getInventory(),
        window.electronAPI.getAllItems()
      ]);

      setTrackedItems(tracked);
      setInventory(inv);
      setAllItems(items);
    } catch (error) {
      console.error('Error toggling completion status:', error);
      setErrorMessage('Failed to update completion status');
      // Reload on error to revert optimistic update
      await loadData();
    }
  };

  const handleRemoveTrackedItem = async (trackedItemId) => {
    setShowDeleteConfirm(trackedItemId);
  };

  const confirmRemoveTrackedItem = async () => {
    if (!showDeleteConfirm) return;

    try {
      const itemIdToRemove = showDeleteConfirm;

      // Close modal and update UI optimistically
      setShowDeleteConfirm(null);
      setTrackedItems(prev => prev.filter(item => item.id !== itemIdToRemove));

      // Then update the database in the background
      await window.electronAPI.removeTrackedItem(itemIdToRemove);

      // Reload data to ensure consistency (without showing loading state)
      const [tracked, inv, items] = await Promise.all([
        window.electronAPI.getAllTrackedItems(),
        window.electronAPI.getInventory(),
        window.electronAPI.getAllItems()
      ]);

      setTrackedItems(tracked);
      setInventory(inv);
      setAllItems(items);
    } catch (error) {
      console.error('Error removing tracked item:', error);
      setErrorMessage('Failed to remove tracked item');
      // Reload on error to revert optimistic update
      await loadData();
    }
  };

  const handleAddToInventory = async (itemId) => {
    try {
      // Find the item details
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      // Update the UI optimistically
      setInventory(prev => [...prev, { ...item, quantity: 1 }]);

      // Then update the database in the background
      await window.electronAPI.addToInventory(itemId, 1);

      // Reload data to ensure consistency (without showing loading state)
      const [tracked, inv, items] = await Promise.all([
        window.electronAPI.getAllTrackedItems(),
        window.electronAPI.getInventory(),
        window.electronAPI.getAllItems()
      ]);

      setTrackedItems(tracked);
      setInventory(inv);
      setAllItems(items);
    } catch (error) {
      console.error('Error adding to inventory:', error);
      setErrorMessage('Failed to add item to inventory');
      // Reload on error to revert optimistic update
      await loadData();
    }
  };

  const handleRemoveFromInventory = async (itemId) => {
    try {
      // Update the UI optimistically
      setInventory(prev => prev.filter(item => item.id !== itemId));

      // Then update the database in the background
      await window.electronAPI.removeFromInventory(itemId);

      // Reload data to ensure consistency (without showing loading state)
      const [tracked, inv, items] = await Promise.all([
        window.electronAPI.getAllTrackedItems(),
        window.electronAPI.getInventory(),
        window.electronAPI.getAllItems()
      ]);

      setTrackedItems(tracked);
      setInventory(inv);
      setAllItems(items);
    } catch (error) {
      console.error('Error removing from inventory:', error);
      setErrorMessage('Failed to remove item from inventory');
      // Reload on error to revert optimistic update
      await loadData();
    }
  };

  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      // Update the UI optimistically
      setInventory(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity: parseInt(quantity) } : item
        )
      );

      // Then update the database in the background
      await window.electronAPI.updateInventoryQuantity(itemId, parseInt(quantity));

      // Reload data to ensure consistency (without showing loading state)
      const [tracked, inv, items] = await Promise.all([
        window.electronAPI.getAllTrackedItems(),
        window.electronAPI.getInventory(),
        window.electronAPI.getAllItems()
      ]);

      setTrackedItems(tracked);
      setInventory(inv);
      setAllItems(items);
    } catch (error) {
      console.error('Error updating quantity:', error);
      setErrorMessage('Failed to update quantity');
      // Reload on error to revert optimistic update
      await loadData();
    }
  };

  const handleAutoTrackGameProgression = async () => {
    try {
      setIsAutoTracking(true);
      setAutoTrackingStatus(null);

      console.log('Starting auto-tracking of game progression items...');

      // Prepare all trackable items
      const trackableItems = await prepareAutoTrackingItems();

      console.log(`Prepared ${trackableItems.length} items for auto-tracking`);

      if (trackableItems.length === 0) {
        setAutoTrackingStatus({
          success: true,
          message: 'No game progression items found to track'
        });
        return;
      }

      // Add them to the database
      const result = await window.electronAPI.autoTrackGameProgressionItems(trackableItems);

      console.log('Auto-tracking result:', result);

      setAutoTrackingStatus({
        success: true,
        message: `Auto-tracked ${result.added} items (${result.skipped} already tracked)`
      });

      // Reload the tracked items (without showing loading state)
      const [tracked, inv, items] = await Promise.all([
        window.electronAPI.getAllTrackedItems(),
        window.electronAPI.getInventory(),
        window.electronAPI.getAllItems()
      ]);

      setTrackedItems(tracked);
      setInventory(inv);
      setAllItems(items);
    } catch (error) {
      console.error('Error auto-tracking game progression:', error);
      setAutoTrackingStatus({
        success: false,
        message: `Failed to auto-track: ${error.message}`
      });
      setErrorMessage('Failed to auto-track game progression items');
    } finally {
      setIsAutoTracking(false);
      // Clear status after 5 seconds
      setTimeout(() => setAutoTrackingStatus(null), 5000);
    }
  };

  // Filter tracked items by search and filters (memoized)
  const filteredTrackedItems = useMemo(() => {
    return trackedItems.filter(item => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Type filter
      const matchesType = trackedItemsFilter.type === 'all' || item.type === trackedItemsFilter.type;

      // Status filter
      const matchesStatus = trackedItemsFilter.status === 'all' ||
        (trackedItemsFilter.status === 'active' && !item.completed) ||
        (trackedItemsFilter.status === 'completed' && item.completed);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [trackedItems, searchTerm, trackedItemsFilter]);

  // Filter inventory items for the search dropdown (memoized)
  const filteredInventoryItems = useMemo(() => {
    return allItems.filter(item =>
      item.name.toLowerCase().includes(inventorySearchTerm.toLowerCase())
    );
  }, [allItems, inventorySearchTerm]);

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
    <>
      {/* CSS Animations */}
      <style>{`
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-20px);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        /* Smooth scrolling for lists */
        .space-y-3, .space-y-2 {
          scroll-behavior: smooth;
        }
      `}</style>

      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Tracked Items (2/3 width on large screens) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tracked Items Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Tracked Upgrades & Quests</h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleAutoTrackGameProgression}
                  disabled={isAutoTracking}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    isAutoTracking
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  } text-white`}
                >
                  {isAutoTracking ? 'Auto-Tracking...' : '⚡ Auto-Track All'}
                </button>
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

            {/* Auto-tracking Status */}
            {autoTrackingStatus && (
              <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
                autoTrackingStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {autoTrackingStatus.message}
              </div>
            )}

            {/* Search and Filters */}
            <div className="mb-4 space-y-3">
              {/* Search Bar */}
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tracked items..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                {/* Type Filter */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-semibold text-gray-700">Type:</label>
                  <select
                    value={trackedItemsFilter.type}
                    onChange={(e) => setTrackedItemsFilter({ ...trackedItemsFilter, type: e.target.value })}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="hideout_upgrade">Hideout</option>
                    <option value="project">Projects</option>
                    <option value="quest">Quests</option>
                    <option value="upgrade">Upgrades</option>
                    <option value="recipe">Recipes</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-semibold text-gray-700">Status:</label>
                  <select
                    value={trackedItemsFilter.status}
                    onChange={(e) => setTrackedItemsFilter({ ...trackedItemsFilter, status: e.target.value })}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Results Count */}
                <div className="flex items-center text-sm text-gray-600 ml-auto">
                  Showing {filteredTrackedItems.length} of {trackedItems.length} items
                </div>
              </div>
            </div>

            {trackedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No tracked items yet</p>
                <p className="text-sm mt-2">Click "Auto-Track All" or "Browse Game Data" to start tracking</p>
              </div>
            ) : filteredTrackedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No items match your filters</p>
                <p className="text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTrackedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 transition-all duration-300 ease-in-out transform ${
                      item.completed
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}
                    style={{
                      animation: `slideInFromRight 0.3s ease-out ${index * 0.05}s both`
                    }}
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
                          {item.completed === 1 && item.completed_at && item.completed_at !== '0' && (
                            <p className="text-xs text-green-600 mt-1">
                              Completed: {new Date(item.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowRequirementsModal(item)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-all duration-200 hover:scale-105"
                        >
                          Requirements
                        </button>
                        <button
                          onClick={() => handleRemoveTrackedItem(item.id)}
                          className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-all duration-200 hover:scale-105 active:scale-95"
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
                    value={inventorySearchTerm}
                    onChange={(e) => setInventorySearchTerm(e.target.value)}
                    placeholder="Search items to add..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {inventorySearchTerm && filteredInventoryItems.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredInventoryItems.slice(0, 20).map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            handleAddToInventory(item.id);
                            setInventorySearchTerm('');
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
                {inventory.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-all duration-300 ease-in-out transform hover:scale-105"
                    style={{
                      animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                    }}
                  >
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

            {/* Sidebar - Consolidated Requirements (1/3 width on large screens) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Shopping List</h2>
                <p className="text-sm text-gray-600 mb-4">
                  All materials needed for active tracked items
                </p>
                <ConsolidatedRequirementsPanel
                  trackedItems={trackedItems}
                  allItems={allItems}
                  inventory={inventory}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Tracked Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
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

              // Close modal immediately for better UX
              setShowBrowseModal(false);

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

              // Reload data to ensure consistency (without showing loading state)
              const [tracked, inv, items] = await Promise.all([
                window.electronAPI.getAllTrackedItems(),
                window.electronAPI.getInventory(),
                window.electronAPI.getAllItems()
              ]);

              setTrackedItems(tracked);
              setInventory(inv);
              setAllItems(items);
            } catch (error) {
              console.error('Error adding tracked item from game data:', error);
              setErrorMessage('Failed to add tracked item');
              // Reload on error to ensure consistency
              await loadData();
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
          onUpdate={async () => {
            // Update data without showing loading state
            const [tracked, inv, items] = await Promise.all([
              window.electronAPI.getAllTrackedItems(),
              window.electronAPI.getInventory(),
              window.electronAPI.getAllItems()
            ]);
            setTrackedItems(tracked);
            setInventory(inv);
            setAllItems(items);
          }}
          allItems={allItems}
          inventory={inventory}
        />
      )}
      </div>
    </>
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
