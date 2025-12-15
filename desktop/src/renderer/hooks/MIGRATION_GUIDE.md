# Migration Guide: Old Hooks to New Feature-Based Architecture

This guide helps you migrate from the old hooks to the new feature-based architecture.

## Overview

The old hooks (`useReview`, `useChat`, `useNoteTaking`, `useContexts`, etc.) are being deprecated in favor of feature-based hooks that follow clean architecture principles.

## Migration Table

| Old Hook | New Hook(s) | Location |
|----------|-------------|----------|
| `useReview` | `useReviewStatus`, `useReviewSession` | `features/review/hooks/` |
| `useChat` | `useChatSession` | `features/chat/hooks/` |
| `useNoteTaking` | `useNoteTaking` | `features/note-taking/hooks/` |
| `useContexts` | `useContexts` | `features/contexts/hooks/` |
| `useQuickNotesStatus` | `useQuickNotesStatus` | `features/notes/hooks/` |

## Detailed Migrations

### 1. Review Feature

**Old:**
```typescript
import { useReview } from '../../hooks/useReview';

const {
  reviewStatus,
  activeSession,
  isLoading,
  isReviewRequired,
  reviewCount,
  createReviewSession,
  processNote,
} = useReview({ autoLoad: true });
```

**New:**
```typescript
import { useReviewStatus } from '../../features/review/hooks/useReviewStatus';
import { useReviewSession } from '../../features/review/hooks/useReviewSession';

// For status
const { status: reviewStatus, isLoading } = useReviewStatus({ autoLoad: true });
const isReviewRequired = reviewStatus?.isReviewRequired || false;
const reviewCount = reviewStatus?.reviewCount || 0;

// For session management
const {
  state,
  session,
  currentNote,
  processNote,
  isLoading: sessionLoading,
} = useReviewSession({ autoInitialize: true });
```

### 2. Chat Feature

**Old:**
```typescript
import { useChat } from '../../hooks/useChat';

const {
  messages,
  input,
  isLoading,
  sendMessage,
  setInput,
  setModel,
} = useChat({ initialModel: 'openai' });
```

**New:**
```typescript
import { useChatSession } from '../../features/chat/hooks/useChatSession';

const [input, setInput] = useState('');
const {
  messages,
  isLoading,
  sendMessage: sendChatMessage,
  updateSettings,
} = useChatSession({ initialModel: 'openai' });

const sendMessage = () => {
  if (input.trim()) {
    sendChatMessage(input);
    setInput('');
  }
};
```

### 3. Note-Taking Feature

**Old:**
```typescript
import { useNoteTaking } from '../../hooks/useNoteTaking';

const {
  input,
  isLoading,
  lastResult,
  processInput,
  setInput,
} = useNoteTaking({ selectedContextId });
```

**New:**
```typescript
import { useNoteTaking } from '../../features/note-taking/hooks/useNoteTaking';

const {
  input,
  setInput,
  isLoading,
  result: lastResult,
  processInput,
} = useNoteTaking({ selectedContextId });
```

### 4. Contexts Feature

**Old:**
```typescript
import { useContexts } from '../../hooks/useContexts';

const {
  contexts,
  isLoading,
  createContext,
  updateContext,
  deleteContext,
} = useContexts({ hierarchy: true, autoLoad: true });
```

**New:**
```typescript
import { useContexts } from '../../features/contexts/hooks/useContexts';

const {
  contexts, // Now returns Context domain models
  isLoading,
  createContext,
  updateContext,
  deleteContext,
} = useContexts({ hierarchy: true, autoLoad: true });

// Convert to service format if needed for backward compatibility
const contextsForDisplay = contexts.map(ctx => ctx.toData());
```

### 5. Notes Feature

**Old:**
```typescript
import { quickNotesService } from '../../services/quickNotesService';
import { permanentNotesService } from '../../services/permanentNotesService';

const notes = await quickNotesService.list();
const permanentNotes = await permanentNotesService.list();
```

**New:**
```typescript
import { useQuickNotes } from '../../features/notes/hooks/useQuickNotes';
import { usePermanentNotes } from '../../features/notes/hooks/usePermanentNotes';

const { notes, isLoading, loadNotes } = useQuickNotes({ autoLoad: true });
const { notes: permanentNotes, isLoading: permanentLoading, loadNotes: loadPermanent } = usePermanentNotes({ autoLoad: true });
```

## Benefits of Migration

1. **Type Safety**: Domain models provide better type safety
2. **Caching**: Automatic caching reduces API calls
3. **Separation of Concerns**: Clear separation between UI, business logic, and data
4. **Testability**: Easier to test with domain models and repositories
5. **Maintainability**: Feature-based organization makes code easier to find and maintain

## Deprecation Timeline

- **Phase 1 (Current)**: New hooks available, old hooks still work
- **Phase 2 (Future)**: Old hooks marked as deprecated with warnings
- **Phase 3 (Future)**: Old hooks removed

## Need Help?

If you encounter issues during migration, check:
1. The feature's `README.md` in `features/{feature-name}/README.md`
2. The feature's `index.ts` for available exports
3. Domain model documentation in `features/{feature-name}/domain/`
