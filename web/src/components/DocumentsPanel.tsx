import React, { useRef, useEffect } from 'react';
import { useDocumentManager } from '../hooks/useDocumentManager';
import { documentsLogic } from '../services/documentsService';

const DocumentsPanel: React.FC<{ embeddingProvider: 'openai' | 'ollama' }> = ({ embeddingProvider }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use our custom hook for all document management logic
  const documentManager = useDocumentManager(embeddingProvider);
  
  // Extract values from the hook for easier access
  const {
    // Document state
    isLoadingDocs,
    filteredDocuments,
    searchQuery,
    setSearchQuery,
    
    // Upload state
    selectedFile,
    setSelectedFile,
    isUploading,
    uploadProgress,
    uploadSuccess,
    uploadError,
    currentUploadId,
    
    // Modal state
    modalDoc,
    modalUsage,
    modalLoading,
    modalError,
    
    // Error state
    deleteError,
    
    // Actions
    uploadDocument,
    deleteDocument,
    openModal,
    closeModal,
    handleFileDrop,
    handleDragOver,
  } = documentManager;

  // Close modal on outside click
  useEffect(() => {
    if (!modalDoc) return;
    const handler = (e: MouseEvent) => {
      const modal = document.getElementById('doc-modal');
      if (modal && !modal.contains(e.target as Node)) {
        closeModal();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modalDoc, closeModal]);

  return (
    <div className="documents-container">
      <h2 className="documents-title">📚 Document Library</h2>
      <div className="documents-upload-section">
        {/* Progress bar and status */}
        {(isUploading || currentUploadId) && uploadProgress && (
          <div style={{ width: '100%', marginBottom: 18 }}>
            <div style={{ height: 12, background: '#23272f', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
              <div
                style={{
                  width: `${uploadProgress.progress}%`,
                  height: '100%',
                  background: uploadProgress.progress >= 100 ? 'linear-gradient(90deg, #00c853 0%, #b2ff59 100%)' : 'linear-gradient(90deg, #4a9eff 0%, #7f53ff 100%)',
                  transition: 'width 0.3s'
                }}
              />
            </div>
            <div style={{ color: uploadProgress.progress >= 100 ? '#00c853' : '#7f53ff', fontSize: 15, minHeight: 18, fontWeight: 500 }}>
              {documentsLogic.formatUploadStatusMessage(uploadProgress)}
            </div>
            {uploadProgress && (
              <div style={{ color: '#b0b8c1', fontSize: 14, marginTop: 2 }}>
                {typeof uploadProgress.chunk === 'number' && typeof uploadProgress.totalChunks === 'number' && uploadProgress.totalChunks > 0 && (
                  <span>
                    <b>Embedding chunk {uploadProgress.chunk}/{uploadProgress.totalChunks}</b>
                  </span>
                )}
                {typeof uploadProgress.subChunk === 'number' && uploadProgress.totalSubChunks && uploadProgress.totalSubChunks > 1 && (
                  <span> (sub-chunk {uploadProgress.subChunk}/{uploadProgress.totalSubChunks})</span>
                )}
                {typeof uploadProgress.splitChunks === 'number' && uploadProgress.splitChunks > 0 && (
                  <span> | <b>{uploadProgress.splitChunks} chunk(s) required splitting/truncation</b></span>
                )}
              </div>
            )}
          </div>
        )}
        <div
          className={`upload-area${selectedFile ? ' has-file' : ''}`}
          onClick={() => !isUploading && !currentUploadId && fileInputRef.current?.click()}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          style={{ opacity: isUploading || currentUploadId ? 0.6 : 1, pointerEvents: isUploading || currentUploadId ? 'none' : 'auto' }}
        >
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            className="upload-input"
            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
            disabled={isUploading || !!currentUploadId}
          />
          <div className="upload-icon">📤</div>
          <div className="upload-text">
            {selectedFile ? (
              <span className="selected-file">{selectedFile.name}</span>
            ) : (
              <>
                <span className="upload-cta">Click or drag a PDF here to upload</span>
                <span className="upload-hint">Max 1 file at a time</span>
              </>
            )}
          </div>
        </div>
        <button
          className="upload-btn"
          onClick={uploadDocument}
          disabled={!selectedFile || isUploading || !!currentUploadId}
        >
          {isUploading || currentUploadId ? 'Uploading...' : 'Upload Document'}
        </button>
        {uploadSuccess && <div className="upload-success">{uploadSuccess}</div>}
        {uploadError && <div className="upload-error">{uploadError}</div>}
      </div>
      <div className="documents-list-section">
        <div className="documents-list-header">
          <h3>Your Documents</h3>
          <input
            type="text"
            className="documents-search"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        {isLoadingDocs ? (
          <div className="documents-loading">Loading...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="documents-empty">
            {searchQuery ? 'No matching documents found.' : 'No documents uploaded yet.'}
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.map(doc => (
              <div className="document-card" key={doc.id} onClick={() => openModal(doc)} style={{ cursor: 'pointer' }}>
                <div className="document-card-header">
                  <span className="document-icon">📄</span>
                  <span className="document-title" title={doc.title}>{doc.title}</span>
                </div>
                <div className="document-meta" title={doc.originalname}>{doc.originalname}</div>
                <div className="document-meta-time">🕒 {new Date(doc.created_at).toLocaleString()}</div>
                <button
                  className="document-delete"
                  onClick={e => { e.stopPropagation(); deleteDocument(doc.id); }}
                  title="Delete document"
                >🗑️</button>
              </div>
            ))}
          </div>
        )}
        {deleteError && <div className="upload-error">{deleteError}</div>}
      </div>

      {/* Modal for document usage */}
      {modalDoc && (
        <div className="doc-modal-overlay">
          <div className="doc-modal" id="doc-modal">
            <button className="doc-modal-close" onClick={closeModal} title="Close">×</button>
            <h2 className="doc-modal-title">{modalDoc.title}</h2>
            <div className="doc-modal-meta">{modalDoc.originalname}</div>
            <div className="doc-modal-meta-time">🕒 {new Date(modalDoc.created_at).toLocaleString()}</div>
            <div className="doc-modal-section">
              <h3>Usage History</h3>
              {modalLoading ? (
                <div className="documents-loading">Loading...</div>
              ) : modalError ? (
                <div className="upload-error">{modalError}</div>
              ) : !modalUsage || modalUsage.length === 0 ? (
                <div className="documents-empty">No responses have used this document yet.</div>
              ) : (
                <div className="doc-modal-usage-list">
                  {modalUsage.map((entry, idx) => (
                    <div className="doc-modal-usage-entry" key={idx}>
                      <div className="doc-modal-usage-time">{new Date(entry.timestamp).toLocaleString()}</div>
                      <details>
                        <summary className="doc-modal-usage-response-label">
                          Show Response & Chunks
                        </summary>
                      <div className="doc-modal-usage-response">{entry.response}</div>
                      <div className="doc-modal-usage-chunks-label">Chunks used:</div>
                      <div className="doc-modal-usage-chunks">
                        {entry.chunkIndexes.map((chunk, cidx) => (
                          <div className="doc-modal-usage-chunk" key={cidx}>
                            <span className="doc-modal-usage-chunk-index">Chunk {chunk.chunk_index}:</span>
                            <span className="doc-modal-usage-chunk-text">{chunk.chunk_text}</span>
                          </div>
                        ))}
                      </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPanel; 