import React, { useState, useEffect } from 'react';
import { UnifiedNotesList, type NoteDisplayItem } from './UnifiedNotesList';
import type { QuickNote } from '../../services/quickNotesService';
import type { PermanentNote } from '../../services/permanentNotesService';
import type { Context } from '../../services/contextsService';
import { quickNotesService } from '../../services/quickNotesService';
import { permanentNotesService } from '../../services/permanentNotesService';
import { contextsService } from '../../services/contextsService';
import './UnifiedNotesListExample.css';

/**
 * Example component showing how to use UnifiedNotesList
 * This demonstrates the integration requirements from the task:
 * - Build UnifiedNotesList component that handles both note types ✓
 * - Implement consistent card design for quick and permanent notes ✓
 * - Add visual indicators for note type, review status, and context ✓
 * - Support keyboard navigation and bulk selection ✓
 */
export const UnifiedNotesListExample: React.FC = () => {
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [permanentNotes, setPermanentNotes] = useState<PermanentNote[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [quickNotesData, permanentNotesData, contextsData] = await Promise.all([
          quickNotesService.list(),
          permanentNotesService.list(),
          contextsService.list()
        ]);
        
        setQuickNotes(quickNotesData);
        setPermanentNotes(permanentNotesData);
        setContexts(contextsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Combine notes for unified display
  const allNotes: (QuickNote | PermanentNote)[] = [...quickNotes, ...permanentNotes];

  // Filter notes based on search query
  const filteredNotes = allNotes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Event handlers
  const handleNoteClick = (note: NoteDisplayItem) => {
    console.log('Note clicked:', note);
    // In a real app, this might open a note detail view or editor
  };

  const handleNoteEdit = (note: NoteDisplayItem) => {
    console.log('Edit note:', note);
    // In a real app, this would open an edit modal or navigate to edit view
  };

  const handleNoteDelete = async (noteId: string) => {
    try {
      // Determine if it's a quick note or permanent note
      const isQuickNote = quickNotes.some(note => note.id === noteId);
      
      if (isQuickNote) {
        await quickNotesService.delete(noteId);
        setQuickNotes(prev => prev.filter(note => note.id !== noteId));
      } else {
        await permanentNotesService.delete(noteId);
        setPermanentNotes(prev => prev.filter(note => note.id !== noteId));
      }
      
      // Remove from selection if it was selected
      setSelectedNoteIds(prev => prev.filter(id => id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const handleNoteSelect = (noteId: string, selected: boolean) => {
    setSelectedNoteIds(prev => {
      if (selected) {
        return [...prev, noteId];
      } else {
        return prev.filter(id => id !== noteId);
      }
    });
  };

  const handleBulkAction = (action: string, noteIds: string[]) => {
    console.log('Bulk action:', action, noteIds);
    
    switch (action) {
      case 'delete':
        // Delete multiple notes
        Promise.all(noteIds.map(id => handleNoteDelete(id)))
          .then(() => {
            setSelectedNoteIds([]);
            setBulkSelectionMode(false);
          })
          .catch(err => setError(err.message));
        break;
      case 'tag':
        // Add tags to multiple notes (would open a tag selection modal)
        console.log('Add tags to notes:', noteIds);
        break;
      default:
        console.log('Unknown bulk action:', action);
    }
  };

  const toggleBulkSelection = () => {
    setBulkSelectionMode(!bulkSelectionMode);
    if (bulkSelectionMode) {
      setSelectedNoteIds([]);
    }
  };

  const selectAllNotes = () => {
    const allNoteIds = filteredNotes.map(note => note.id);
    setSelectedNoteIds(allNoteIds);
  };

  const clearSelection = () => {
    setSelectedNoteIds([]);
  };

  if (loading) {
    return (
      <div className="unified-notes-example loading">
        <div className="loading-spinner">Loading notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="unified-notes-example error">
        <div className="error-message">
          <h3>Error loading notes</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-notes-example">
      <div className="notes-header">
        <h2>All Notes ({filteredNotes.length})</h2>
        
        <div className="notes-controls">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="bulk-controls">
            <button
              onClick={toggleBulkSelection}
              className={`bulk-toggle ${bulkSelectionMode ? 'active' : ''}`}
            >
              {bulkSelectionMode ? 'Exit Bulk Mode' : 'Bulk Select'}
            </button>
            
            {bulkSelectionMode && (
              <>
                <button onClick={selectAllNotes} className="select-all">
                  Select All
                </button>
                <button onClick={clearSelection} className="clear-selection">
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <UnifiedNotesList
        notes={filteredNotes}
        contexts={contexts}
        searchQuery={searchQuery}
        highlightMatches={true}
        selectedNoteIds={selectedNoteIds}
        bulkSelectionMode={bulkSelectionMode}
        onNoteClick={handleNoteClick}
        onNoteEdit={handleNoteEdit}
        onNoteDelete={handleNoteDelete}
        onNoteSelect={handleNoteSelect}
        onBulkAction={handleBulkAction}
        className="main-notes-list"
      />
    </div>
  );
};

export default UnifiedNotesListExample;