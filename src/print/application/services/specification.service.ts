import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SpecificationRow {
  sku: string;
  bookType: string;
  minPage: number;
  maxPage: number;
  basePriceUSD: number;
  perPagePriceUSD: number;
  basePriceGBP: number;
  perPagePriceGBP: number;
  basePriceEUR: number;
  perPagePriceEUR: number;
  basePriceAUD: number;
  perPagePriceAUD: number;
  basePriceCAD: number;
  perPagePriceCAD: number;
  trimWidthIn: number;
  trimHeightIn: number;
  interiorColor: string;
  printQuality: string;
  bind: string;
  paperType: string;
  interiorPpi: number;
  lamination: string;
  linenColor: string;
  foilColor: string;
  printInsideCover: string;
}

export interface BookTypeOption {
  value: string;
  label: string;
  trimSku: string;
}

export interface SkuOption {
  value: string;
  label?: string;
  sku: string;
  minPage?: number;
  maxPage?: number;
}

export interface SpecificationOptions {
  bookTypes: BookTypeOption[];
  interiorColors: SkuOption[];
  printQualities: SkuOption[];
  bindings: {
    paperback: SkuOption[];
    hardcover: SkuOption[];
  };
  paperTypes: SkuOption[];
  laminations: SkuOption[];
  linenColors: SkuOption[];
  foilColors: SkuOption[];
  printInsideCover: SkuOption[];
}

export interface MatchResult {
  found: boolean;
  sku: string | null;
  minPage: number | null;
  maxPage: number | null;
  pricing: {
    basePriceUSD: number;
    perPagePriceUSD: number;
    basePriceGBP: number;
    perPagePriceGBP: number;
    basePriceEUR: number;
    perPagePriceEUR: number;
    basePriceAUD: number;
    perPagePriceAUD: number;
    basePriceCAD: number;
    perPagePriceCAD: number;
  } | null;
}

@Injectable()
export class SpecificationService implements OnModuleInit {
  private readonly logger = new Logger(SpecificationService.name);
  private rows: SpecificationRow[] = [];

  async onModuleInit(): Promise<void> {
    await this.loadSpecifications();
  }

