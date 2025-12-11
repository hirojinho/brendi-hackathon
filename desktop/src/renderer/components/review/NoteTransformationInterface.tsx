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



  const getAgeInHours = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours;
  };

  const ageHours = getAgeInHours(note.createdAt);

  return (
    <>
      {/* Note display */}
      <div className="minimal-review-note">
        <div className="minimal-review-note-header">
          <h2 className="minimal-review-note-title">{note.title}</h2>
          <div className="minimal-review-note-age">{ageHours}h old</div>
        </div>
        <div className="minimal-review-note-content">{note.content}</div>
        {note.tags.length > 0 && (
          <div className="minimal-review-note-tags">
            {note.tags.map((tag, index) => (
              <span key={index} className="minimal-review-note-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Transformation interface */}
      {isEditing ? (
        <div className="minimal-transformation">
          <div className="minimal-transformation-header">
            Transform to Permanent Note
          </div>
          
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="Enter a title..."
            className="minimal-transformation-input"
            disabled={isProcessing}
            autoFocus
          />
          
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Edit the content..."
            className="minimal-transformation-textarea"
            disabled={isProcessing}
          />
          
          <div className="minimal-transformation-actions">
            <button
              onClick={() => setIsEditing(false)}
              className="minimal-transformation-btn cancel"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleTransform}
              className="minimal-transformation-btn save"
              disabled={isProcessing}
            >
              {isProcessing ? 'Saving...' : 'Save to Knowledge Base'}
            </button>
          </div>
        </div>
      ) : (
        <div className="minimal-review-actions">
          <button
            onClick={handleTransform}
            className="minimal-review-btn transform"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Keep & Transform'}
          </button>
          
          {showDiscardConfirm ? (
            <button
              onClick={handleDiscard}
              className="minimal-review-btn discard"
              disabled={isProcessing}
            >
              Confirm Discard
            </button>
          ) : (
            <button
              onClick={handleDiscard}
              className="minimal-review-btn discard"
              disabled={isProcessing}
            >
              Discard
            </button>
          )}
        </div>
      )}
    </>
  );
};