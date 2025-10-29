export interface UploadProgress {
  status: string;
  progress: number;
  error?: string;
  chunk?: number;
  totalChunks?: number;
  subChunk?: number;
  totalSubChunks?: number;
  splitChunks?: number;
}

const uploadStatusMap: Record<string, UploadProgress> = {};

export function generateUploadId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now();
}

export function updateUploadStatus(uploadId: string, update: Partial<UploadProgress>): void {
  uploadStatusMap[uploadId] = { ...uploadStatusMap[uploadId], ...update } as UploadProgress;
}

export function getUploadStatus(uploadId: string): UploadProgress {
  return uploadStatusMap[uploadId] || { status: 'Unknown upload', progress: 0 };
}


