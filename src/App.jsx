import React, { useState, useEffect } from 'react';
import ItemGraph from './components/ItemGraph';
import ItemDetails from './components/ItemDetails';

function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Initializing Arc Scanner...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold">Arc Scanner</h1>
          <p className="text-blue-100 text-sm mt-1">
            Interactive Item Relationship Graph for Arc Raiders
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        <ItemGraph onNodeClick={handleNodeClick} />
      </main>

      {/* Item Details Modal */}
      {selectedItem && (
        <ItemDetails item={selectedItem} onClose={handleCloseDetails} />
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 px-6 py-3 text-sm">
        <div className="flex justify-between items-center">
          <span>Drag to move • Scroll to zoom • Click nodes for details</span>
          <span>Data stored in SQLite</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
