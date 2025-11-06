// Utility functions to load and parse Arc Raiders game data

/**
 * Load hideout modules data
 * @returns {Promise<Array>} Array of hideout modules with levels and requirements
 */
export async function loadHideoutModules() {
  try {
    const data = await window.electronAPI.loadArcRaidersFile('hideoutModules.json');
    return data || [];
  } catch (error) {
    console.error('Error loading hideout modules:', error);
    return [];
  }
}

/**
 * Load projects data
 * @returns {Promise<Array>} Array of projects with phases and requirements
 */
export async function loadProjects() {
  try {
    const data = await window.electronAPI.loadArcRaidersFile('projects.json');
    return data || [];
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

/**
 * Load quests data
 * @returns {Promise<Array>} Array of quests with objectives and required items
 */
export async function loadQuests() {
  try {
    const data = await window.electronAPI.loadArcRaidersFile('quests.json');
    return data || [];
  } catch (error) {
    console.error('Error loading quests:', error);
    return [];
  }
}

/**
 * Load items data (for recipes)
 * @returns {Promise<Array>} Array of items with recyclesInto data
 */
export async function loadItemsWithRecipes() {
  try {
    const data = await window.electronAPI.loadArcRaidersFile('items.json');
    // Filter items that have recyclesInto data
    return (data || []).filter(item => item.recyclesInto && Object.keys(item.recyclesInto).length > 0);
  } catch (error) {
    console.error('Error loading items:', error);
    return [];
  }
}

/**
 * Convert hideout module level to trackable item format
 * @param {Object} module - Hideout module object
 * @param {number} level - Level to upgrade to
 * @returns {Object} Trackable item with requirements
 */
export function hideoutModuleToTrackable(module, level) {
  const levelData = module.levels.find(l => l.level === level);
  if (!levelData) return null;

  return {
    name: `${module.name} - Level ${level}`,
    type: 'hideout_upgrade',
    itemId: module.id,
    requirements: levelData.requirementItemIds || [],
    notes: levelData.otherRequirements ? levelData.otherRequirements.join(', ') : '',
    sourceType: 'hideout',
    sourceId: module.id,
    sourceLevel: level
  };
}

/**
 * Convert project phase to trackable item format
 * @param {Object} project - Project object
 * @param {number} phase - Phase number
 * @returns {Object} Trackable item with requirements
 */
export function projectPhaseToTrackable(project, phase) {
  const phaseData = project.phases.find(p => p.phase === phase);
  if (!phaseData) return null;

  return {
    name: `${project.name} - Phase ${phase}: ${phaseData.name}`,
    type: 'project',
    itemId: project.id,
    requirements: phaseData.requirementItemIds || [],
    notes: phaseData.description || '',
    sourceType: 'project',
    sourceId: project.id,
    sourcePhase: phase
  };
}

/**
 * Convert quest to trackable item format
 * @param {Object} quest - Quest object
 * @returns {Object} Trackable item with requirements
 */
export function questToTrackable(quest) {
  return {
    name: quest.name,
    type: 'quest',
    itemId: quest.id,
    requirements: quest.requiredItemIds || [],
    notes: quest.objectives ? quest.objectives.join('; ') : '',
    sourceType: 'quest',
    sourceId: quest.id
  };
}

/**
 * Convert item recipe to trackable item format
 * @param {Object} item - Item object with recyclesInto
 * @returns {Object} Trackable item with requirements (what you get from recycling)
 */
export function itemRecipeToTrackable(item) {
  // For recycling, the "requirements" are what you need to recycle (the item itself)
  // and the result is what you get
  const recycleResults = Object.entries(item.recyclesInto).map(([itemId, quantity]) => ({
    itemId,
    quantity
  }));

  return {
    name: `Recycle ${item.name}`,
    type: 'recipe',
    itemId: item.id,
    requirements: [{ itemId: item.id, quantity: 1 }], // Need the item itself to recycle it
    notes: `Yields: ${Object.entries(item.recyclesInto).map(([id, qty]) => `${qty}x ${id}`).join(', ')}`,
    sourceType: 'recipe',
    sourceId: item.id
  };
}
