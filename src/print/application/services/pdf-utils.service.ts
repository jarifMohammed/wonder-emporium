import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PdfUtilsService {
  private readonly logger = new Logger(PdfUtilsService.name);

  async detectPageCount(pdfUrl: string): Promise<number> {
    try {
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data);

      const pageCount = this.countPagesFromBuffer(buffer);
      if (pageCount > 0) {
        this.logger.log(`Detected ${pageCount} pages from PDF`);
        return pageCount;
      }

      this.logger.warn(
        'Could not detect page count from PDF metadata, falling back to heuristic',
      );
      return this.heuristicPageCount(buffer);
    } catch (error: any) {
      this.logger.error('Failed to detect PDF page count', error.message);
      throw new Error('PDF page count detection failed');
    }
  }

  private countPagesFromBuffer(buffer: Buffer): number {
    const str = buffer.toString('latin1');

    const typeRegex = /\/Type\s*\/Pages[^/]*\/Count\s+(\d+)/i;
    const typeMatch = str.match(typeRegex);
    if (typeMatch) {
      return parseInt(typeMatch[1], 10);
    }

    const rootRegex = /\/Type\s*\/Catalog[^/]*\/Pages\s+(\d+)\s+0\s+R/i;
    const rootMatch = str.match(rootRegex);
    if (rootMatch) {
      const pagesObjNum = parseInt(rootMatch[1], 10);
      const objRegex = new RegExp(
        `${pagesObjNum}\\s+0\\s+obj[^]*?\\/Count\\s+(\\d+)`,
        'i',
      );
      const objMatch = str.match(objRegex);
      if (objMatch) {
        return parseInt(objMatch[1], 10);
      }
    }

    const pageObjRegex = /\/Type\s*\/Page\b/gi;
    const matches = str.match(pageObjRegex);
    if (matches) {
      return matches.length;
    }

    return 0;
  }

  private heuristicPageCount(buffer: Buffer): number {
    const str = buffer.toString('latin1');
    const pageObjRegex = /\/Type\s*\/Page\b/gi;
    const matches = str.match(pageObjRegex);
    if (matches && matches.length > 0) {
      return matches.length;
    }

    const streamRegex = /stream\s/g;
    const streamMatches = str.match(streamRegex);
    if (streamMatches && streamMatches.length > 0) {
      return streamMatches.length;
    }

    return 1;
  }
}
