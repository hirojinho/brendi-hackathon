## macOS Desktop Overlay App - Implementation Plan

### Goals
- **Overlay UI**: Toggle with a global shortcut to open a centered, lightweight modal over other apps.
- **Quick questions**: Send prompts to embedded backend `/api/chat` with optional RAG.
- **Note creation**: Turn a question/answer into notes via `/api/note` (and later, direct save APIs if needed).
- **Fully embedded backend**: Backend runs embedded in Electron Main process - no separate server needed, no server hosting costs.
- **Local-first per-user databases**: SQLite databases stored in Electron's `userData` directory, isolated per user.

### Tech Choices
- **Framework**: Electron (Node compatibility with existing backend + mature macOS APIs).
- **Renderer**: Vite + React + TypeScript (match existing web stack familiarity).
- **Packaging**: `electron-builder` for macOS (arm64, x64, universal optional).
- **IPC/Data flow**: Renderer → Main via `ipcMain` channels; Main → Embedded Express server (localhost only).
- **Security**: Express server listens only on `127.0.0.1` (loopback), no external access. Renderer never hits HTTP directly; Main acts as gateway.

### Backend Integration (embedded architecture)
- **Embedded Express Server**: Runs in Electron Main process, listens on `127.0.0.1:<random_port>` (chosen at startup).
- **Database location**: Uses Electron's `app.getPath('userData')` directory:
  - `documents.db` → `~/Library/Application Support/<AppName>/documents.db`
  - `study_notes.db` → `~/Library/Application Support/<AppName>/study_notes.db`
  - `uploads/` → `~/Library/Application Support/<AppName>/uploads/`
- **Environment variables**: Stored securely in Electron's secure storage or config file in `userData`. User can configure API keys via settings UI.
- **CORS**: Not needed - server only accessible via loopback from Main process.
- **Key endpoints** (same as web version):
  - `POST /api/chat` body: `{ message: string, history?: ChatMessage[], model?: 'openai'|'openrouter'|'ollama', modelName?: string, useRag?: boolean, maxChunks?: number }` → `{ response: string, retrievedChunks?: {documentId, chunkIndex, text, similarity}[] }`.
  - `POST /api/note` body: `{ content: string, model?: 'openai'|'openrouter'|'ollama', modelName?: string }` → `{ notes: Note[] }` (LLM-generated; controller enforces `content.length >= 100`).

### Backend Embedding Strategy
- **Embedding approach**: Import and initialize Express server directly in Electron Main process (no child process needed).
- **Database path override**: Backend currently uses `process.cwd()` for database paths. Two approaches:
  1. **Quick approach**: Change `process.cwd()` to `app.getPath('userData')` before backend initialization.
  2. **Clean approach** (future): Refactor backend to accept configurable database paths via `AppConfig`.
- **Server lifecycle**: Start Express server when Electron app is ready; stop gracefully on app quit.
- **Port management**: Choose random available port on startup; Main process stores port for internal HTTP calls.

### Project Structure (new)
```
desktop/
  package.json
  electron-builder.yml
  src/
    main/
      main.ts        # create window, register shortcuts, IPC, embed Express server
      preload.ts     # expose safe APIs
      backend.ts     # helper to initialize embedded Express server with userData paths
    renderer/
      index.html
      main.tsx
      App.tsx        # overlay modal UI
      components/
        Overlay.tsx
        ChatBox.tsx
        NoteActions.tsx
        Settings.tsx # configure API keys
      styles/
        overlay.css
```

### Overlay UX Spec
- **Window**: Frameless, transparent, always-on-top, shadowed centered modal; show/hide with global shortcut.
- **Shortcut**: `Option+Space` (configurable later). Toggle behavior: show if hidden; hide if visible.
- **Focus**: Auto-focus input when opened; ESC to hide.
- **Fields**: Prompt input, optional toggles: model (dropdown), RAG toggle, maxChunks (only if RAG), Submit button.
- **Result**: Shows assistant reply; actions: Copy, “Save as Note,” “Append to Note” (later), “Open full app” (later).

### IPC and Main responsibilities
- `chat:send` → Main calls backend `/api/chat`, returns `{ response, retrievedChunks }`.
- `note:create` → Main posts to `/api/note` with composed content (ensure ≥ 100 chars for v1).
- `overlay:toggle` → Show/hide window.
- `config:get`/`config:set` → Local persisted config (model defaults, shortcut mapping later).
- `server:health` → Check backend reachability; show inline status.

