/**
 * Arc Raiders Data Importer
 * Fetches data from the RaidTheory/arcraiders-data GitHub repository
 */

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'RaidTheory';
const REPO_NAME = 'arcraiders-data';
const DATA_PATH = 'data';

/**
 * Fetch items data from the Arc Raiders data repository
 */
async function fetchArcRaidersItems() {
  try {
    // First, get the list of files in the data directory
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`
    );
    
    if (!response.ok) {
      console.error('Failed to fetch data directory:', response.statusText);
      return null;
    }
    
    const files = await response.json();
    
    // Look for items.json or similar files
    const itemsFile = files.find(file => 
      file.name.toLowerCase().includes('item') && file.name.endsWith('.json')
    );
    
    if (!itemsFile) {
      console.warn('No items file found in repository');
      return null;
    }
    
    // Fetch the items file content
    const itemsResponse = await fetch(itemsFile.download_url);
    if (!itemsResponse.ok) {
      console.error('Failed to fetch items data:', itemsResponse.statusText);
      return null;
    }
    
    const itemsData = await itemsResponse.json();
    return itemsData;
  } catch (error) {
    console.error('Error fetching Arc Raiders data:', error);
    return null;
  }
}

/**
 * Transform Arc Raiders data to our database format
 */
function transformArcRaidersData(rawData) {
  if (!rawData) return { items: [], relations: [] };
  
  const items = [];
  const relations = [];
  
  // Handle different possible data structures
  const itemsArray = Array.isArray(rawData) ? rawData : 
                     rawData.items ? rawData.items : 
                     Object.values(rawData);
  
  itemsArray.forEach((item, index) => {
    // Transform item to our format
    const transformedItem = {
      id: item.id || item.itemId || `item-${index}`,
      name: item.name || item.displayName || 'Unknown Item',
      type: item.type || item.category || item.itemType || 'Unknown',
      rarity: item.rarity || item.tier || 'common',
      description: item.description || item.desc || '',
      image_url: item.image || item.imageUrl || item.icon || null,
      data: {
        ...item,
        // Store original data for reference
      }
    };
    
    items.push(transformedItem);
    
    // Extract relations from crafting recipes, requirements, etc.
    if (item.craftingRecipe || item.recipe) {
      const recipe = item.craftingRecipe || item.recipe;
      if (Array.isArray(recipe.ingredients) || Array.isArray(recipe.materials)) {
        const materials = recipe.ingredients || recipe.materials;
        materials.forEach(material => {
          relations.push({
            source_id: material.id || material.itemId,
            target_id: transformedItem.id,
            relation_type: 'crafts_to',
            weight: material.quantity || 1.0
          });
        });
      }
    }
    
    // Extract upgrade relations
    if (item.upgradesTo) {
      relations.push({
        source_id: transformedItem.id,
        target_id: item.upgradesTo,
        relation_type: 'upgrades_to',
        weight: 1.0
      });
    }
    
    // Extract requirement relations
    if (item.requires || item.requirements) {
      const reqs = Array.isArray(item.requires) ? item.requires : [item.requires];
      reqs.forEach(req => {
        if (req) {
          relations.push({
            source_id: req.id || req,
            target_id: transformedItem.id,
            relation_type: 'requires',
            weight: 1.0
          });
        }
      });
    }
  });
  
  return { items, relations };
}

/**
 * Import Arc Raiders data into the database
 */
async function importArcRaidersData() {
  try {
    console.log('Fetching Arc Raiders data from GitHub...');
    const rawData = await fetchArcRaidersItems();
    
    if (!rawData) {
      console.error('Failed to fetch Arc Raiders data');
      return { success: false, error: 'Failed to fetch data' };
    }
    
    console.log('Transforming data...');
    const { items, relations } = transformArcRaidersData(rawData);
    
    console.log(`Importing ${items.length} items and ${relations.length} relations...`);
    
    // Import items
    let importedItems = 0;
    for (const item of items) {
      try {
        await window.electronAPI.addItem(item);
        importedItems++;
      } catch (error) {
        console.error(`Failed to import item ${item.id}:`, error);
      }
    }
    
    // Import relations
    let importedRelations = 0;
    for (const relation of relations) {
      try {
        await window.electronAPI.addRelation(relation);
        importedRelations++;
      } catch (error) {
        console.error(`Failed to import relation:`, error);
      }
    }
    
    console.log(`Successfully imported ${importedItems} items and ${importedRelations} relations`);
    
    return {
      success: true,
      itemsImported: importedItems,
      relationsImported: importedRelations,
      totalItems: items.length,
      totalRelations: relations.length
    };
  } catch (error) {
    console.error('Error importing Arc Raiders data:', error);
    return { success: false, error: error.message };
  }
}

export { fetchArcRaidersItems, transformArcRaidersData, importArcRaidersData };
