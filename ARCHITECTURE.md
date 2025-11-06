# Arc Scanner Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Arc Scanner Application                     │
│                          (Electron Desktop App)                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
        ┌───────▼────────┐                    ┌────────▼────────┐
        │  Main Process  │                    │ Renderer Process│
        │   (Node.js)    │                    │    (Browser)    │
        │                │                    │                 │
        │  ┌──────────┐  │                    │  ┌───────────┐  │
        │  │ main.js  │  │◄───────IPC────────►│  │  React    │  │
        │  └─────┬────┘  │   contextBridge    │  │   App     │  │
        │        │       │    preload.js      │  └─────┬─────┘  │
        │  ┌─────▼────┐  │                    │        │        │
        │  │database  │  │                    │  ┌─────▼─────┐  │
        │  │  .js     │  │                    │  │ ItemGraph │  │
        │  └─────┬────┘  │                    │  │ Component │  │
        │        │       │                    │  └───────────┘  │
        │  ┌─────▼────┐  │                    │  ┌───────────┐  │
        │  │ SQLite   │  │                    │  │ItemDetails│  │
        │  │ Database │  │                    │  │Component  │  │
        │  └──────────┘  │                    │  └───────────┘  │
        └────────────────┘                    │  ┌───────────┐  │
                                              │  │ Importer  │  │
                                              │  │  Utility  │  │
                                              │  └─────┬─────┘  │
                                              └────────┼────────┘
                                                       │
                                                       ▼
                                              ┌────────────────┐
                                              │  GitHub API    │
                                              │  RaidTheory/   │
                                              │ arcraiders-data│
                                              └────────────────┘
```

## Data Flow

### 1. Application Startup
```
User → npm start → Electron → Main Process → Initialize Database
                                            → Create Window
                                            → Load Renderer
                                            → Check for existing data
                                            → Load sample data if empty
```

### 2. Viewing Graph
```
Renderer → Request Items/Relations (IPC)
        → Main Process → Query Database
                      → Return Data
        → Renderer → Transform to React Flow format
                  → Render Graph
                  → Enable Interactions
```

### 3. Clicking Node
```
User Click → ItemGraph Component → Extract Item Data
                                 → Open ItemDetails Modal
                                 → Display Item Info
```

### 4. Importing Arc Raiders Data
```
User Click → Import Button → arcRaidersImporter.js
                           → Fetch from GitHub API
                           → Transform Data
                           → For Each Item:
                               → Send to Main Process (IPC)
                               → Insert into Database
                           → For Each Relation:
                               → Send to Main Process (IPC)
                               → Insert into Database
                           → Refresh Graph
```

## Component Structure

```
App.jsx (Root Component)
├── State Management
│   ├── selectedItem
│   ├── loading
│   ├── importing
│   ├── importStatus
│   └── graphKey (for refresh)
├── Header
│   ├── Title
│   ├── Description
│   └── Import Button
├── ItemGraph Component
│   ├── React Flow
│   │   ├── Nodes (Items)
│   │   ├── Edges (Relations)
│   │   ├── Controls
│   │   ├── MiniMap
│   │   └── Background
│   └── Event Handlers
│       ├── onNodeClick
│       ├── onNodesChange
│       └── onEdgesChange
├── ItemDetails Modal (conditional)
│   ├── Item Name
│   ├── Item Properties
│   ├── Description
│   ├── Image
│   ├── Additional Data
│   └── Close Button
└── Footer
    └── Usage Instructions
```

## Database Schema

```
┌─────────────────────────────────────┐
│           items                      │
├─────────────┬───────────────────────┤
│ id          │ TEXT PRIMARY KEY      │
│ name        │ TEXT NOT NULL         │
│ type        │ TEXT                  │
│ rarity      │ TEXT                  │
│ description │ TEXT                  │
│ image_url   │ TEXT                  │
│ data        │ JSON                  │
│ created_at  │ DATETIME              │
└─────────────┴───────────────────────┘
              │
              │ Foreign Key
              ▼
┌─────────────────────────────────────┐
│         relations                    │
├─────────────┬───────────────────────┤
│ id          │ INTEGER PRIMARY KEY   │
│ source_id   │ TEXT FK → items(id)   │
│ target_id   │ TEXT FK → items(id)   │
│ relation_   │ TEXT                  │
│  type       │                       │
│ weight      │ REAL                  │
│ data        │ JSON                  │
│ created_at  │ DATETIME              │
└─────────────┴───────────────────────┘