  private async loadSpecifications(): Promise<void> {
    try {
      const filePath = path.resolve(process.cwd(), 'details.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(rawData);

      this.rows = jsonData.map((row: any) => ({
        sku: String(row['New SKU - March 31 2026'] || ''),
        bookType: String(row['Book Type'] || '').trim(),
        minPage: Number(row['Min Page']) || 0,
        maxPage: Number(row['Max Page']) || 0,
        basePriceUSD: Number(row['Base Price-USD']) || 0,
        perPagePriceUSD: Number(row['Per Page Price-USD']) || 0,
        basePriceGBP: Number(row['Base Price-GBP']) || 0,
        perPagePriceGBP: Number(row['Per Page Price-GBP']) || 0,
        basePriceEUR: Number(row['Base Price-EUR']) || 0,
        perPagePriceEUR: Number(row['Per Page Price-EUR']) || 0,
        basePriceAUD: Number(row['Base Price-AUD']) || 0,
        perPagePriceAUD: Number(row['Per Page Price-AUD']) || 0,
        basePriceCAD: Number(row['Base Price-CAD']) || 0,
        perPagePriceCAD: Number(row['Per Page Price-CAD']) || 0,
        trimWidthIn: Number(row['Trim Width (in)']) || 0,
        trimHeightIn: Number(row['Trim Height (in)']) || 0,
        interiorColor: String(row['Interior Color'] || '').trim(),
        printQuality: String(row['Print Quality'] || '').trim(),
        bind: String(row['Bind'] || '').trim(),
        paperType: String(row['Paper Type'] || '').trim(),
        interiorPpi: Number(row['Interior PPI']) || 0,
        lamination: String(row['Lamination'] || '').trim(),
        linenColor: String(row['Linen Color'] || 'X').trim(),
        foilColor: String(row['Foil Color'] || 'X').trim(),
        printInsideCover: String(row['Print Inside Cover'] || 'No').trim(),
      }));

      this.logger.log(
        `Loaded ${this.rows.length} specification rows from details.json`,
      );
    } catch (error: any) {
      this.logger.error('Failed to load specifications', error.message);
    }
  }

  getSpecificationOptions(): SpecificationOptions {
    const bookTypeMap = new Map<string, { label: string; trimSku: string }>();
    const paperbackBindings = new Set<string>();
    const hardcoverBindings = new Set<string>();

    for (const row of this.rows) {
      if (!bookTypeMap.has(row.bookType)) {
        const trimWidth = row.trimWidthIn;
        const trimHeight = row.trimHeightIn;
        const widthStr = String(trimWidth).replace('.', '');
        const heightStr = String(trimHeight).replace('.', '');
        const trimSku = `${widthStr.padStart(4, '0')}X${heightStr.padStart(4, '0')}`;
        bookTypeMap.set(row.bookType, {
          label: `${row.bookType} (${trimWidth}" x ${trimHeight}")`,
          trimSku,
        });
      }

      const paperback = ['Perfect', 'Coil', 'Saddle Stitch'];
      const hardcover = ['Case Wrap', 'Linen Wrap'];

      if (paperback.includes(row.bind)) {
        paperbackBindings.add(row.bind);
      }
      if (hardcover.includes(row.bind)) {
        hardcoverBindings.add(row.bind);
      }
    }

    return {
      bookTypes: Array.from(bookTypeMap.entries()).map(([value, info]) => ({
        value,
        label: info.label,
        trimSku: info.trimSku,
      })),
      interiorColors: [
        { value: 'Black & White', sku: 'BW' },
        { value: 'Full Color', sku: 'FC' },
      ],
      printQualities: [
        { value: 'Standard', sku: 'STD' },
        { value: 'Premium', sku: 'PRE' },
      ],
      bindings: {
        paperback: Array.from(paperbackBindings)
          .sort()
          .map((value) => ({
            value,
            label: this.getBindLabel(value),
            sku: this.getBindSku(value),
          })),
        hardcover: Array.from(hardcoverBindings)
          .sort()
          .map((value) => ({
            value,
            label: this.getBindLabel(value),
            sku: this.getBindSku(value),
          })),
      },
      paperTypes: this.toUniqueOptions(
        this.rows
          .map((r) => r.paperType)
          .filter((p) => p && !p.includes('#N/A')),
      ),
      laminations: this.toUniqueOptions(this.rows.map((r) => r.lamination)),
      linenColors: [
        { value: 'X', sku: 'X' },
        ...this.toUniqueOptions(
          this.rows.map((r) => r.linenColor).filter((c) => c !== 'X'),
        ),
      ],
      foilColors: [
        { value: 'X', sku: 'X' },
        ...this.toUniqueOptions(
          this.rows.map((r) => r.foilColor).filter((c) => c !== 'X'),
        ),
      ],
      printInsideCover: this.toUniqueOptions(
        this.rows.map((r) => r.printInsideCover),
      ),
    };
  }

  getAvailableOptions(params: {
    format: 'PAPERBACK' | 'HARDCOVER';
    bookType: string;
    pageCount: number;
  }) {
    const allowedBinds =
      params.format === 'HARDCOVER'
        ? ['Case Wrap', 'Linen Wrap']
        : ['Perfect', 'Coil', 'Saddle Stitch'];

    const rows = this.rows.filter((row) => {
      return (
        row.bookType.toLowerCase() === params.bookType.toLowerCase() &&
        params.pageCount >= row.minPage &&
        params.pageCount <= row.maxPage &&
        allowedBinds.includes(row.bind)
      );
    });
    const pageRanges = this.getPageRange(rows);

    return {
      bookType: params.bookType,
      pageCount: params.pageCount,
      format: params.format,
      count: rows.length,
      validPageRange: pageRanges,
      valid: rows.length > 0,
      interiorColors: this.toUniqueOptions(rows.map((r) => r.interiorColor)),
      printQualities: this.toUniqueOptions(rows.map((r) => r.printQuality)),
      bindings: this.toUniqueOptionsWithRanges(rows, (r) => r.bind).map((option) => ({
        ...option,
        label: this.getBindLabel(option.value),
        sku: this.getBindSku(option.value),
      })),
      paperTypes: this.toUniqueOptionsWithRanges(
        rows,
        (r) => `${r.paperType} / ${r.interiorPpi} PPI`,
      ),
      laminations: this.toUniqueOptions(rows.map((r) => r.lamination)),
      linenColors: [
        { value: 'X', label: 'None', sku: 'X' },
        ...this.toUniqueOptions(
          rows.map((r) => r.linenColor).filter((value) => value !== 'X'),
        ),
      ],
      foilColors: [
        { value: 'X', label: 'None', sku: 'X' },
        ...this.toUniqueOptions(
          rows.map((r) => r.foilColor).filter((value) => value !== 'X'),
        ),
      ],
      printInsideCover: this.toUniqueOptions(rows.map((r) => r.printInsideCover)),
    };
  }

  private getBindLabel(bind: string): string {
    const map: Record<string, string> = {
      Perfect: 'Perfect Bound',
      Coil: 'Coil Bound',
      'Saddle Stitch': 'Saddle Bound',
      'Case Wrap': 'Case Wrap',
      'Linen Wrap': 'Linen Wrap',
      'Wire O': 'Wire O Bound',
    };
    return map[bind] || bind;
  }

  private getBindSku(bind: string): string {
    const map: Record<string, string> = {
      Perfect: 'PB',
      Coil: 'CO',
      'Saddle Stitch': 'SS',
      'Case Wrap': 'CW',
      'Linen Wrap': 'LW',
      'Wire O': 'WO',
    };
    return map[bind] || 'XX';
  }

  private toUniqueOptions(values: string[]): SkuOption[] {
    const unique = [...new Set(values.filter(Boolean))].sort();
    return unique.map((value) => ({
      value,
      sku: value,
    }));
  }

  private toUniqueOptionsWithRanges(
    rows: SpecificationRow[],
    getValue: (row: SpecificationRow) => string,
  ): SkuOption[] {
    const map = new Map<string, { minPage: number; maxPage: number }>();
    for (const row of rows) {
      const value = getValue(row);
      if (!value) continue;
      const current = map.get(value) || { minPage: Infinity, maxPage: 0 };
      current.minPage = Math.min(current.minPage, row.minPage);
      current.maxPage = Math.max(current.maxPage, row.maxPage);
      map.set(value, current);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, range]) => ({
        value,
        sku: value,
        minPage: range.minPage,
        maxPage: range.maxPage,
      }));
  }

  private getPageRange(rows: SpecificationRow[]) {
    if (!rows.length) return null;
    return {
      minPage: Math.min(...rows.map((row) => row.minPage)),
      maxPage: Math.max(...rows.map((row) => row.maxPage)),
    };
  }

  matchSpecification(params: {
    bookType: string;
    pageCount?: number;
    interiorColor: string;
    printQuality: string;
    bind?: string;
    bindingType?: string;
    paperType: string;
    interiorPpi?: number;
    lamination?: string;
    coverFinish?: string;
    linenColor?: string;
    foilColor?: string;
    printInsideCover?: string;
  }): MatchResult {
    const paper = this.normalizePaper(params.paperType, params.interiorPpi);
    const bind = params.bind || params.bindingType || '';
    const lamination = params.lamination || params.coverFinish || '';
    const linenColor = params.linenColor || 'X';
    const foilColor = params.foilColor || 'X';
    const printInsideCover = params.printInsideCover || 'No';

    const candidates = this.rows.filter((row) => {
      if (row.bookType.toLowerCase() !== params.bookType.toLowerCase())
        return false;
      if (
        params.pageCount &&
        (params.pageCount < row.minPage || params.pageCount > row.maxPage)
      )
        return false;
      if (
        row.interiorColor.toLowerCase() !== params.interiorColor.toLowerCase()
      )
        return false;
      if (row.printQuality.toLowerCase() !== params.printQuality.toLowerCase())
        return false;
      if (row.bind.toLowerCase() !== bind.toLowerCase()) return false;
      if (row.paperType.toLowerCase() !== paper.paperType.toLowerCase())
        return false;
      if (paper.interiorPpi && row.interiorPpi !== paper.interiorPpi)
        return false;
      if (row.lamination.toLowerCase() !== lamination.toLowerCase())
        return false;
      if (row.linenColor.toLowerCase() !== linenColor.toLowerCase())
        return false;
      if (row.foilColor.toLowerCase() !== foilColor.toLowerCase()) return false;
      if (
        row.printInsideCover.toLowerCase() !== printInsideCover.toLowerCase()
      )
        return false;
      return true;
    });

    if (candidates.length === 0) {
      return {
        found: false,
        sku: null,
        minPage: null,
        maxPage: null,
        pricing: null,
      };
    }

    const match = candidates[0];

    return {
      found: true,
      sku: match.sku,
      minPage: match.minPage,
      maxPage: match.maxPage,
      pricing: {
        basePriceUSD: match.basePriceUSD,
        perPagePriceUSD: match.perPagePriceUSD,
        basePriceGBP: match.basePriceGBP,
        perPagePriceGBP: match.perPagePriceGBP,
        basePriceEUR: match.basePriceEUR,
        perPagePriceEUR: match.perPagePriceEUR,
        basePriceAUD: match.basePriceAUD,
        perPagePriceAUD: match.perPagePriceAUD,
        basePriceCAD: match.basePriceCAD,
        perPagePriceCAD: match.perPagePriceCAD,
      },
    };
  }

  private normalizePaper(paperType: string, interiorPpi?: number) {
    const [paperName, ppiPart] = String(paperType || '').split(' / ');
    return {
      paperType: paperName.trim(),
      interiorPpi:
        interiorPpi || Number(String(ppiPart || '').replace(/\D/g, '')) || 0,
    };
  }
}
