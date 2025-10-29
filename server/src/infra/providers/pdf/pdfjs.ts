import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { PdfParserProvider } from '../../../domain/ports/providers/index.js';

export class PdfJsParser implements PdfParserProvider {
  async extract(filePath: string): Promise<{ title: string; pages: string[]; fullText: string }> {
    const dataBuffer = fs.readFileSync(filePath);
    const getDocument = (pdfjsLib as any).getDocument || (pdfjsLib as any).default?.getDocument;
    if (!getDocument) throw new Error('pdfjsLib.getDocument is not available');
    const loadingTask = getDocument({ data: dataBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages: string[] = [];
    let fullText = '';
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = (content.items as { str?: string }[]).map((i) => i.str || '').join(' ');
      pages.push(pageText);
      fullText += pageText + ' ';
    }
    return {
      title: path.basename(filePath, '.pdf'),
      pages,
      fullText: fullText.trim()
    };
  }
}


