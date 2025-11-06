import React, { useState, useEffect } from 'react';
import ItemGraph from './components/ItemGraph';
import ItemDetails from './components/ItemDetails';
import TrackerPage from './components/TrackerPage';
import { importArcRaidersData } from './utils/arcRaidersImporter';

function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [graphKey, setGraphKey] = useState(0); // Used to force graph refresh
  const [currentView, setCurrentView] = useState('graph'); // 'graph' or 'tracker'

  useEffect(() => {
    // Initialize with some sample data if database is empty
    const initializeData = async () => {
      try {
        const items = await window.electronAPI.getAllItems();
        
        // If no items exist, add some sample data
        if (items.length === 0) {
          // Add sample items
          const sampleItems = [
            {
              id: 'weapon-assault-rifle',
              name: 'Assault Rifle',
              type: 'Weapon',
              rarity: 'rare',
              description: 'A reliable automatic weapon for medium-range combat',
              data: { damage: 35, fireRate: 600, magazine: 30 }
            },
            {
              id: 'weapon-shotgun',
              name: 'Shotgun',
              type: 'Weapon',
              rarity: 'uncommon',
              description: 'Close-range powerhouse',
              data: { damage: 80, fireRate: 120, magazine: 8 }
            },
            {
              id: 'resource-scrap-metal',
              name: 'Scrap Metal',
              type: 'Resource',
              rarity: 'common',
              description: 'Basic crafting material',
              data: { stackSize: 100 }
            },
            {
              id: 'resource-rare-alloy',
              name: 'Rare Alloy',
              type: 'Resource',
              rarity: 'rare',
              description: 'Advanced crafting material',
              data: { stackSize: 50 }
            },
            {
              id: 'armor-chest-plate',
              name: 'Chest Plate',
              type: 'Armor',
              rarity: 'epic',
              description: 'Provides protection for vital areas',
              data: { armor: 150, durability: 200 }
            },
          ];

          for (const item of sampleItems) {
            await window.electronAPI.addItem(item);
          }

          // Add sample relations
          const sampleRelations = [
            {
              source_id: 'resource-scrap-metal',
              target_id: 'weapon-assault-rifle',
              relation_type: 'crafts_to',
              weight: 1.5
            },
            {
              source_id: 'resource-rare-alloy',
              target_id: 'weapon-assault-rifle',
              relation_type: 'crafts_to',
              weight: 1.0
            },
            {
              source_id: 'resource-scrap-metal',
              target_id: 'weapon-shotgun',
              relation_type: 'crafts_to',
              weight: 1.2
            },
            {
              source_id: 'resource-rare-alloy',
              target_id: 'armor-chest-plate',
              relation_type: 'crafts_to',
              weight: 2.0
            },
            {
              source_id: 'weapon-assault-rifle',
              target_id: 'weapon-shotgun',
              relation_type: 'combines_with',
              weight: 1.0
            },
          ];

          for (const relation of sampleRelations) {
            await window.electronAPI.addRelation(relation);
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleNodeClick = (item) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const handleImportArcRaidersData = async () => {
    setImporting(true);
    setImportStatus(null);
    
    try {
      const result = await importArcRaidersData();
      setImportStatus(result);
      
      if (result.success) {
        // Refresh the graph
        setGraphKey(prev => prev + 1);
      }
    } catch (error) {
      setImportStatus({
        success: false,
        error: error.message
      });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Initializing Arc Scanner...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with Navigation */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-3xl font-bold">Arc Scanner</h1>
              <p className="text-blue-100 text-sm mt-1">
                Interactive Item Relationship Graph for Arc Raiders
              </p>
            </div>
            <div>
              <button
                onClick={handleImportArcRaidersData}
                disabled={importing}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  importing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
              >
                {importing ? 'Importing...' : 'Import Arc Raiders Data'}
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="flex space-x-1 border-t border-blue-500 pt-3">
            <button
              onClick={() => setCurrentView('graph')}
              className={`px-6 py-2 rounded-t-lg font-semibold transition-colors ${
                currentView === 'graph'
                  ? 'bg-white text-blue-800'
                  : 'bg-blue-700 text-blue-100 hover:bg-blue-600'
              }`}
            >
              Graph View
            </button>
            <button
              onClick={() => setCurrentView('tracker')}
              className={`px-6 py-2 rounded-t-lg font-semibold transition-colors ${
                currentView === 'tracker'
                  ? 'bg-white text-blue-800'
                  : 'bg-blue-700 text-blue-100 hover:bg-blue-600'
              }`}
            >
              Item Tracker
            </button>
          </nav>
        </div>
        
        {/* Import Status */}
        {importStatus && (
          <div className={`px-6 py-2 text-sm ${
            importStatus.success ? 'bg-green-700' : 'bg-red-700'
          }`}>
            {importStatus.success ? (
              <span>
                ✓ Successfully imported {importStatus.itemsImported} items and {importStatus.relationsImported} relations
                {importStatus.note && <span className="ml-2 text-xs opacity-90">({importStatus.note})</span>}
              </span>
            ) : (
              <span>✗ Import failed: {importStatus.error}</span>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {currentView === 'graph' ? (
          <ItemGraph key={graphKey} onNodeClick={handleNodeClick} />
        ) : (
          <TrackerPage />
        )}
      </main>

      {/* Item Details Modal */}
      {selectedItem && (
        <ItemDetails item={selectedItem} onClose={handleCloseDetails} />
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 px-6 py-3 text-sm">
        <div className="flex justify-between items-center">
          <span>
            {currentView === 'graph' 
              ? 'Drag to move • Scroll to zoom • Click nodes for details'
              : 'Track your progress on upgrades and quests'
            }
          </span>
          <span>Data stored in SQLite</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
