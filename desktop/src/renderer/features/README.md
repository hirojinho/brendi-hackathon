# Features Architecture

This directory contains all application features, organized using clean architecture principles.

## Structure

Each feature follows the same structure:

```
features/
├── {feature-name}/
│   ├── domain/          # Business logic and domain models
│   ├── data/            # Data access layer (repositories with caching)
│   ├── hooks/           # React hooks for state management
│   ├── components/      # UI components (Container/Presentational pattern)
│   ├── index.ts         # Public API exports
│   └── README.md        # Feature-specific documentation
```

## Features

### 1. Review (`features/review/`)
- **Purpose**: Quick note to permanent note review workflow
- **Domain Models**: `ReviewSession`, `ReviewState` (state machine)
- **Hooks**: `useReviewStatus`, `useReviewSession`
- **Components**: `ReviewSessionContainer`, `ReviewSessionView`
- **Repository**: `ReviewRepository` with caching (3s TTL)

### 2. Notes (`features/notes/`)
- **Purpose**: Quick notes and permanent notes management
- **Domain Models**: `QuickNote`, `PermanentNote`
- **Hooks**: `useQuickNotes`, `useQuickNotesStatus`, `usePermanentNotes`, `usePermanentNotesSearch`
- **Repository**: `NotesRepository` with caching (5s TTL)

### 3. Chat (`features/chat/`)
- **Purpose**: AI chat conversations
- **Domain Models**: `Message`, `ChatSession`
- **Hooks**: `useChatSession`
- **Components**: `ChatContainer`, `ChatView`
- **Repository**: `ChatRepository`

### 4. Contexts (`features/contexts/`)
- **Purpose**: Hierarchical context management
- **Domain Models**: `Context`
- **Hooks**: `useContexts`
- **Repository**: `ContextsRepository` with caching (10s TTL)

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
- **Caching**: Automatic caching with TTL
- **Cache Invalidation**: Smart invalidation on mutations
- Easy to mock for testing

### Custom Hooks
- Single responsibility per hook
- Focused on specific use cases
- Reusable and composable
- Handle loading/error states

### Container/Presentational Pattern
- **Container**: Business logic, state, side effects
- **Presentational**: Pure UI, renders based on props
- Clear separation of concerns

### State Machine Pattern (Review Feature)
- Explicit state transitions
- Prevents invalid states
- Self-documenting flow

## Caching

All repositories implement automatic caching:

- **Review**: 3 second TTL
- **Notes**: 5 second TTL
- **Contexts**: 10 second TTL (change less frequently)
- **Cache Invalidation**: Automatic on mutations (create/update/delete)

Cache keys follow pattern: `{feature}:{resource}:{id}` or `{feature}:{resource}:{filter}`

## Usage

### Importing Features

```typescript
// Import domain models
import { QuickNote, PermanentNote } from '../../features/notes';
import { ChatSession, Message } from '../../features/chat';

// Import hooks
import { useQuickNotes, usePermanentNotes } from '../../features/notes';
import { useChatSession } from '../../features/chat';

// Import components
import { ChatContainer } from '../../features/chat/components/ChatContainer';
import { ReviewSessionContainer } from '../../features/review/components/ReviewSessionContainer';

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

- ✅ Review - Fully refactored (with Container/Presentational)
- ✅ Notes - Domain models, repository, hooks, caching
- ✅ Chat - Domain models, repository, hooks, Container/Presentational
- ✅ Contexts - Domain models, repository, hooks, caching
- ✅ Note-taking - Domain models, repository, hooks
- ✅ Components migrated to use new hooks
- ✅ Caching layer added to all repositories
- ✅ Old hooks deprecated with migration guide

## Benefits

1. **Maintainability**: Clear structure, easy to find code
2. **Testability**: Isolated units, easy to mock
3. **Type Safety**: TypeScript ensures correct usage
4. **Performance**: Automatic caching reduces API calls
5. **Reusability**: Hooks and models can be reused across components
6. **Scalability**: Patterns can be applied to new features

## Next Steps (Optional)

1. Add optimistic updates for better UX
2. Add request deduplication
3. Add React Query-style query invalidation
4. Apply patterns to remaining components
