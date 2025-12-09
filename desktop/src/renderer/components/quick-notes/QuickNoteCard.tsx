import React from 'react';
import type { Context } from '../../services/contextsService';
import type { QuickNote } from '../../services/quickNotesService';
import { ContextBadge, ContextSelector } from '../contexts';
import './QuickNoteCard.css';

interface QuickNoteCardProps {
  note: QuickNote;
  contexts: Context[];
  isEditing: boolean;
  editingNote: QuickNote | null;
  isSelected: boolean;
  onEdit: (note: QuickNote) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onEditingNoteChange: (note: QuickNote | null) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const QuickNoteCard: React.FC<QuickNoteCardProps> = ({
  note,
  contexts,
  isEditing,
  editingNote,
  isSelected,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onEditingNoteChange,
}) => {
  if (isEditing && editingNote) {
    return (
      <div className="quick-note-card editing" data-note-id={note.id}>
        <div className="quick-note-edit">
          <input
            type="text"
            value={editingNote.title}
            onChange={(e) => onEditingNoteChange({ ...editingNote, title: e.target.value })}
            className="edit-title"
            placeholder="Title"
          />
          <textarea
            value={editingNote.content}
            onChange={(e) => onEditingNoteChange({ ...editingNote, content: e.target.value })}
            className="edit-content"
            placeholder="Content"
            rows={6}
          />
          <div className="edit-tags">
            <input
              type="text"
              value={editingNote.tags.join(', ')}
              onChange={(e) => onEditingNoteChange({ 
                ...editingNote, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
              })}
              className="edit-tags-input"
              placeholder="Tags (comma-separated)"
            />
          </div>
          <div className="edit-context">
            <label>Source:</label>
            <ContextSelector
              contexts={contexts}
              value={editingNote.contextId}
              onChange={(contextId) => onEditingNoteChange({ ...editingNote, contextId })}
              placeholder="No Source"
              showNoneOption={true}
              className="edit-context-select"
            />
          </div>
          <div className="edit-actions">
            <button onClick={onSave} className="save-btn">Save</button>
            <button onClick={onCancelEdit} className="cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`quick-note-card ${isSelected ? 'highlighted' : ''}`}
      data-note-id={note.id}
      onClick={() => {}}
    >
      <div className="quick-note-header">
        <h3 className="quick-note-title">{note.title}</h3>
        <div className="quick-note-actions">
          <button onClick={() => onEdit(note)} className="edit-btn" title="Edit">✏️</button>
          <button onClick={() => onDelete(note.id)} className="delete-btn" title="Delete">🗑️</button>
        </div>
      </div>
      {note.contextId && (
        <div className="quick-note-context">
          <ContextBadge contexts={contexts} contextId={note.contextId} />
        </div>
      )}
      <div className="quick-note-content">{note.content}</div>
      {note.tags.length > 0 && (
        <div className="quick-note-tags">
          {note.tags.map((tag, idx) => (
            <span key={idx} className="quick-note-tag">{tag}</span>
          ))}
        </div>
      )}
      <div className="quick-note-footer">
        <span className="quick-note-date">Created: {formatDate(note.createdAt)}</span>
        {note.lastModified !== note.createdAt && (
          <span className="quick-note-date">Modified: {formatDate(note.lastModified)}</span>
        )}
      </div>
    </div>
  );
};