┌─────────────────────────────────────┐
│         user_data                    │
├─────────────┬───────────────────────┤
│ key         │ TEXT PRIMARY KEY      │
│ value       │ TEXT (JSON)           │
│ updated_at  │ DATETIME              │
└─────────────┴───────────────────────┘
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────┐
│                    User Interface                    │
│              React Components + Tailwind             │
├─────────────────────────────────────────────────────┤
│                   Visualization                      │
│              React Flow (Graph Library)              │
├─────────────────────────────────────────────────────┤
│                 Application Logic                    │
│           React Hooks + State Management             │
├─────────────────────────────────────────────────────┤
│                 IPC Communication                    │
│         Electron contextBridge + ipcRenderer         │
├─────────────────────────────────────────────────────┤
│                   Main Process                       │
│              Node.js + Electron APIs                 │
├─────────────────────────────────────────────────────┤
│                  Data Persistence                    │
│              sql.js + SQLite                 │
├─────────────────────────────────────────────────────┤
│                  External Data                       │
│            GitHub API + Arc Raiders Data             │
└─────────────────────────────────────────────────────┘
```

## Interaction Flows

### Drag Node
```
User Drags Node
    → React Flow onNodeDragStop
    → Update node position in state
    → Re-render graph
    → (Optional) Save position to user_data
```

### Zoom Graph
```
User Scrolls
    → React Flow onZoom
    → Update viewport transform
    → Re-render visible nodes
```

### Click Node for Details
```
User Clicks Node
    → React Flow onNodeClick
    → Extract node.data.item
    → Set selectedItem state
    → Render ItemDetails modal
    → Display item information
```

### Import Data
```
User Clicks Import Button
    → Set importing = true
    → Call arcRaidersImporter.importArcRaidersData()
    → Fetch from GitHub API
    → Parse JSON response
    → For each item:
        → window.electronAPI.addItem(item)
        → Main process → database.addItem()
        → SQLite INSERT
    → For each relation:
        → window.electronAPI.addRelation(relation)
        → Main process → database.addRelation()
        → SQLite INSERT
    → Set importing = false
    → Increment graphKey
    → ItemGraph re-renders with new data
```

## Security Model

```
┌──────────────────────────┐
│   Renderer Process       │
│   (Untrusted Context)    │
│                          │
│   - No Node.js access    │
│   - No filesystem access │
│   - No direct DB access  │
└────────────┬─────────────┘
             │
             │ IPC (contextBridge)
             │ Only exposed APIs
             ▼
┌──────────────────────────┐
│   Preload Script         │
│   (Bridge Context)       │
│                          │
│   - Whitelist APIs       │
│   - Type validation      │
└────────────┬─────────────┘
             │
             │ IPC (ipcRenderer)
             │
             ▼
┌──────────────────────────┐
│   Main Process           │
│   (Trusted Context)      │
│                          │
│   - Full Node.js access  │
│   - Filesystem access    │
│   - Database operations  │
└──────────────────────────┘
```

## File Organization

```
Arc-Scanner/
│
├── src/
│   ├── main.js                 # Electron main process
│   ├── preload.js              # IPC bridge
│   ├── renderer.js             # Renderer entry
│   ├── database.js             # Database operations
│   ├── App.jsx                 # Root React component
│   ├── index.html              # HTML template
│   ├── index.css               # Global styles + Tailwind
│   │
│   ├── components/
│   │   ├── ItemGraph.jsx       # Graph visualization
│   │   └── ItemDetails.jsx     # Item detail modal
│   │
│   └── utils/
│       └── arcRaidersImporter.js  # Data import utility
│
├── webpack.main.config.js      # Main process webpack
├── webpack.renderer.config.js  # Renderer process webpack
├── webpack.rules.js            # Shared webpack rules
├── forge.config.js             # Electron Forge config
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── package.json                # Dependencies
├── .gitignore                  # Git ignore rules
├── README.md                   # User documentation
└── IMPLEMENTATION.md           # Technical documentation
```

## Build Process

```
npm start
    │
    ├─→ electron-forge start
    │       │
    │       ├─→ Webpack builds main process
    │       ├─→ Webpack builds renderer process
    │       ├─→ Start webpack dev server
    │       └─→ Launch Electron with built files
    │
npm run package
    │
    └─→ electron-forge package
            │
            ├─→ Build production bundles
            ├─→ Rebuild native modules for Electron
            ├─→ Package app with Electron
            └─→ Output to out/ directory
```

## Performance Considerations

1. **Graph Rendering**
   - React Flow uses virtualization for large graphs
   - Only visible nodes are rendered
   - Smooth 60fps interactions

2. **Database Operations**
   - sql.js is synchronous but fast
   - Prepared statements for repeated queries
   - Indexed foreign keys for quick lookups

3. **IPC Communication**
   - Asynchronous IPC calls
   - Minimal data serialization
   - Batched operations where possible

4. **Memory Management**
   - Database connection reused
   - Graph data loaded on demand
   - React components properly cleaned up
