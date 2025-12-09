import React, { useState, useMemo } from 'react';
import { QuickNote } from '../services/quickNotesService';
import { Context } from '../services/contextsService';
import { ContextBadge } from './contexts';
import './NotesGraphView.css';

interface NotesGraphViewProps {
  notes: QuickNote[];
  contexts: Context[];
  selectedContextId: string | null;
  onNoteClick?: (noteId: string) => void;
  onContextClick?: (contextId: string) => void;
}

interface ContextDrawer {
  context: Context;
  notes: QuickNote[];
  children: ContextDrawer[];
  isExpanded: boolean;
  depth: number;
}

const NotesGraphView: React.FC<NotesGraphViewProps> = ({
  notes,
  contexts,
  selectedContextId,
  onNoteClick,
  onContextClick
}) => {
  const [expandedContexts, setExpandedContexts] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  // Build context hierarchy with notes
  const contextDrawers = useMemo(() => {
    const buildDrawer = (ctx: Context, depth: number = 0): ContextDrawer => {
      const notesInContext = notes.filter(n => n.contextId === ctx.id);
      const children = (ctx.children || []).map(child => buildDrawer(child, depth + 1));
      
      return {
        context: ctx,
        notes: notesInContext,
        children,
        isExpanded: expandedContexts.has(ctx.id),
        depth
      };
    };

    return contexts
      .filter(ctx => !ctx.parentId)
      .map(ctx => buildDrawer(ctx, 0));
  }, [contexts, notes, expandedContexts]);

  // Get notes without context
  const notesWithoutContext = useMemo(() => {
    return notes.filter(note => !note.contextId);
  }, [notes]);

  const toggleContext = (contextId: string) => {
    setExpandedContexts(prev => {
      const next = new Set(prev);
      if (next.has(contextId)) {
        next.delete(contextId);
      } else {
        next.add(contextId);
      }
      return next;
    });
  };

  const toggleNote = (noteId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderContextDrawer = (drawer: ContextDrawer): React.ReactNode => {
    const hasContent = drawer.notes.length > 0 || drawer.children.length > 0;
    const isExpanded = expandedContexts.has(drawer.context.id);
    const isSelected = selectedContextId === drawer.context.id;

    return (
      <div key={drawer.context.id} className="context-drawer" style={{ marginLeft: `${drawer.depth * 24}px` }}>
        <div
          className={`context-drawer-header ${isSelected ? 'selected' : ''}`}
          onClick={() => {
            if (hasContent) {
              toggleContext(drawer.context.id);
            }
            if (onContextClick) {
              onContextClick(drawer.context.id);
            }
          }}
        >
          <div className="drawer-toggle">
            {hasContent ? (
              <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
            ) : (
              <span className="toggle-icon-placeholder">•</span>
            )}
          </div>
          <div className="drawer-content">
            <div className="drawer-title">
              <span className="context-icon">📁</span>
              <span className="context-name">{drawer.context.name}</span>
              {drawer.context.description && (
                <span className="context-description">{drawer.context.description}</span>
              )}
            </div>
            <div className="drawer-meta">
              {drawer.notes.length > 0 && (
                <span className="drawer-count">{drawer.notes.length} note{drawer.notes.length !== 1 ? 's' : ''}</span>
              )}
              {drawer.children.length > 0 && (
                <span className="drawer-count">{drawer.children.length} sub-source{drawer.children.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="drawer-body">
            {/* Render child contexts */}
            {drawer.children.map(child => renderContextDrawer(child))}

            {/* Render notes in this context */}
            {drawer.notes.map(note => renderNoteItem(note, drawer.depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderNoteItem = (note: QuickNote, depth: number): React.ReactNode => {
    const isExpanded = expandedNotes.has(note.id);
    const isHovered = hoveredNote === note.id;

    return (
      <div
        key={note.id}
        className={`note-item ${isHovered ? 'hovered' : ''}`}
        style={{ marginLeft: `${depth * 24}px` }}
        onMouseEnter={() => setHoveredNote(note.id)}
        onMouseLeave={() => setHoveredNote(null)}
        onClick={() => {
          toggleNote(note.id);
          if (onNoteClick) {
            onNoteClick(note.id);
          }
        }}
      >
        <div className="note-item-header">
          <div className="drawer-toggle">
            <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          </div>
          <div className="note-item-content">
            <div className="note-title">{note.title}</div>
            {note.tags.length > 0 && (
              <div className="note-tags">
                {note.tags.map((tag, idx) => (
                  <span key={idx} className="note-tag">{tag}</span>
                ))}
              </div>
            )}
            <div className="note-meta">
              <span className="note-date">{formatDate(note.createdAt)}</span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="note-item-body">
            <div className="note-content">{note.content}</div>
            {note.lastModified !== note.createdAt && (
              <div className="note-meta">
                <span className="note-date">Modified: {formatDate(note.lastModified)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="notes-drawer-view">
      <div className="drawer-container">
        {/* Render context drawers */}
        {contextDrawers.length > 0 ? (
          contextDrawers.map(drawer => renderContextDrawer(drawer))
        ) : (
          <div className="empty-state">
            <p>No sources yet. Sources will be created automatically when you take notes.</p>
          </div>
        )}

        {/* Render notes without context */}
        {notesWithoutContext.length > 0 && (
          <div className="uncategorized-section">
            <div className="section-header">
              <span className="section-icon">📄</span>
              <span className="section-title">Uncategorized Notes</span>
              <span className="section-count">{notesWithoutContext.length}</span>
            </div>
            <div className="section-body">
              {notesWithoutContext.map(note => renderNoteItem(note, 0))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesGraphView;
