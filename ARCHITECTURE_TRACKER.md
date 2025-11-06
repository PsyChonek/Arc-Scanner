# Arc Scanner - Item Tracking System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Arc Scanner UI                          │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │             Header with Navigation                     │ │
│  │  [Arc Scanner Logo]        [Import Data Button]       │ │
│  │  ┌──────────┐  ┌──────────┐                          │ │
│  │  │Graph View│  │  Tracker │ <- Navigation Tabs       │ │
│  │  └──────────┘  └──────────┘                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Main Content Area                   │ │
│  │                                                        │ │
│  │  Graph View:          OR      Tracker View:           │ │
│  │  ┌──────────────┐           ┌──────────────────┐     │ │
│  │  │ Interactive  │           │ Tracked Items    │     │ │
│  │  │ Node Graph   │           │ ┌──────────────┐ │     │ │
│  │  │              │           │ │☐ Upgrade #1  │ │     │ │
│  │  │   Nodes &    │           │ │☑ Quest #1    │ │     │ │
│  │  │   Edges      │           │ └──────────────┘ │     │ │
│  │  │              │           │                  │     │ │
│  │  │   MiniMap    │           │ Your Inventory   │     │ │
│  │  │   Controls   │           │ ┌──────────────┐ │     │ │
│  │  └──────────────┘           │ │ Iron: 10     │ │     │ │
│  │                             │ │ Steel: 5     │ │     │ │
│  │                             │ └──────────────┘ │     │ │
│  │                             └──────────────────┘     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────┐
│  React UI   │
│ (Renderer)  │
└──────┬──────┘
       │ IPC Invoke
       ▼
┌─────────────────────┐
│  Electron Main      │
│  Process            │
│  ┌───────────────┐  │
│  │ IPC Handlers  │  │
│  └───────┬───────┘  │
│          │          │
│          ▼          │
│  ┌───────────────┐  │
│  │ Database.js   │  │
│  │               │  │
│  │ - Items       │  │
│  │ - Relations   │  │
│  │ - Inventory   │◄─┼─ New Tables
│  │ - Tracked     │  │
│  │ - Requirements│  │
│  └───────────────┘  │
└─────────────────────┘
       │
       ▼
┌─────────────┐
│  SQLite DB  │
│  (Local)    │
└─────────────┘
```

## Feature: Item Tracking Workflow

```
1. User Creates Tracked Item
   ┌────────────────┐
   │ Add Modal      │
   │ - Name: "..."  │
   │ - Type: upgrade│
   │ - Notes: "..." │
   └───────┬────────┘
           │
           ▼
   [Saved to tracked_items table]

2. User Adds Requirements
   ┌──────────────────┐
   │ Requirements     │
   │ - Iron: 20       │
   │ - Steel: 10      │
   └───────┬──────────┘
           │
           ▼
   [Saved to tracked_item_requirements]

3. User Manages Inventory
   ┌──────────────────┐
   │ Add to Inventory │
   │ - Iron: 10       │
   │ - Steel: 5       │
   └───────┬──────────┘
           │
           ▼
   [Saved to inventory table]

4. System Shows Progress
   ┌─────────────────────────┐
   │ Tracked Item: Upgrade   │
   │                         │
   │ Requirements:           │
   │ ✗ Iron:  10/20 needed   │
   │ ✗ Steel:  5/10 needed   │
   │                         │
   │ [ ] Mark as Complete    │
   └─────────────────────────┘

5. User Completes Goal
   ┌─────────────────────────┐
   │ ✓ Tracked Item Complete │
   │                         │
   │ Completed: 2025-11-06   │
   └─────────────────────────┘
```

## Database Schema Relationships

```
┌──────────────┐
│   items      │
│              │
│ id (PK)      │◄──────────┐
│ name         │           │
│ type         │           │
│ ...          │           │
└──────────────┘           │
       ▲                   │
       │                   │
       │ FK                │ FK
       │                   │
┌──────┴────────┐   ┌──────┴────────────────┐
│ inventory     │   │ tracked_items         │
│               │   │                       │
│ item_id (PK)  │   │ id (PK)              │
│ quantity      │   │ item_id (FK)         │
│ added_at      │   │ name                 │
└───────────────┘   │ type                 │
                    │ completed            │
                    │ notes                │
                    │ created_at           │
                    │ completed_at         │
                    └───────┬──────────────┘
                            │
                            │ FK
                            ▼
              ┌─────────────────────────────┐
              │ tracked_item_requirements   │
              │                             │
              │ id (PK)                     │
              │ tracked_item_id (FK)        │
              │ required_item_id (FK) ──────►items
              │ quantity_needed             │
              └─────────────────────────────┘
```

## User Experience Flow

```
User Journey:

1. Open App → See Graph View (default)
   
2. Click "Item Tracker" tab → Switch to Tracker View
   
3. Click "Add Tracked Item" → Modal Opens
   
4. Fill form & Submit → New tracked item created
   
5. Click "Requirements" → Requirements modal opens
   
6. Search for items → Add materials needed
   
7. Add items to inventory → Update quantities
   
8. View progress → See owned vs needed counts
   
9. Mark as complete → Visual feedback (green, ✓)
   
10. Continue tracking → Repeat for other goals
```

## Technical Implementation

### Frontend (React)
- **App.jsx**: Navigation state and view switching
- **TrackerPage.jsx**: Complete tracking UI
  - Tracked items list with completion toggles
  - Inventory management with search
  - Requirements modal (nested component)
  - Error handling with toast notifications
  - Confirmation dialogs for destructive actions

### Backend (Electron Main Process)
- **database.js**: Extended with tracker functions
  - addToInventory, removeFromInventory
  - getInventory, updateInventoryQuantity
  - addTrackedItem, removeTrackedItem
  - markTrackedItemCompleted
  - addTrackedItemRequirement, getTrackedItemRequirements

- **main.js**: IPC handlers for all operations
  - 11 new handlers for tracker features
  - Secure parameterized queries
  - Proper error handling

- **preload.js**: API exposure to renderer
  - Secure context bridge
  - Type-safe function signatures

### Security
- ✅ No SQL injection vulnerabilities
- ✅ Parameterized queries throughout
- ✅ Input validation on frontend
- ✅ CodeQL analysis passed (0 alerts)
- ✅ Context isolation enabled
- ✅ No eval() or unsafe code

## Key Benefits

1. **Progress Tracking**: Never lose sight of your goals
2. **Inventory Management**: Know what you have
3. **Requirement Planning**: See what you need
4. **Visual Feedback**: Clear indicators of progress
5. **Data Persistence**: Everything saved locally
6. **Non-Breaking**: Works alongside existing features
7. **Secure**: Follows security best practices
8. **User-Friendly**: Intuitive UI with proper modals
