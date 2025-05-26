// Configuration constants
export const DOCUMENTS_CONFIG = {
  API_BASE_URL: 'http://localhost:3001',
  UPLOAD_POLL_INTERVAL: 500,
  MODAL_REFRESH_INTERVAL: 5000,
  UPLOAD_STATUS_DISPLAY_DURATION: 2000,
} as const;

// Type definitions
export interface DocumentMeta {
  id: number;
  title: string;
  filename: string;
  originalname: string;
  created_at: string;
}

export interface RAGChunk {
  chunk_index: number;
  chunk_text: string;
}

export interface RAGUsageEntry {
  documentId: number;
  chunkIndexes: RAGChunk[];
  response: string;
  timestamp: number;
}

export interface UploadProgress {
  progress: number;
  status: string;
  chunk?: number;
  totalChunks?: number;
  subChunk?: number;
  totalSubChunks?: number;
  splitChunks?: number;
  error?: string;
}

export interface UploadRequest {
  file: File;
  embeddingProvider: 'openai' | 'ollama';
}

export interface UploadResponse {
  uploadId: string;
  message?: string;
}

// API service functions
export const documentsApiService = {
  // Fetch all documents
  async fetchDocuments(): Promise<DocumentMeta[]> {
    const response = await fetch(`${DOCUMENTS_CONFIG.API_BASE_URL}/api/documents`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }
    
    const data = await response.json();
    return data.documents || [];
  },

  // Upload a document
  async uploadDocument(request: UploadRequest): Promise<UploadResponse> {
    const { file, embeddingProvider } = request;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('embeddingProvider', embeddingProvider);
    
    const response = await fetch(`${DOCUMENTS_CONFIG.API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    return await response.json();
  },

  // Get upload status/progress
  async getUploadStatus(uploadId: string): Promise<UploadProgress> {
    const response = await fetch(`${DOCUMENTS_CONFIG.API_BASE_URL}/api/documents/upload-status/${uploadId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get upload status');
    }
    
    return await response.json();
  },

  // Delete a document
  async deleteDocument(documentId: number): Promise<void> {
    const response = await fetch(`${DOCUMENTS_CONFIG.API_BASE_URL}/api/documents/${documentId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Delete failed');
    }
  },

  // Fetch document usage history
  async fetchDocumentUsage(documentId: number): Promise<RAGUsageEntry[]> {
    const response = await fetch(`${DOCUMENTS_CONFIG.API_BASE_URL}/api/documents/${documentId}/usage`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch usage');
    }
    
    return await response.json();
  }
};

// Business logic functions
export const documentsLogic = {
  // Filter documents by search query
  filterDocuments(documents: DocumentMeta[], searchQuery: string): DocumentMeta[] {
    if (!searchQuery.trim()) return documents;
    
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      doc.originalname.toLowerCase().includes(query)
    );
  },

  // Validate file for upload
  validateUploadFile(file: File | null): { isValid: boolean; error?: string } {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }
    
    if (file.type !== 'application/pdf') {
      return { isValid: false, error: 'Only PDF files are supported' };
    }
    
    // Add size limit check if needed
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 50MB' };
    }
    
    return { isValid: true };
  },

  // Check if upload is complete
  isUploadComplete(progress: UploadProgress): boolean {
    return progress.progress >= 100 || !!progress.error;
  },

  // Format upload status message
  formatUploadStatusMessage(progress: UploadProgress): string {
    if (progress.error) {
      return `Error: ${progress.error}`;
    }
    
    if (progress.progress >= 100) {
      return `${progress.status} (Complete!)`;
    }
    
    return progress.status || 'Processing...';
  },

  // Extract file from drag event
  extractFileFromDrop(event: DragEvent): File | null {
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      return event.dataTransfer.files[0];
    }
    return null;
  }
}; 