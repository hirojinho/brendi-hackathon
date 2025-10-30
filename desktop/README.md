# Study Assistant Desktop App

macOS desktop overlay application for Study Assistant with embedded backend.

## Features

- **Global Shortcut**: Press `Option+Space` to toggle overlay
- **Chat Interface**: Ask questions with optional RAG support
- **Note Creation**: Save conversations as notes
- **Embedded Backend**: No external server needed - backend runs embedded in Electron
- **Local Databases**: All data stored locally in user's Application Support directory

## Development

### Prerequisites

- Node.js 20+
- npm or pnpm

### Setup

1. Install dependencies for both server and desktop:
```bash
# Install server dependencies
cd ../server
npm install

# Install desktop dependencies
cd ../desktop
npm install
```

2. Start development:
```bash
cd desktop
npm run dev
```

This will:
- Automatically build the server if needed (checks on startup)
- Compile the main process TypeScript (with watch mode)
- Start Vite dev server for the renderer
- Launch Electron app

The `predev` script ensures the server is built before starting Electron.

### Troubleshooting

If you see "Server not built" errors:
```bash
cd ../server
npm run build
```

Then restart the desktop app.

### Configuration

API keys can be configured via the UI (Settings panel - coming soon) or directly via:
- `electron-store` config in `~/Library/Application Support/study-assistant-desktop/config.json`

Set these keys:
- `openaiApiKey`
- `openrouterApiKey`  
- `ollamaBaseUrl`

## Building

Build for production:
```bash
npm run build
```

Package as macOS app:
```bash
npm run package:mac
```

## Project Structure

```
desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Main entry, window management, IPC
│   │   ├── backend.ts  # Backend embedding helper
│   │   └── preload.ts  # Preload script (IPC bridge)
│   └── renderer/       # React renderer process
│       ├── main.tsx
│       ├── App.tsx
│       └── components/
└── dist/               # Compiled output
```

## Notes

- Backend is embedded in the main process
- Databases are stored in `~/Library/Application Support/study-assistant-desktop/`
- Backend listens on `127.0.0.1` (loopback only) for security