### Minimal Electron Main sketch
```ts
// main.ts (sketch)
import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import getPort from 'get-port';
import { initializeBackend } from './backend.js'; // embedded Express server

let win: BrowserWindow | null = null;
let backendUrl: string | null = null;
let server: any = null;

async function startBackend() {
  const userDataPath = app.getPath('userData');
  
  // Override cwd so backend databases are created in userData
  const originalCwd = process.cwd();
  process.chdir(userDataPath);
  
  try {
    const port = await getPort({ port: 3001 });
    const result = await initializeBackend(port); // starts Express
    backendUrl = `http://127.0.0.1:${port}`;
    server = result.server;
    console.log(`Backend running at ${backendUrl}`);
  } finally {
    // Restore original cwd if needed elsewhere
    process.chdir(originalCwd);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 700,
    height: 520,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    vibrancy: 'sidebar',
    webPreferences: { 
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.loadURL(process.env.ELECTRON_START_URL ?? `file://${path.join(__dirname, '../renderer/index.html')}`);
}

app.whenReady().then(async () => {
  await startBackend();
  createWindow();
  
  globalShortcut.register('Alt+Space', () => {
    if (!win) return;
    if (win.isVisible()) { win.hide(); } else { win.center(); win.show(); win.focus(); }
  });
  
  // IPC handlers
  ipcMain.handle('chat:send', async (_, payload) => {
    const res = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  });
});

app.on('before-quit', async () => {
  globalShortcut.unregisterAll();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});
```

### Backend Embedding Implementation
- **Main process initialization**:
  1. On `app.whenReady()`, set `process.chdir(app.getPath('userData'))` to redirect `process.cwd()`.
  2. Load/build backend container and Express app from `server/dist/` (or import TS directly if compiled).
  3. Start Express server on random available port (e.g., use `get-port` package).
  4. Store server URL (`http://127.0.0.1:<port>`) for internal use.
  5. Listen only on `127.0.0.1` (no external access).
- **Database initialization**: Databases automatically created in `userData` directory via `process.cwd()` override.
- **Environment variables**: Load from Electron's config store or `.env` file in `userData`. User can update via Settings UI.
- **Server lifecycle**: 
  - Start: When Electron app ready.
  - Stop: On `app.on('before-quit')`, gracefully close Express server.
  - Error handling: Log errors; don't crash Electron app.

### Networking Plan
- **All modes** (dev + prod): Backend embedded, `BASE_URL = http://127.0.0.1:<port>` (random chosen on startup).
- **Port selection**: Use `get-port` to find available port, start at `3001` and increment if needed.
- **Requests**: Made only from Main process (via Node `fetch` or `axios`); renderer requests via IPC.
- **No external network**: Server only accessible via loopback, ensuring security.

### Data Mapping
- Chat request model (renderer state → backend body):
```ts
{
  message: string,
  history?: { role: 'user'|'assistant', content: string }[],
  model?: 'openai'|'openrouter'|'ollama',
  modelName?: string,
  useRag?: boolean,
  maxChunks?: number
}
```
- Note creation (v1): Concatenate last user prompt + assistant response + optional sources to exceed 100 char threshold.

### Milestones and Tasks
1) Scaffold Electron app in `desktop/` with TS, Vite React, electron-builder
   - Packages: `electron`, `electron-builder`, `vite`, `react`, `react-dom`, `typescript`, `esbuild`, `cross-env`.
   - Scripts: `dev` (Vite + Electron), `build`, `dist`.

2) Main process: window, global shortcut, IPC
   - Create overlay window (frameless, transparent, always-on-top).
   - Register `Alt+Space` global shortcut.
   - Implement IPC: `chat:send`, `note:create`, `overlay:toggle`, `server:health`.

3) Backend embedding
   - Import/build backend Express server in Main process.
   - Override `process.cwd()` to `app.getPath('userData')` before backend init.
   - Start Express on random loopback port; store URL for Main process calls.
   - Implement graceful shutdown on app quit.
   - Environment variable management: Load from Electron config store or `userData/.env`.
   - Settings UI for configuring API keys (`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_BASE_URL`).

4) Renderer overlay UI
   - Minimal input + submit; show response; Save-as-Note button.
   - Model selector and RAG toggle (optional panel).
   - Keyboard UX: Enter to send, ESC to hide.

5) Note creation flow
   - Compose content ≥ 100 chars.
   - POST `/api/note`; display created notes count/preview.
   - Error states and retries.

6) Packaging for macOS
   - `electron-builder.yml` with mac target: `dmg`, `zip`.
   - App ID, icon, hardened runtime; code signing (if available).
   - Notarization optional for distribution; skip for local installs.

7) Nice-to-haves (post-v1)
   - Menu bar/tray icon with quick toggle.
   - Customizable shortcut.
   - Capture selected text from foreground app (Accessibility permission + AppleScript), seed prompt.
   - “Save raw note” endpoint in backend bypassing LLM length check.
   - Streaming responses (if backend adds stream support).
   - Auto-updates (`electron-updater`).

### Acceptance Criteria (v1)
- Global shortcut toggles overlay reliably.
- Can send a prompt and receive an answer using the configured model.
- Can save a response as a note; notes appear in existing system (verified via backend list endpoint or database).
- Works on macOS (Apple Silicon) as an unsigned build.

### Risks and Mitigations
- **Database path conflicts**: Using `process.cwd()` override is a quick solution but fragile. Future: refactor backend to accept explicit paths in config.
- **Backend initialization timing**: Ensure Express server starts before IPC handlers try to use it. Use async/await in `app.whenReady()`.
- **Environment variable persistence**: Store API keys securely in Electron's config store (e.g., `electron-store` package). Never hardcode.
- **Content length constraint for notes**: Compose longer content initially (Q + A). Future: add lightweight note endpoint that bypasses LLM generation.
- **SQLite native module compatibility**: Ensure `better-sqlite3` native bindings work with Electron's Node version. May need to rebuild or use `electron-rebuild`.

### Dev How-To
1. Build backend (if needed): `cd server && pnpm build` → outputs to `server/dist/`.
2. Start desktop: `cd desktop && pnpm dev` → Electron starts and embeds backend automatically.
3. Press `Alt+Space` to open overlay; configure API keys in Settings if needed; type question; Save as Note.
4. Databases are created in `~/Library/Application Support/<AppName>/` automatically.

### Next Steps
- Create `desktop/` scaffold and baseline overlay window.
- Wire `chat:send` to `/api/chat`.
- Wire `note:create` to `/api/note`.

