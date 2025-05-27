import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DocumentMeta,
  RAGUsageEntry,
  UploadProgress,
  documentsApiService,
  documentsLogic,
  DOCUMENTS_CONFIG
} from '../services/documentsService';

export interface DocumentManagerHook {
  // Document state
  documents: DocumentMeta[];
  isLoadingDocs: boolean;
  searchQuery: string;
  filteredDocuments: DocumentMeta[];
  
  // Upload state
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  uploadSuccess: string | null;
  uploadError: string | null;
  currentUploadId: string | null;
  
  // Modal state
  modalDoc: DocumentMeta | null;
  modalUsage: RAGUsageEntry[] | null;
  modalLoading: boolean;
  modalError: string | null;
  
  // Error state
  deleteError: string | null;
  
  // Actions
  fetchDocuments: () => Promise<void>;
  uploadDocument: () => Promise<void>;
  deleteDocument: (id: number) => Promise<void>;
  openModal: (doc: DocumentMeta) => Promise<void>;
  closeModal: () => void;
  handleFileDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  
  // Setters
  setSelectedFile: (file: File | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useDocumentManager = (
  embeddingProvider: 'openai' | 'ollama'
): DocumentManagerHook => {
  // Document state
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  
  // Modal state
  const [modalDoc, setModalDoc] = useState<DocumentMeta | null>(null);
  const [modalUsage, setModalUsage] = useState<RAGUsageEntry[] | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Error state
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Refs for cleanup
  const uploadStatusInterval = useRef<NodeJS.Timeout | null>(null);
  const modalRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Computed values
  const filteredDocuments = documentsLogic.filterDocuments(documents, searchQuery);
  
  // Fetch documents from server
  const fetchDocuments = useCallback(async (): Promise<void> => {
    setIsLoadingDocs(true);
    setDeleteError(null);
    
    try {
      const fetchedDocuments = await documentsApiService.fetchDocuments();
      setDocuments(fetchedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDeleteError('Failed to fetch documents.');
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);
  
  // Upload progress polling
  const pollUploadStatus = useCallback(async (uploadId: string): Promise<void> => {
    try {
      const progress = await documentsApiService.getUploadStatus(uploadId);
      setUploadProgress(progress);
      
      if (documentsLogic.isUploadComplete(progress)) {
        // Clear polling and reset state after delay
        setTimeout(() => {
          setCurrentUploadId(null);
          setUploadProgress(null);
        }, DOCUMENTS_CONFIG.UPLOAD_STATUS_DISPLAY_DURATION);
      }
    } catch (error) {
      console.error('Error polling upload status:', error);
      setUploadProgress({
        progress: 0,
        status: 'Failed to get upload status',
        error: 'Status check failed'
      });
    }
  }, []);
  
  // Upload document
  const uploadDocument = useCallback(async (): Promise<void> => {
    const validation = documentsLogic.validateUploadFile(selectedFile);
    if (!validation.isValid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }
    
    setIsUploading(true);
    setUploadSuccess(null);
    setUploadError(null);
    setUploadProgress({ progress: 0, status: 'Starting upload...' });
    
    try {
      const response = await documentsApiService.uploadDocument({
        file: selectedFile!,
        embeddingProvider
      });
      
      setCurrentUploadId(response.uploadId);
      setUploadSuccess('Upload successful!');
      setSelectedFile(null);
      
      // Refresh documents list
      await fetchDocuments();
      
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, embeddingProvider, fetchDocuments]);
  
  // Delete document
  const deleteDocument = useCallback(async (documentId: number): Promise<void> => {
    setDeleteError(null);
    
    try {
      await documentsApiService.deleteDocument(documentId);
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      setDeleteError('Failed to delete document.');
    }
  }, [fetchDocuments]);
  
  // Fetch modal usage data
  const fetchModalUsage = useCallback(async (docId: number): Promise<void> => {
    console.log(`[DocumentManager] Fetching usage for document ${docId}`);
    
    try {
      const usage = await documentsApiService.fetchDocumentUsage(docId);
      console.log(`[DocumentManager] Received usage data:`, usage);
      setModalUsage(usage);
    } catch (error) {
      console.error(`[DocumentManager] Error fetching usage:`, error);
      setModalError('Failed to load usage data.');
    } finally {
      setModalLoading(false);
    }
  }, []);
  
  // Open modal and start data refresh
  const openModal = useCallback(async (doc: DocumentMeta): Promise<void> => {
    console.log(`[DocumentManager] Opening modal for document:`, doc);
    
    setModalDoc(doc);
    setModalUsage(null);
    setModalError(null);
    setModalLoading(true);
    
    await fetchModalUsage(doc.id);
    
    // Set up refresh interval for live data
    modalRefreshInterval.current = setInterval(() => {
      console.log(`[DocumentManager] Refreshing usage data for document ${doc.id}`);
      fetchModalUsage(doc.id);
    }, DOCUMENTS_CONFIG.MODAL_REFRESH_INTERVAL);
  }, [fetchModalUsage]);
  
  // Close modal and cleanup
  const closeModal = useCallback((): void => {
    setModalDoc(null);
    setModalUsage(null);
    setModalError(null);
    setModalLoading(false);
    
    // Clear refresh interval
    if (modalRefreshInterval.current) {
      clearInterval(modalRefreshInterval.current);
      modalRefreshInterval.current = null;
    }
  }, []);
  
  // Handle file drop
  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    
    const file = documentsLogic.extractFileFromDrop(event.nativeEvent);
    if (file) {
      setSelectedFile(file);
    }
  }, []);
  
  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  }, []);
  
  // Effect: Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);
  
  // Effect: Poll upload status when upload ID changes
  useEffect(() => {
    if (!currentUploadId) {
      if (uploadStatusInterval.current) {
        clearInterval(uploadStatusInterval.current);
        uploadStatusInterval.current = null;
      }
      return;
    }
    
    // Start polling
    uploadStatusInterval.current = setInterval(() => {
      pollUploadStatus(currentUploadId);
    }, DOCUMENTS_CONFIG.UPLOAD_POLL_INTERVAL);
    
    return () => {
      if (uploadStatusInterval.current) {
        clearInterval(uploadStatusInterval.current);
        uploadStatusInterval.current = null;
      }
    };
  }, [currentUploadId, pollUploadStatus]);
  
  // Effect: Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (uploadStatusInterval.current) {
        clearInterval(uploadStatusInterval.current);
      }
      if (modalRefreshInterval.current) {
        clearInterval(modalRefreshInterval.current);
      }
    };
  }, []);
  
  return {
    // Document state
    documents,
    isLoadingDocs,
    searchQuery,
    filteredDocuments,
    
    // Upload state
    selectedFile,
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
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    openModal,
    closeModal,
    handleFileDrop,
    handleDragOver,
    
    // Setters
    setSelectedFile,
    setSearchQuery,
  };
}; 