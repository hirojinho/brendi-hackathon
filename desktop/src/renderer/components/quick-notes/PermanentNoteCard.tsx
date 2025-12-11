import React, { useState } from 'react';
import { PermanentNote } from '../../services/permanentNotesService';
import { permanentNotesService } from '../../services/permanentNotesService';
import './PermanentNoteCard.css';

interface PermanentNoteCardProps {
  note: PermanentNote;
  searchQuery?: string;
  isSelected?: boolean;
  isEditing?: boolean;
  editingNote?: PermanentNote | null;
  onEdit?: (note: PermanentNote) => void;
  onSave?: () => void;
  onCancelEdit?: () => void;
  onDelete?: (id: string) => void;
  onEditingNoteChange?: (note: PermanentNote | null) => void;
  onSelect?: (note: PermanentNote) => void;
}

const PermanentNoteCard: React.FC<PermanentNoteCardProps> = ({
  note,
  searchQuery = '',
  isSelected = false,
  isEditing = false,
  editingNote,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onEditingNoteChange,
  onSelect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingNote && onEditingNoteChange) {
      onEditingNoteChange({
        ...editingNote,
        title: e.target.value
      });
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (editingNote && onEditingNoteChange) {
      onEditingNoteChange({
        ...editingNote,
        content: e.target.value
      });
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingNote && onEditingNoteChange) {
      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      onEditingNoteChange({
        ...editingNote,
        tags
      });
    }
  };

  const handleCardClick = () => {
    if (!isEditing && onSelect) {
      onSelect(note);
    }
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    return permanentNotesService.highlightSearchTerms(text, searchQuery);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className={`permanent-note-card ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
      data-note-id={note.id}
      onClick={handleCardClick}
    >
      <div className="permanent-note-header">
        {isEditing ? (
          <input
            type="text"
            value={editingNote?.title || ''}
            onChange={handleTitleChange}
            className="permanent-note-title-input"
            placeholder="Note title..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 
            className="permanent-note-title"
            dangerouslySetInnerHTML={{ __html: highlightText(note.title) }}
          />
        )}
        
        <div className="permanent-note-meta">
          <span className="permanent-note-date">
            Created: {formatDate(note.createdAt)}
          </span>
          {note.updatedAt !== note.createdAt && (
            <span className="permanent-note-date">
              Updated: {formatDate(note.updatedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="permanent-note-content">
        {isEditing ? (
          <textarea
            value={editingNote?.content || ''}
            onChange={handleContentChange}
            className="permanent-note-content-input"
            placeholder="Note content..."
            rows={8}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="permanent-note-text">
            {isExpanded ? (
              <div dangerouslySetInnerHTML={{ __html: highlightText(note.content) }} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: highlightText(truncateContent(note.content)) }} />
            )}
            {note.content.length > 200 && (
              <button 
                className="expand-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {note.tags.length > 0 && (
        <div className="permanent-note-tags">
          {isEditing ? (
            <input
              type="text"
              value={editingNote?.tags.join(', ') || ''}
              onChange={handleTagsChange}
              className="permanent-note-tags-input"
              placeholder="Tags (comma separated)..."
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="tags-list">
              {note.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="permanent-note-actions">
        {isEditing ? (
          <>
            <button 
              className="save-button"
              onClick={(e) => {
                e.stopPropagation();
                onSave?.();
              }}
            >
              Save
            </button>
            <button 
              className="cancel-button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelEdit?.();
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button 
              className="edit-button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(note);
              }}
            >
              Edit
            </button>
            <button 
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(note.id);
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PermanentNoteCard;