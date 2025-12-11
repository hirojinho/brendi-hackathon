import React, { useState, useEffect } from 'react';
import type { QuickNote } from '../../types/review';
import './NoteTransformationInterface.css';

interface NoteTransformationInterfaceProps {
  note: QuickNote;
  onTransform: (permanentNoteData: {
    title?: string;
    content?: string;
    tags?: string[];
  }) => void;
  onDiscard: () => void;
  isProcessing?: boolean;
}

export const NoteTransformationInterface: React.FC<NoteTransformationInterfaceProps> = ({
  note,
  onTransform,
  onDiscard,
  isProcessing = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note.title);
  const [editedContent, setEditedContent] = useState(note.content);
  const [editedTags, setEditedTags] = useState(note.tags.join(', '));
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Reset form when note changes
  useEffect(() => {
    setEditedTitle(note.title);
    setEditedContent(note.content);
    setEditedTags(note.tags.join(', '));
    setIsEditing(false);
    setShowDiscardConfirm(false);
  }, [note.id]);

  const handleTransform = () => {
    const permanentNoteData: {
      title?: string;
      content?: string;
      tags?: string[];
    } = {};

    // Only include fields that have been modified
    if (editedTitle !== note.title) {
      permanentNoteData.title = editedTitle.trim();
    }
    if (editedContent !== note.content) {
      permanentNoteData.content = editedContent.trim();
    }
    
    const parsedTags = editedTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    if (JSON.stringify(parsedTags) !== JSON.stringify(note.tags)) {
      permanentNoteData.tags = parsedTags;
    }

    onTransform(permanentNoteData);
  };

  const handleDiscard = () => {
    if (showDiscardConfirm) {
      onDiscard();
    } else {
      setShowDiscardConfirm(true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getAgeInHours = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours;
  };

  const ageHours = getAgeInHours(note.createdAt);

  return (
    <div className="note-transformation-interface">
      <div className="note-metadata">
        <div className="note-age">
          <span className="age-label">Created:</span>
          <span className="age-value">{formatDate(note.createdAt)}</span>
          <span className="age-hours">({ageHours}h ago)</span>
        </div>
        {note.tags.length > 0 && (
          <div className="note-tags">
            {note.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="note-content-section">
        <div className="section-header">
          <h3>Note Content</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="edit-toggle"
            disabled={isProcessing}
          >
            {isEditing ? 'Preview' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <div className="edit-form">
            <div className="form-group">
              <label htmlFor="title">Title:</label>
              <input
                id="title"
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Enter a title for this note..."
                disabled={isProcessing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">Content:</label>
              <textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Edit the note content..."
                rows={8}
                disabled={isProcessing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags (comma-separated):</label>
              <input
                id="tags"
                type="text"
                value={editedTags}
                onChange={(e) => setEditedTags(e.target.value)}
                placeholder="tag1, tag2, tag3..."
                disabled={isProcessing}
              />
            </div>
          </div>
        ) : (
          <div className="note-preview">
            <div className="preview-title">
              {editedTitle || note.title}
            </div>
            <div className="preview-content">
              {editedContent || note.content}
            </div>
            {editedTags && (
              <div className="preview-tags">
                {editedTags.split(',').map((tag, index) => (
                  <span key={index} className="tag">{tag.trim()}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="action-buttons">
        <div className="primary-actions">
          <button
            onClick={handleTransform}
            className="btn-transform"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Transform to Permanent Note'}
          </button>
        </div>

        <div className="secondary-actions">
          {showDiscardConfirm ? (
            <div className="discard-confirm">
              <span className="confirm-text">Are you sure?</span>
              <button
                onClick={handleDiscard}
                className="btn-discard-confirm"
                disabled={isProcessing}
              >
                Yes, Discard
              </button>
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="btn-cancel"
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleDiscard}
              className="btn-discard"
              disabled={isProcessing}
            >
              Discard Note
            </button>
          )}
        </div>
      </div>
    </div>
  );
};