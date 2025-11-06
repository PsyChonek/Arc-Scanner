# Game Data Browser Feature - UI Documentation

## New Browse Game Data Modal

### Access
Click the "📚 Browse Game Data" button on the Item Tracker page to open the browser.

### Tabs

#### 1. Hideout Modules Tab
Shows all hideout modules with their upgrade levels:
```
┌─────────────────────────────────────────────────┐
│ Scrappy                                         │
│ ┌───────────────────────────────────────────┐   │
│ │ Level 2          1 requirements          │   │
│ │ 1x Dog Collar                            │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ Level 3          2 requirements          │   │
│ │ 3x Lemon, 3x Apricot                     │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Gunsmith                                        │
│ ┌───────────────────────────────────────────┐   │
│ │ Level 1          2 requirements          │   │
│ │ 20x Metal Parts, 30x Rubber Parts        │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ Level 2          3 requirements          │   │
│ │ 3x Rusted Tools, 5x Mechanical Comp...   │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### 2. Projects Tab
Shows expedition projects with their phases:
```
┌─────────────────────────────────────────────────┐
│ Expedition Project                              │
│ Embark on a dangerous expedition beyond the...  │
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ Phase 1: Foundation   4 requirements     │   │
│ │ Connecting wiring, ventilation...        │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ Phase 2: Core Systems  4 requirements    │   │
│ │ Building the walls and roof...           │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### 3. Quests Tab
Shows all available quests with search:
```
┌─────────────────────────────────────────────────┐
│ [Search quests...                              ]│
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ Picking Up The Pieces              0 items│   │
│ │ Trader: Shani                            │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ Clearer Skies                      1 items│   │
│ │ Trader: Shani                            │   │
│ │ Requires: 3x ARC Alloy                   │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ Trash Into Treasure                2 items│   │
│ │ Trader: Shani                            │   │
│ │ Requires: 6x Wires, 1x Battery           │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### 4. Item Recipes Tab
Shows items with recyclesInto data:
```
┌─────────────────────────────────────────────────┐
│ [Search items...                               ]│
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ Tick Pod                                  │   │
│ │ Recycles into: 1x ARC Alloy, 1x Metal... │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ Dog Collar                                │   │
│ │ Recycles into: 8x Fabric, 1x Metal Parts │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### User Flow

1. User clicks "📚 Browse Game Data" button
2. Modal opens showing Hideout Modules tab by default
3. User can switch between tabs to browse different data types
4. Clicking on any item:
   - Creates a tracked item with the name (e.g., "Gunsmith - Level 2")
   - Automatically adds all requirements from the game data
   - Closes the modal
   - Returns to tracker page with new tracked item visible

### Example: Adding Hideout Module Upgrade

**Before:**
```
Tracked Upgrades & Quests
[No items yet]
```

**User Action:**
1. Click "📚 Browse Game Data"
2. Select "Hideout Modules" tab
3. Find "Gunsmith"
4. Click "Level 2" (shows: 3 requirements)

**After:**
```
Tracked Upgrades & Quests
┌─────────────────────────────────────────────────┐
│ ☐ Gunsmith - Level 2           [Requirements][X]│
│   hideout_upgrade                               │
│                                                 │
│   Requirements:                                 │
│   ✗ Rusted Tools:           0/3                │
│   ✗ Mechanical Components:  0/5                │
│   ✗ Wasp Driver:            0/8                │
└─────────────────────────────────────────────────┘
```

All 3 requirements were automatically added!

### Data Sources

The browser loads data from these files in `assets/arcraiders-data-main/`:

1. **hideoutModules.json**
   - Structure: Array of modules with levels
   - Each level has `requirementItemIds` array
   - Example: Gunsmith Level 2 requires specific items

2. **projects.json**
   - Structure: Array of projects with phases
   - Each phase has `requirementItemIds` array
   - Example: Expedition Project Phase 1 "Foundation"

3. **quests.json**
   - Structure: Array of quests with objectives
   - Has `requiredItemIds` array for turn-in items
   - Example: "Clearer Skies" requires 3x ARC Alloy

4. **items.json**
   - Structure: Array of items
   - Filtered to items with `recyclesInto` object
   - Example: Tick Pod recycles into ARC Alloy + Metal Parts

### Benefits

✅ **No Manual Entry**: Requirements are automatically populated
✅ **Accurate Data**: Uses official Arc Raiders game data
✅ **Quick Setup**: One click to add hideout upgrades
✅ **Quest Tracking**: Easy quest objective tracking with items
✅ **Recipe Planning**: Track recycling requirements

### Technical Details

**New Files:**
- `src/utils/arcRaidersLoader.js` - Data loading and conversion utilities

**Modified Files:**
- `src/components/TrackerPage.jsx` - Added BrowseGameDataModal component
- `src/main.js` - Added arc:loadFile IPC handler
- `src/preload.js` - Exposed loadArcRaidersFile API

**New Functions:**
- `loadHideoutModules()` - Load hideout data
- `loadProjects()` - Load project data
- `loadQuests()` - Load quest data
- `loadItemsWithRecipes()` - Load items with recipes
- `hideoutModuleToTrackable()` - Convert to trackable format
- `projectPhaseToTrackable()` - Convert to trackable format
- `questToTrackable()` - Convert to trackable format
- `itemRecipeToTrackable()` - Convert to trackable format

**Auto-Population Logic:**
When user selects an item from the browser:
1. Create tracked item with proper name and type
2. Loop through all requirements from game data
3. Call `addTrackedItemRequirement()` for each
4. Refresh tracker page to show new item with requirements

This eliminates the manual step of adding requirements one by one!
