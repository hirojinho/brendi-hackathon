# Review Feature - Refactored Architecture

This feature has been refactored to follow clean architecture principles with clear separation of concerns.

## Structure

```
features/review/
├── domain/              # Business logic and domain models
│   ├── ReviewSession.ts # Domain model with business logic
│   └── ReviewState.ts   # State machine for session lifecycle
├── data/                # Data access layer
│   └── reviewRepository.ts # Repository interface and implementation
├── hooks/               # React hooks for state management
│   ├── useReviewStatus.ts  # Hook for fetching review status
│   └── useReviewSession.ts # Hook for managing session state machine
└── components/          # UI components
    ├── ReviewSessionContainer.tsx # Container (business logic)
    └── ReviewSessionView.tsx    # Presentational (pure UI)
```

## Key Design Patterns

### 1. Domain Model Pattern
- `ReviewSession` encapsulates business logic
- Immutable operations (returns new instances)
- Type-safe and testable

### 2. State Machine Pattern
- `ReviewState` defines all possible states
- `ReviewEvent` defines all possible transitions
- `reviewStateReducer` enforces valid transitions
- Prevents invalid states and makes flow explicit

### 3. Repository Pattern
- `ReviewRepository` interface abstracts data access
- `ReviewRepositoryImpl` wraps service layer
- Easy to mock for testing
- Can add caching transparently

### 4. Container/Presentational Pattern
- `ReviewSessionContainer`: Handles business logic, state, side effects
- `ReviewSessionView`: Pure UI component, renders based on props
- Clear separation of concerns
- Easier to test and maintain

### 5. Custom Hooks Pattern
- `useReviewStatus`: Focused on status queries
- `useReviewSession`: Manages session state machine
- Each hook has a single responsibility
- Reusable and composable

## Usage

### Basic Usage

```tsx
import { ReviewSessionContainer } from '../../features/review/components/ReviewSessionContainer';

function MyComponent() {
  return (
    <ReviewSessionContainer
      onComplete={() => console.log('Review completed')}
      onCancel={() => console.log('Review cancelled')}
    />
  );
}
```

### Using Hooks Directly

```tsx
import { useReviewSession, useReviewStatus } from '../../features/review';

function MyComponent() {
  const { state, processNote, isLoading } = useReviewSession();
  const { status, loadStatus } = useReviewStatus();
  
  // Use state machine state
  // ...
}
```

## State Machine States

- `idle`: Initial state
- `checking_session`: Checking for existing session
- `creating_session`: Creating new session
- `active`: Session active, showing note for review
- `processing`: Processing a note (transform/discard)
- `completed`: All notes processed
- `error`: Error occurred (with recoverable flag)

## Migration Notes

The old `ReviewSession` component is still available at `components/review/ReviewSession` for backward compatibility, but new code should use `ReviewSessionContainer` from this feature module.

The old `useReview` hook is still available but will be deprecated. Use the new focused hooks instead.

## Benefits

1. **Maintainability**: Clear structure, easy to find code
2. **Testability**: Isolated units, easy to mock
3. **Type Safety**: TypeScript ensures correct usage
4. **Predictability**: State machine prevents invalid states
5. **Scalability**: Patterns can be applied to other features
