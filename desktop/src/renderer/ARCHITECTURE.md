# Desktop Frontend Architecture

## Overview

The desktop frontend follows a clean, modular architecture that separates concerns into distinct layers:

- **Types**: TypeScript interfaces and types
- **Services**: Business logic and API communication
- **Hooks**: Reusable React hooks for state management
- **Components**: UI components organized by domain

## Directory Structure

```
src/renderer/
├── components/
│   ├── chat/              # Chat-specific components
│   │   ├── ChatMessage.tsx
│   │   ├── ChatMessages.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatActions.tsx
│   │   └── index.ts
│   ├── layout/            # Layout components
│   │   ├── ChatHeader.tsx
│   │   ├── ChatControls.tsx
│   │   ├── StatusMessage.tsx
│   │   └── index.ts
│   ├── common/             # Shared components
│   │   ├── MarkdownRenderer.tsx
│   │   └── index.ts
│   ├── ChatBox.tsx         # Main chat container
│   └── SettingsPanel.tsx   # Settings modal
├── hooks/                  # Custom React hooks
│   ├── useChat.ts
│   ├── useBackendHealth.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useSettings.ts
│   └── index.ts
├── services/               # Business logic layer
│   ├── chatService.ts
│   ├── noteService.ts
│   ├── settingsService.ts
│   └── index.ts
├── types/                  # TypeScript definitions
│   ├── chat.ts
│   ├── settings.ts
│   └── index.ts
├── App.tsx                 # Root component
└── main.tsx               # React entry point
```

## Architecture Layers

### 1. Types Layer (`types/`)

Defines all TypeScript interfaces and types used throughout the application.

- `chat.ts`: Chat-related types (Message, ChatRequest, ChatResponse, etc.)
- `settings.ts`: Settings-related types (Settings, SettingsState)
- `index.ts`: Re-exports all types

### 2. Services Layer (`services/`)

Contains business logic and API communication. Services abstract away the Electron IPC calls.

- `chatService.ts`: Handles chat API calls and error formatting
- `noteService.ts`: Handles note creation and validation
- `settingsService.ts`: Manages settings loading and saving
- Each service is a singleton class exported as a constant

**Benefits:**
- Centralized error handling
- Easy to mock for testing
- Separation of API logic from UI

### 3. Hooks Layer (`hooks/`)

Custom React hooks that encapsulate state management and side effects.

- `useChat`: Manages chat state (messages, input, loading, etc.)
- `useBackendHealth`: Polls backend health status
- `useKeyboardShortcuts`: Handles keyboard shortcuts (ESC to close)
- `useSettings`: Manages settings state and persistence

**Benefits:**
- Reusable logic
- Clean component code
- Easy to test independently

### 4. Components Layer (`components/`)

UI components organized by domain and purpose.

#### Domain-Specific Components (`chat/`)
- `ChatMessage`: Single message display
- `ChatMessages`: Message list with scrolling
- `ChatInput`: Input form for sending messages
- `ChatActions`: Action buttons (e.g., "Save as Note")

#### Layout Components (`layout/`)
- `ChatHeader`: Header with title and action buttons
- `ChatControls`: Model selection and RAG controls
- `StatusMessage`: Status/error message display

#### Common Components (`common/`)
- `MarkdownRenderer`: Renders markdown and LaTeX

#### Container Components
- `ChatBox`: Main chat container that orchestrates child components
- `SettingsPanel`: Settings modal

**Benefits:**
- Single Responsibility Principle
- Easy to test individual components
- Better code reusability
- Clear component hierarchy

## Data Flow

```
User Action
    ↓
Component (UI)
    ↓
Hook (State Management)
    ↓
Service (Business Logic)
    ↓
Electron API (IPC)
    ↓
Backend
```

## Design Principles

1. **Separation of Concerns**: Each layer has a clear responsibility
2. **Single Responsibility**: Components and functions do one thing
3. **DRY (Don't Repeat Yourself)**: Reusable hooks and services
4. **Type Safety**: Full TypeScript coverage
5. **Composition**: Build complex UIs from simple components

## Adding New Features

### Adding a new feature:

1. **Define Types** (`types/`)
   - Create or extend type definitions

2. **Create Service** (`services/`)
   - Add business logic and API calls
   - Handle errors and validation

3. **Create Hook** (`hooks/`)
   - Encapsulate state and side effects
   - Use services for API calls

4. **Create Components** (`components/`)
   - Split into small, focused components
   - Use hooks for state management

5. **Compose in Container** (`components/`)
   - Orchestrate smaller components
   - Pass data via props

## Benefits of This Architecture

- **Maintainability**: Clear structure makes it easy to find and modify code
- **Scalability**: Easy to add new features without affecting existing code
- **Testability**: Each layer can be tested independently
- **Reusability**: Hooks and services can be reused across components
- **Type Safety**: TypeScript catches errors at compile time
- **Developer Experience**: Better IDE autocomplete and navigation

