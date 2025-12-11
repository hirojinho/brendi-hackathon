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
import './MinimalQuickNotesView.css';

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
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    contexts,
    loadContexts,
    deleteContext,
  } = useContexts({ hierarchy: true, autoLoad: true });

  useEffect(() => {
    loadData();
  }, [notesMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'Escape') {
        if (onBack) {
          onBack();
        }
        return;
      }

      if (filteredNotes.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredNotes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedNote = filteredNotes[selectedIndex];
        if (selectedNote) {
          if (notesMode === 'quick') {
            setSelectedNoteId(selectedNote.id);
          } else {
            handleSelectPermanentNote(selectedNote as PermanentNote);
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setNotesMode(notesMode === 'quick' ? 'permanent' : 'quick');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredNotes, selectedIndex, notesMode, onBack]);

  // Reset selected index when notes change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredNotes]);

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
    <div className="minimal-quick-notes">
      {/* Minimal header */}
      <div className="minimal-notes-header">
        <h1 className="minimal-notes-title">
          {notesMode === 'quick' ? 'Quick Notes' : 'Knowledge Base'}
        </h1>
        <div className="minimal-header-actions">
          <div className="minimal-mode-switcher">
            <button 
              className={`minimal-mode-button ${notesMode === 'quick' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('quick')}
            >
              Notes
            </button>
            <button 
              className={`minimal-mode-button ${notesMode === 'permanent' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('permanent')}
            >
              Knowledge
            </button>
          </div>
          {onBack && (
            <button onClick={onBack} className="minimal-back-btn">
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Search area */}
      <div className="minimal-search-area">
        <input
          type="text"
          placeholder={`Search ${notesMode === 'quick' ? 'notes' : 'knowledge base'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="minimal-search-input"
          autoFocus
        />
      </div>

      {/* Content area */}
      {isLoading ? (
        <div className="minimal-notes-loading">
          Loading {notesMode === 'quick' ? 'notes' : 'knowledge base'}...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="minimal-notes-empty">
          <h3>
            {searchQuery ? 'No matches found' : 
             notesMode === 'quick' ? 'No notes yet' : 'No knowledge yet'}
          </h3>
          <p>
            {searchQuery ? 'Try a different search term.' : 
             notesMode === 'quick' ? 'Start capturing thoughts in the note-taking interface.' :
             'Transform notes during review to build your knowledge base.'}
          </p>
        </div>
      ) : (
        <div className="minimal-notes-list">
          {notesMode === 'quick' ? (
            (filteredNotes as QuickNote[]).map((note, index) => (
              <div
                key={note.id}
                className={`minimal-note-card ${selectedNoteId === note.id || selectedIndex === index ? 'highlighted' : ''}`}
                data-note-id={note.id}
                tabIndex={0}
                onClick={() => {
                  setSelectedNoteId(note.id);
                  setSelectedIndex(index);
                }}
              >
                <div className="minimal-note-header">
                  <h3 className="minimal-note-title">{note.title}</h3>
                  <div className="minimal-note-actions">
                    <button 
                      className="minimal-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(note);
                      }}
                      title="Edit note"
                    >
                      ✏️
                    </button>
                    <button 
                      className="minimal-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      title="Delete note"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="minimal-note-content">{note.content}</div>
                <div className="minimal-note-meta">
                  <div className="minimal-note-tags">
                    {note.tags.map((tag, index) => (
                      <span key={index} className="minimal-note-tag">{tag}</span>
                    ))}
                  </div>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          ) : (
            (filteredNotes as PermanentNote[]).map((note, index) => (
              <div
                key={note.id}
                className={`minimal-note-card ${selectedIndex === index ? 'highlighted' : ''}`}
                tabIndex={0}
                onClick={() => {
                  handleSelectPermanentNote(note);
                  setSelectedIndex(index);
                }}
              >
                <div className="minimal-note-header">
                  <h3 className="minimal-note-title">{note.title}</h3>
                  <div className="minimal-note-actions">
                    <button 
                      className="minimal-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPermanentNote(note);
                      }}
                      title="Edit note"
                    >
                      ✏️
                    </button>
                    <button 
                      className="minimal-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePermanentNote(note.id);
                      }}
                      title="Delete note"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="minimal-note-content">{note.content}</div>
                <div className="minimal-note-meta">
                  <div className="minimal-note-tags">
                    {note.tags.map((tag, index) => (
                      <span key={index} className="minimal-note-tag">{tag}</span>
                    ))}
                  </div>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default QuickNotesView;

