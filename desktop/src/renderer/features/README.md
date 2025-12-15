# Features Architecture

This directory contains all application features, organized using clean architecture principles.

## Structure

Each feature follows the same structure:

```
features/
├── {feature-name}/
│   ├── domain/          # Business logic and domain models
│   ├── data/            # Data access layer (repositories)
│   ├── hooks/           # React hooks for state management
│   ├── components/      # UI components (if needed)
│   ├── index.ts         # Public API exports
│   └── README.md        # Feature-specific documentation
```

## Features

### 1. Review (`features/review/`)
- **Purpose**: Quick note to permanent note review workflow
- **Domain Models**: `ReviewSession`, `ReviewState` (state machine)
- **Hooks**: `useReviewStatus`, `useReviewSession`
- **Components**: `ReviewSessionContainer`, `ReviewSessionView`

### 2. Notes (`features/notes/`)
- **Purpose**: Quick notes and permanent notes management
- **Domain Models**: `QuickNote`, `PermanentNote`
- **Hooks**: `useQuickNotes`, `useQuickNotesStatus`, `usePermanentNotes`, `usePermanentNotesSearch`
- **Repository**: `NotesRepository`

### 3. Chat (`features/chat/`)
- **Purpose**: AI chat conversations
- **Domain Models**: `Message`, `ChatSession`
- **Hooks**: `useChatSession`
- **Repository**: `ChatRepository`

### 4. Contexts (`features/contexts/`)
- **Purpose**: Hierarchical context management
- **Domain Models**: `Context`
- **Hooks**: `useContexts`
- **Repository**: `ContextsRepository`

### 5. Note-taking (`features/note-taking/`)
- **Purpose**: AI-powered note-taking agent
- **Domain Models**: `NoteTakingResult`
- **Hooks**: `useNoteTaking`
- **Repository**: `NoteTakingRepository`

## Design Patterns

### Domain Models
- Encapsulate business logic
- Immutable operations (return new instances)
- Type-safe and testable
- Convert to/from API data format

### Repository Pattern
- Abstracts data access
- Converts service layer data to domain models
- Easy to mock for testing
- Can add caching transparently

### Custom Hooks
- Single responsibility per hook
- Focused on specific use cases
- Reusable and composable
- Handle loading/error states

### Container/Presentational Pattern
- Container: Business logic, state, side effects
- Presentational: Pure UI, renders based on props
- Clear separation of concerns

## Usage

### Importing Features

```typescript
// Import domain models
import { QuickNote, PermanentNote } from '../../features/notes';
import { ChatSession, Message } from '../../features/chat';

// Import hooks
import { useQuickNotes, usePermanentNotes } from '../../features/notes';
import { useChatSession } from '../../features/chat';

// Import repositories (if needed directly)
import { notesRepository } from '../../features/notes';
```

### Using Hooks

```typescript
function MyComponent() {
  const { notes, isLoading, loadNotes } = useQuickNotes({ autoLoad: true });
  const { session, sendMessage } = useChatSession();
  
  // Use the hooks...
}
```

## Migration Status

- ✅ Review - Fully refactored
- ✅ Notes - Domain models, repository, hooks created
- ✅ Chat - Domain models, repository, hooks created
- ✅ Contexts - Domain models, repository, hooks created
- ✅ Note-taking - Domain models, repository, hooks created
- ⏳ Components - Some components still need Container/Presentational split

## Benefits

1. **Maintainability**: Clear structure, easy to find code
2. **Testability**: Isolated units, easy to mock
3. **Type Safety**: TypeScript ensures correct usage
4. **Reusability**: Hooks and models can be reused across components
5. **Scalability**: Patterns can be applied to new features
