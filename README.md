# Arc-Scanner

An Electron application built with React and Webpack for visualizing Arc Raiders game item relationships.

## Features

### Navigation
- **Dual-View Interface**: Switch between Graph View and Item Tracker with tabbed navigation
  - Graph View: Original interactive visualization
  - Item Tracker: New progress tracking system

### Interactive Graph Visualization
- **Explore Relationships**: View and navigate item relationships with an interactive node graph
  - Drag nodes to reposition them
  - Zoom and pan to navigate the graph
  - Click on nodes to view detailed item information
  - Mini-map for overview navigation
  - Color-coded nodes by rarity (common, uncommon, rare, epic, legendary)
  - Color-coded edges by relationship type (crafts_to, requires, combines_with, upgrades_to)

### Item Tracker (New!)
- **Track Upgrades & Quests**: Manage your progression through the game
  - Create tracked items for upgrades and quests
  - Add custom names, types, and notes
  - Mark items as completed with visual indicators
  - View completion timestamps

- **Requirements Management**: 
  - Define required items/materials for each tracked upgrade
  - Specify quantities needed
  - Real-time comparison of owned vs. needed quantities
  - Visual indicators (✓/✗) showing requirement fulfillment

- **Inventory System**:
  - Track items you own with quantities
  - Search and add items from the complete database
  - Update quantities as you collect materials
  - Remove items you no longer need to track

### SQLite Database
- **Persistent Storage**: All data stored locally in SQLite
  - Items table with id, name, type, rarity, description, and custom data
  - Relations table for tracking item relationships
  - User data table for app settings
  - **Inventory table**: Track owned items and quantities
  - **Tracked items table**: Store upgrade/quest goals
  - **Requirements table**: Link materials to tracked items

### Arc Raiders Data Integration
- **Import Real Game Data**: One-click import from community repository
  - Fetch data from [RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data)
  - Automatic transformation to graph format
  - Includes items, hideout modules, quests, and skill nodes

### Modern UI
- **Tailwind CSS**: Fast, responsive styling with utility classes
- **Modal Dialogs**: Clean interfaces for adding items and managing requirements
- **Error Handling**: User-friendly error messages with auto-dismiss
- **Confirmation Modals**: Safe deletion with confirmation dialogs

## Setup

This project was set up using Electron Forge with React integration following the [official Electron Forge React guide](https://www.electronforge.io/guides/framework-integration/react).

### Technologies

- **Electron**: Desktop application framework
- **React**: UI library
- **React Flow**: Interactive graph visualization
- **Webpack**: Module bundler
- **Babel**: JavaScript compiler for React JSX
- **Tailwind CSS**: Utility-first CSS framework
- **sql.js**: Pure JavaScript SQLite implementation (no native compilation required)

## Getting Started

### Prerequisites

- Node.js and npm installed

### Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

**No build tools required**: This app now uses `sql.js`, a pure JavaScript SQLite implementation that doesn't require native compilation. You can install and run the app without needing Python, C++ compilers, or other build tools.

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

### Getting Started
1. **Start the application**: Run `npm start` to launch Arc Scanner
2. **Import real data**: Click "Import Arc Raiders Data" button to fetch real game data from GitHub
3. **Choose your view**: Use the navigation tabs to switch between Graph View and Item Tracker

### Using Graph View
1. **Interact with the graph**:
   - **Drag** nodes to reposition them
   - **Scroll** to zoom in/out
   - **Click** nodes to view detailed information
   - Use **minimap** in bottom-right for navigation
   - Use **controls** in bottom-left for zoom/fit controls
2. **View details**: Click any node to open a modal with complete item information

### Using Item Tracker
1. **Track an upgrade or quest**:
   - Click "Add Tracked Item" button
   - Enter a name (e.g., "Upgrade Hideout Module")
   - Choose type (Upgrade or Quest)
   - Add optional notes
   - Click "Add" to save

2. **Add requirements**:
   - Click "Requirements" button on any tracked item
   - Search for required items/materials
   - Click items to add them to requirements list
   - System automatically compares owned vs needed quantities

3. **Manage inventory**:
   - Use the search box in the Inventory section
   - Search for items you own
   - Click to add them to your inventory
   - Adjust quantities as needed
   - Remove items when no longer needed

4. **Mark progress**:
   - Check the checkbox on tracked items when completed
   - Completed items show with green background and timestamp
   - Requirements with ✓ indicate you have enough materials

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

**Inventory Table** (New!):
- `item_id` (TEXT, PRIMARY KEY, FOREIGN KEY)
- `quantity` (INTEGER) - Amount owned
- `added_at` (DATETIME)

**Tracked Items Table** (New!):
- `id` (INTEGER, PRIMARY KEY)
- `item_id` (TEXT, FOREIGN KEY)
- `name` (TEXT) - Display name for the tracked item
- `type` (TEXT) - "upgrade" or "quest"
- `completed` (BOOLEAN) - Completion status
- `notes` (TEXT) - User notes
- `created_at` (DATETIME)
- `completed_at` (DATETIME) - When marked complete

**Tracked Item Requirements Table** (New!):
- `id` (INTEGER, PRIMARY KEY)
- `tracked_item_id` (INTEGER, FOREIGN KEY)
- `required_item_id` (TEXT, FOREIGN KEY)
- `quantity_needed` (INTEGER) - How many are needed

## Configuration

### Webpack

The project uses three webpack configuration files:

- **webpack.main.config.js**: Configuration for the main Electron process
- **webpack.renderer.config.js**: Configuration for the renderer process with React support
- **webpack.rules.js**: Shared loader rules including Babel for JSX files

### Babel

Babel is configured to use `@babel/preset-react` for JSX transformation.

## Data Attribution

This application uses Arc Raiders game data from the community-maintained repository:

- **Data Source**: Arc Raiders community data
- **License**: See [assets/arcraiders-data-main/LICENSE](assets/arcraiders-data-main/LICENSE)
- **Data includes**: Items, hideout modules, quests, skill nodes, and projects
- **Images**: Item icons stored in `assets/arcraiders-data-main/images/items/`

The Arc Raiders data is maintained by the community and regularly updated to reflect the latest game content.

## Contributing

Contributions are welcome! Here's how you can help:

### Reporting Issues

If you encounter any bugs or have suggestions for improvements:

1. Check if the issue already exists in the GitHub Issues
2. If not, create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Code Contributions

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style
4. Test your changes thoroughly
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Data Updates

To update the Arc Raiders game data:

1. Replace the contents of `assets/arcraiders-data-main/` with the latest data
2. Ensure `items.json` follows the expected format
3. Verify images are in `assets/arcraiders-data-main/images/items/`
4. Test the import functionality
5. Submit a Pull Request with the updates

### Development Guidelines

- Follow the existing code structure and naming conventions
- Add comments for complex logic
- Test on multiple platforms when possible (Windows, macOS, Linux)
- Keep dependencies up to date
- Follow Electron security best practices

## License

This project is licensed under the MIT License - see the LICENSE file for details.

The Arc Raiders game data included in this application is subject to its own license terms (see `assets/arcraiders-data-main/LICENSE`).
