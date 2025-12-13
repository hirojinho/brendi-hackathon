# UnifiedNotesList Component

## Overview

The `UnifiedNotesList` component provides a unified interface for displaying both QuickNote and PermanentNote types in a consistent, accessible design. It implements the requirements from task 9 of the notes-ui-integration specification.

## Features

✅ **Unified Display**: Handles both QuickNote and PermanentNote types seamlessly  
✅ **Consistent Design**: Uses macOS design system with consistent card layouts  
✅ **Visual Indicators**: Shows note type badges, review status, and context information  
✅ **Keyboard Navigation**: Full keyboard support with arrow keys, Enter, and shortcuts  
✅ **Bulk Selection**: Multi-select mode with bulk operations  
✅ **Search Highlighting**: Real-time search with highlighted matches  
✅ **Accessibility**: ARIA labels, focus management, and screen reader support  
✅ **Responsive**: Adapts to different screen sizes and system preferences  

## Requirements Validation

This component satisfies the following requirements from the specification:

- **1.2**: Display both quick notes and permanent notes in organized interface ✓
- **2.1**: Notes created through overlay interface are displayed ✓  
- **5.4**: Search result highlighting and context display ✓

## Usage

### Basic Usage

```tsx
import { UnifiedNotesList } from './components/desktop';
import type { QuickNote, PermanentNote, Context } from './services';

const MyNotesView = () => {
  const [notes, setNotes] = useState<(QuickNote | PermanentNote)[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);

  return (
    <UnifiedNotesList
      notes={notes}
      contexts={contexts}
      onNoteClick={(note) => console.log('Clicked:', note)}
      onNoteEdit={(note) => console.log('Edit:', note)}
      onNoteDelete={(id) => console.log('Delete:', id)}
    />
  );
};
```

### Advanced Usage with Search and Bulk Selection

```tsx
const AdvancedNotesView = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <UnifiedNotesList
      notes={notes}
      contexts={contexts}
      searchQuery={searchQuery}
      highlightMatches={true}
      selectedNoteIds={selectedIds}
      bulkSelectionMode={bulkMode}
      onNoteSelect={(id, selected) => {
        setSelectedIds(prev => 
          selected ? [...prev, id] : prev.filter(x => x !== id)
        );
      }}
      onBulkAction={(action, ids) => {
        console.log('Bulk action:', action, ids);
      }}
    />
  );
};
```

## Props Interface

```typescript
interface UnifiedNotesListProps {
  // Required
  notes: (QuickNote | PermanentNote)[];
  contexts: Context[];
  
  // Optional display options
  searchQuery?: string;
  highlightMatches?: boolean;
  selectedNoteIds?: string[];
  bulkSelectionMode?: boolean;
  className?: string;
  
  // Event handlers
  onNoteClick?: (note: NoteDisplayItem) => void;
  onNoteEdit?: (note: NoteDisplayItem) => void;
  onNoteDelete?: (noteId: string) => void;
  onNoteSelect?: (noteId: string, selected: boolean) => void;
  onBulkAction?: (action: string, noteIds: string[]) => void;
}
```

## Note Display Format

The component converts input notes to a unified `NoteDisplayItem` format:

```typescript
interface NoteDisplayItem {
  id: string;
  type: 'quick' | 'permanent';
  title: string;
  content: string;
  excerpt: string;           // Truncated content for display
  tags: string[];
  contextId: string | null;
  contextName?: string;      // Resolved from contexts array
  createdAt: Date;
  updatedAt: Date;
  reviewStatus?: 'pending' | 'reviewed' | 'transformed';
}
```

## Visual Indicators

### Note Type Badges
- **Q**: Quick notes (orange badge)
- **P**: Permanent notes (green badge)

### Review Status
- **⚠️**: Review required (yellow warning badge)

### Context Information
- **📁 Context Name**: Shows associated context for quick notes

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `↓` | Move focus to next note |
| `↑` | Move focus to previous note |
| `Enter` / `Space` | Select/click focused note |
| `Escape` | Clear focus |
| `Cmd/Ctrl + A` | Select all (in bulk mode) |

## Bulk Operations

When `bulkSelectionMode` is enabled:

1. Checkboxes appear on each note card
2. Clicking notes toggles selection
3. Bulk action bar shows selected count
4. Available actions: "Add Tags", "Delete"

## Styling

The component uses CSS custom properties from the macOS design system:

- Follows Apple's Human Interface Guidelines
- Supports Dark Mode automatically
- Responsive grid layout
- Smooth transitions and hover effects
- High contrast mode support

## Accessibility Features

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Visible focus indicators
- **Reduced Motion**: Respects system preferences
- **High Contrast**: Enhanced visibility when needed

## Performance Considerations

- **Virtual Scrolling**: Handles large note collections efficiently
- **Lazy Rendering**: Only renders visible notes
- **Optimized Re-renders**: Memoized components and callbacks
- **Search Debouncing**: Prevents excessive filtering operations

## Integration Example

See `UnifiedNotesListExample.tsx` for a complete integration example showing:

- Data loading from services
- Search functionality
- Bulk selection management
- Error handling
- Loading states

## Testing

The component includes comprehensive tests covering:

- Note rendering and display
- User interactions (click, edit, delete)
- Keyboard navigation
- Bulk selection
- Search highlighting
- Empty states
- Accessibility features

Run tests with your preferred testing framework (Jest recommended).