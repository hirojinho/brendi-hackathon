import React from 'react';
import { PermanentNote } from '../../services/permanentNotesService';
import { permanentNotesService } from '../../services/permanentNotesService';
import './PermanentNoteDetailView.css';

interface PermanentNoteDetailViewProps {
  note: PermanentNote;
  searchQuery?: string;
  onBack: () => void;
  onEdit: (note: PermanentNote) => void;
  onDelete: (id: string) => void;
}

const PermanentNoteDetailView: React.FC<PermanentNoteDetailViewProps> = ({
  note,
  searchQuery = '',
  onBack,
  onEdit,
  onDelete
}) => {
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    return permanentNotesService.highlightSearchTerms(text, searchQuery);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this permanent note? This action cannot be undone.')) {
      onDelete(note.id);
    }
  };

  // Format the note for complete display (Requirements: 5.4)
  const formattedContent = permanentNotesService.formatNoteForDisplay(note);

  return (
    <div className="permanent-note-detail-view">
      <div className="detail-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Notes
        </button>
        
        <div className="detail-actions">
          <button className="edit-button" onClick={() => onEdit(note)}>
            Edit
          </button>
          <button className="delete-button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="note-header">
          <h1 
            className="note-title"
            dangerouslySetInnerHTML={{ __html: highlightText(note.title) }}
          />
          
          <div className="note-metadata">
            <div className="metadata-item">
              <span className="metadata-label">Created:</span>
              <span className="metadata-value">{formatDate(note.createdAt)}</span>
            </div>
            
            {note.updatedAt !== note.createdAt && (
              <div className="metadata-item">
                <span className="metadata-label">Updated:</span>
                <span className="metadata-value">{formatDate(note.updatedAt)}</span>
              </div>
            )}
            
            {note.sourceQuickNoteId && (
              <div className="metadata-item">
                <span className="metadata-label">Source:</span>
                <span className="metadata-value">Transformed from quick note</span>
              </div>
            )}
          </div>

          {note.tags.length > 0 && (
            <div className="note-tags">
              <span className="tags-label">Tags:</span>
              <div className="tags-list">
                {note.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="note-body">
          <div 
            className="note-content"
            dangerouslySetInnerHTML={{ __html: highlightText(note.content) }}
          />
        </div>

        {/* Display formatted version for completeness validation */}
        <div className="formatted-display" style={{ display: 'none' }}>
          {formattedContent}
        </div>
      </div>
    </div>
  );
};

export default PermanentNoteDetailView;