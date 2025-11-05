# Arc-Scanner

An Electron application built with React and Webpack for visualizing Arc Raiders game item relationships.

## Features

- **Interactive Graph Visualization**: View and explore item relationships with an interactive node graph
  - Drag nodes to reposition them
  - Zoom and pan to navigate the graph
  - Click on nodes to view detailed item information
  - Mini-map for overview navigation
  - Color-coded nodes by rarity (common, uncommon, rare, epic, legendary)
  - Color-coded edges by relationship type (crafts_to, requires, combines_with, upgrades_to)

- **SQLite Database**: Persistent storage for items, relationships, and user data
  - Items table with id, name, type, rarity, description, and custom data
  - Relations table for tracking item relationships
  - User data table for app settings

- **Arc Raiders Data Integration**: Import real game data from the community repository
  - Fetch data from [RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data)
  - One-click import button in the UI
  - Automatic transformation to graph format

- **Modern UI with Tailwind CSS**: Fast, responsive styling with utility classes

## Setup

This project was set up using Electron Forge with React integration following the [official Electron Forge React guide](https://www.electronforge.io/guides/framework-integration/react).

### Technologies

- **Electron**: Desktop application framework
- **React**: UI library
- **React Flow**: Interactive graph visualization
- **Webpack**: Module bundler
- **Babel**: JavaScript compiler for React JSX
- **Tailwind CSS**: Utility-first CSS framework
- **better-sqlite3**: Fast, synchronous SQLite3 for Node.js

## Getting Started

### Prerequisites

- Node.js and npm installed

### Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

**Note on native dependencies**: This app uses `better-sqlite3` which is a native Node.js module. If you encounter build issues during `npm install` or when running the app, ensure you have:
- Python 3.x installed
- A C++ compiler (Visual Studio Build Tools on Windows, Xcode Command Line Tools on macOS, build-essential on Linux)
- Good internet connectivity for downloading Electron headers

If you experience issues in restricted network environments, the pre-built binaries from npm should work in most cases.

### Development

Start the application in development mode:

```bash
npm start
```

This will:
- Launch the Electron app
- Start webpack dev servers
- Enable hot reload for the renderer process
- Make the app available at http://localhost:9000

Type `rs` in the terminal to restart the main process.

### Building

Package the application:

```bash
npm run package
```

Create distributable packages:

```bash
npm run make
```

## Project Structure

```
├── src/
│   ├── App.jsx          # Main React component with graph and import functionality
│   ├── index.css        # Styles with Tailwind directives
│   ├── index.html       # HTML template
│   ├── main.js          # Electron main process with database IPC handlers
│   ├── preload.js       # Preload script exposing database API to renderer
│   ├── renderer.js      # Electron renderer process entry
│   ├── database.js      # SQLite database module with CRUD operations
│   ├── components/
│   │   ├── ItemGraph.jsx    # React Flow graph component
│   │   └── ItemDetails.jsx  # Item details modal
│   └── utils/
│       └── arcRaidersImporter.js  # Arc Raiders data import utility
├── webpack.main.config.js      # Webpack config for main process
├── webpack.renderer.config.js  # Webpack config for renderer process
├── webpack.rules.js            # Webpack loaders configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── package.json
```

## Available Scripts

- `npm start` - Start the app in development mode
- `npm run package` - Package the app
- `npm run make` - Create distributable packages
- `npm run publish` - Publish the app
- `npm run lint` - Run linter (not configured yet)

## Usage

1. **Start the application**: Run `npm start` to launch Arc Scanner
2. **View the graph**: The app starts with sample data showing weapons, resources, and their relationships
3. **Import real data**: Click "Import Arc Raiders Data" button to fetch real game data from GitHub
4. **Interact with the graph**:
   - **Drag** nodes to reposition them
   - **Scroll** to zoom in/out
   - **Click** nodes to view detailed information
   - Use **minimap** in bottom-right for navigation
   - Use **controls** in bottom-left for zoom/fit controls
5. **View details**: Click any node to open a modal with complete item information

## Database

The app stores data in a SQLite database located in your user data directory:
- **Windows**: `%APPDATA%/arc-scanner/arc-scanner.db`
- **macOS**: `~/Library/Application Support/arc-scanner/arc-scanner.db`
- **Linux**: `~/.config/arc-scanner/arc-scanner.db`

### Database Schema

**Items Table**:
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `type` (TEXT) - e.g., "Weapon", "Resource", "Armor"
- `rarity` (TEXT) - e.g., "common", "rare", "legendary"
- `description` (TEXT)
- `image_url` (TEXT)
- `data` (JSON) - Additional item properties
- `created_at` (DATETIME)

**Relations Table**:
- `id` (INTEGER, PRIMARY KEY)
- `source_id` (TEXT, FOREIGN KEY)
- `target_id` (TEXT, FOREIGN KEY)
- `relation_type` (TEXT) - e.g., "crafts_to", "requires", "upgrades_to"
- `weight` (REAL) - Relationship strength/quantity
- `data` (JSON) - Additional relation properties
- `created_at` (DATETIME)

**User Data Table**:
- `key` (TEXT, PRIMARY KEY)
- `value` (TEXT) - JSON-encoded value
- `updated_at` (DATETIME)

## Configuration

### Webpack

The project uses three webpack configuration files:

- **webpack.main.config.js**: Configuration for the main Electron process
- **webpack.renderer.config.js**: Configuration for the renderer process with React support
- **webpack.rules.js**: Shared loader rules including Babel for JSX files

### Babel

Babel is configured to use `@babel/preset-react` for JSX transformation.
