import fs from 'fs';
import path from 'path';
import { UsageRepository } from '../../../domain/ports/repositories/index.js';
import { RAGUsageEntity } from '../../../domain/entities/index.js';

export class UsageRepositoryFile implements UsageRepository {
  private filePath: string;

  constructor(filePath: string = path.join(process.cwd(), 'rag_usage_log.json')) {
    this.filePath = filePath;
  }

  private readAll(): Array<Omit<RAGUsageEntity, 'id' | 'createdAt'>> & any[] {
    try {
      if (!fs.existsSync(this.filePath)) return [] as any[];
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw) || [];
    } catch {
      return [] as any[];
    }
  }

  private writeAll(entries: any[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(entries, null, 2));
  }

  log(entry: Omit<RAGUsageEntity, 'id' | 'createdAt'>): number {
    const entries = this.readAll();
    const record = {
      documentId: entry.documentId,
      chunkIndexes: entry.chunkIndexes,
      response: entry.responseExcerpt,
      timestamp: Date.now()
    };
    entries.push(record);
    this.writeAll(entries);
    return entries.length;
  }

  forDocument(documentId: number): RAGUsageEntity[] {
    const entries = this.readAll();
    return entries
      .filter((e: any) => e.documentId === documentId)
      .map((e: any, idx: number) => ({
        id: idx + 1,
        documentId: e.documentId,
        chunkIndexes: e.chunkIndexes,
        responseExcerpt: typeof e.response === 'string' ? e.response.slice(0, 500) : '',
        createdAt: new Date(e.timestamp).toISOString()
      }));
  }
}


