import fs from 'fs';
import path from 'path';
import { StorageProvider } from '../../../domain/ports/providers/index.js';

export class FilesystemStorage implements StorageProvider {
  constructor(private readonly baseDir: string = path.join(process.cwd(), 'uploads')) {
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
  }

  getUploadsDir(): string {
    return this.baseDir;
  }
}


