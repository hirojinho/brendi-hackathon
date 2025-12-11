import React, { useState, useEffect, useMemo } from 'react';
import { quickNotesService, type QuickNote } from '../../services/quickNotesService';
import { permanentNotesService, type PermanentNote } from '../../services/permanentNotesService';
import { useContexts } from '../../hooks/useContexts';
import { ChatHeader } from '../layout';
import NotesGraphView from '../NotesGraphView';
// import { ContextSelector, ContextTree, ContextBadge } from '../contexts'; // Unused
import { /* getContextName, */ countNotesForContext } from '../../utils/contextUtils';
import { QuickNotesHeader } from './QuickNotesHeader';
import { QuickNotesFilters } from './QuickNotesFilters';
import { QuickNoteCard } from './QuickNoteCard';
import PermanentNoteCard from './PermanentNoteCard';
import PermanentNoteDetailView from './PermanentNoteDetailView';
import { SourcesManagementPanel } from './SourcesManagementPanel';
import { QuickNotesStatusIndicator } from './QuickNotesStatusIndicator';
import '../QuickNotesView.css';

interface QuickNotesViewProps {
  onBack?: () => void;
}

type NotesMode = 'quick' | 'permanent';

const QuickNotesView: React.FC<QuickNotesViewProps> = ({ onBack }) => {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [permanentNotes, setPermanentNotes] = useState<PermanentNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [editingPermanentNote, setEditingPermanentNote] = useState<PermanentNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [showSourcesManagement, setShowSourcesManagement] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notesMode, setNotesMode] = useState<NotesMode>('quick');
  const [selectedPermanentNote, setSelectedPermanentNote] = useState<PermanentNote | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);

  const {
    contexts,
    loadContexts,
    deleteContext,
  } = useContexts({ hierarchy: true, autoLoad: true });

  useEffect(() => {
    loadData();
  }, [notesMode]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (notesMode === 'quick') {
        const [loadedNotes] = await Promise.all([
          quickNotesService.list(),
          loadContexts(),
        ]);
        setNotes(loadedNotes);
      } else {
        const [loadedPermanentNotes] = await Promise.all([
          permanentNotesService.list(),
          loadContexts(),
        ]);
        setPermanentNotes(loadedPermanentNotes);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (note: QuickNote) => {
    setEditingNote({ ...note });
  };

  const handleSave = async () => {
    if (!editingNote) return;
    try {
      await quickNotesService.update({
        id: editingNote.id,
        title: editingNote.title,
        content: editingNote.content,
        tags: editingNote.tags,
        contextId: editingNote.contextId
      });
      setEditingNote(null);
      await loadData();
    } catch (error) {
      console.error('Failed to update note:', error);
      alert('Failed to update note. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await quickNotesService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const handleDeleteContext = async (id: string) => {
    const context = contexts.find(ctx => ctx.id === id);
    const notesCount = countNotesForContext(id, contexts, notes);
    
    let message = `Are you sure you want to delete the source "${context?.name}"?`;
    if (notesCount > 0) {
      message += `\n\nThis will unlink ${notesCount} note${notesCount !== 1 ? 's' : ''} from this source (notes will not be deleted).`;
    }
    
    if (!confirm(message)) return;
    
    try {
      await deleteContext(id);
      await loadData();
      // Clear filter if the deleted context was selected
      if (selectedContextId === id) {
        setSelectedContextId(null);
      }
    } catch (error) {
      console.error('Failed to delete source:', error);
      alert('Failed to delete source. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
  };

  // Permanent Notes handlers
  const handleEditPermanentNote = (note: PermanentNote) => {
    setEditingPermanentNote({ ...note });
  };

  const handleSavePermanentNote = async () => {
    if (!editingPermanentNote) return;
    try {
      await permanentNotesService.update({
        id: editingPermanentNote.id,
        title: editingPermanentNote.title,
        content: editingPermanentNote.content,
        tags: editingPermanentNote.tags
      });
      setEditingPermanentNote(null);
      await loadData();
    } catch (error) {
      console.error('Failed to update permanent note:', error);
      alert('Failed to update permanent note. Please try again.');
    }
  };

  const handleDeletePermanentNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this permanent note? This action cannot be undone.')) return;
    try {
      await permanentNotesService.delete(id);
      await loadData();
      // Close detail view if the deleted note was being viewed
      if (selectedPermanentNote?.id === id) {
        setShowDetailView(false);
        setSelectedPermanentNote(null);
      }
    } catch (error) {
      console.error('Failed to delete permanent note:', error);
      alert('Failed to delete permanent note. Please try again.');
    }
  };

  const handleCancelEditPermanentNote = () => {
    setEditingPermanentNote(null);
  };

  const handleSelectPermanentNote = (note: PermanentNote) => {
    setSelectedPermanentNote(note);
    setShowDetailView(true);
  };

  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedPermanentNote(null);
  };

  const handleModeSwitch = (mode: NotesMode) => {
    setNotesMode(mode);
    setSearchQuery(''); // Clear search when switching modes
    setEditingNote(null);
    setEditingPermanentNote(null);
    setShowDetailView(false);
    setSelectedPermanentNote(null);
  };

  const filteredNotes = useMemo(() => {
    if (notesMode === 'permanent') {
      return permanentNotes.filter(note => {
        // Filter by search query for permanent notes
        const query = searchQuery.toLowerCase();
        if (query) {
          return (
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query) ||
            note.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }
        return true;
      });
    }

    return notes.filter(note => {
      // Filter by context (only for quick notes)
      if (selectedContextId !== null) {
        if (selectedContextId === 'none' && note.contextId !== null) return false;
        if (selectedContextId !== 'none' && note.contextId !== selectedContextId) return false;
      }
      
      // Filter by search query
      const query = searchQuery.toLowerCase();
      if (query) {
        return (
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [notes, permanentNotes, selectedContextId, searchQuery, notesMode]);

  // Show detail view for permanent notes
  if (showDetailView && selectedPermanentNote) {
    return (
      <div className="quick-notes-view">
        <ChatHeader
          onSettingsClick={() => {}}
          onClose={() => window.electronAPI.toggleOverlay()}
        />
        <PermanentNoteDetailView
          note={selectedPermanentNote}
          searchQuery={searchQuery}
          onBack={handleBackFromDetail}
          onEdit={handleEditPermanentNote}
          onDelete={handleDeletePermanentNote}
        />
      </div>
    );
  }

  return (
    <div className="quick-notes-view">
      <ChatHeader
        onSettingsClick={() => {}}
        onClose={() => window.electronAPI.toggleOverlay()}
      />

      <QuickNotesHeader
        onBack={onBack}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showSourcesManagement={showSourcesManagement}
        onToggleSourcesManagement={() => setShowSourcesManagement(!showSourcesManagement)}
      />

      {/* Mode switcher */}
      <div className="notes-mode-switcher">
        <button 
          className={`mode-button ${notesMode === 'quick' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('quick')}
        >
          Quick Notes
        </button>
        <button 
          className={`mode-button ${notesMode === 'permanent' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('permanent')}
        >
          Knowledge Base
        </button>
      </div>

      {showSourcesManagement && notesMode === 'quick' && (
        <SourcesManagementPanel
          contexts={contexts}
          notes={notes}
          onDeleteContext={handleDeleteContext}
        />
      )}

      {notesMode === 'quick' && <QuickNotesStatusIndicator onReload={loadData} />}

      <QuickNotesFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedContextId={notesMode === 'quick' ? selectedContextId : null}
        onContextChange={setSelectedContextId}
        contexts={notesMode === 'quick' ? contexts : []}
        showContextFilter={notesMode === 'quick'}
      />

      {isLoading ? (
        <div className="quick-notes-loading">Loading {notesMode === 'quick' ? 'quick notes' : 'permanent notes'}...</div>
      ) : viewMode === 'graph' && notesMode === 'quick' ? (
        <NotesGraphView
          notes={filteredNotes as QuickNote[]}
          contexts={contexts}
          selectedContextId={selectedContextId}
          onNoteClick={(noteId) => {
            setSelectedNoteId(noteId);
            setViewMode('list');
            // Scroll to note in list view
            setTimeout(() => {
              const element = document.querySelector(`[data-note-id="${noteId}"]`);
              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }}
          onContextClick={(contextId) => {
            setSelectedContextId(contextId);
          }}
        />
      ) : filteredNotes.length === 0 ? (
        <div className="quick-notes-empty">
          {searchQuery ? 'No notes match your search.' : 
           notesMode === 'quick' ? 'No quick notes yet. Start taking notes in Note-Taking Agent Mode!' :
           'No permanent notes yet. Transform some quick notes during review to build your knowledge base!'}
        </div>
      ) : (
        <div className="quick-notes-list">
          {notesMode === 'quick' ? (
            (filteredNotes as QuickNote[]).map((note) => (
              <QuickNoteCard
                key={note.id}
                note={note}
                contexts={contexts}
                isEditing={editingNote?.id === note.id}
                editingNote={editingNote}
                isSelected={selectedNoteId === note.id}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancelEdit={handleCancelEdit}
                onDelete={handleDelete}
                onEditingNoteChange={setEditingNote}
              />
            ))
          ) : (
            (filteredNotes as PermanentNote[]).map((note) => (
              <PermanentNoteCard
                key={note.id}
                note={note}
                searchQuery={searchQuery}
                isEditing={editingPermanentNote?.id === note.id}
                editingNote={editingPermanentNote}
                onEdit={handleEditPermanentNote}
                onSave={handleSavePermanentNote}
                onCancelEdit={handleCancelEditPermanentNote}
                onDelete={handleDeletePermanentNote}
                onEditingNoteChange={setEditingPermanentNote}
                onSelect={handleSelectPermanentNote}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default QuickNotesView;

