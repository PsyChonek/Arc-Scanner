# Arc-Scanner

An Electron application built with React and Webpack.

## Setup

This project was set up using Electron Forge with React integration following the [official Electron Forge React guide](https://www.electronforge.io/guides/framework-integration/react).

### Technologies

- **Electron**: Desktop application framework
- **React**: UI library
- **Webpack**: Module bundler
- **Babel**: JavaScript compiler for React JSX

## Getting Started

### Prerequisites

- Node.js and npm installed

### Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

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
│   ├── App.jsx          # Main React component
│   ├── index.css        # Styles
│   ├── index.html       # HTML template
│   ├── main.js          # Electron main process
│   └── renderer.js      # Electron renderer process entry
├── webpack.main.config.js      # Webpack config for main process
├── webpack.renderer.config.js  # Webpack config for renderer process
├── webpack.rules.js            # Webpack loaders configuration
└── package.json
```

## Available Scripts

- `npm start` - Start the app in development mode
- `npm run package` - Package the app
- `npm run make` - Create distributable packages
- `npm run publish` - Publish the app
- `npm run lint` - Run linter (not configured yet)

## Configuration

### Webpack

The project uses three webpack configuration files:

- **webpack.main.config.js**: Configuration for the main Electron process
- **webpack.renderer.config.js**: Configuration for the renderer process with React support
- **webpack.rules.js**: Shared loader rules including Babel for JSX files

### Babel

Babel is configured to use `@babel/preset-react` for JSX transformation.
