import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as path from 'path';
import {
  PrintOptionValue,
  PrintOptionsResponse,
  PrintProductOption,
  PricingRow,
  SupportedCurrency,
} from '../../domain/interfaces/lulu.types';

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);
  private pricingRows: PricingRow[] = [];

  async onModuleInit(): Promise<void> {
    await this.loadSpreadsheet();
  }

  private async loadSpreadsheet(): Promise<void> {
    try {
      const filePath = path.resolve(
        process.cwd(),
        'lulu-print-api-spec-sheet.xlsx',
      );
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets['Full Spec Sheet'];
      if (!sheet) {
        this.logger.error('Sheet "Full Spec Sheet" not found in spreadsheet');
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
      this.pricingRows = jsonData.map((row: any) => ({
        legacySku: String(
          row['Legacy SKU - Deprecated February 1, 2027'] || '',
        ),
        newSku: String(row['New SKU - March 31 2026'] || ''),
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
        linenColor: String(row['Linen Color'] || '').trim(),
        foilColor: String(row['Foil Color'] || '').trim(),
        printInsideCover: String(row['Print Inside Cover'] || '').trim(),
      }));

      this.logger.log(
        `Loaded ${this.pricingRows.length} pricing rows from spreadsheet`,
      );
    } catch (error: any) {
      this.logger.error('Failed to load pricing spreadsheet', error.message);
    }
  }

  getPrintOptions(): PrintOptionsResponse {
    const products = this.pricingRows.map((row) => ({
      newSku: row.newSku,
      bookType: row.bookType,
      minPage: row.minPage,
      maxPage: row.maxPage,
      trimWidthIn: row.trimWidthIn,
      trimHeightIn: row.trimHeightIn,
      interiorColor: row.interiorColor,
      printQuality: row.printQuality,
      bind: row.bind,
      paperType: row.paperType,
      lamination: row.lamination,
      linenColor: row.linenColor || 'X',
      foilColor: row.foilColor || 'X',
      printInsideCover: row.printInsideCover || 'No',
    }));

    const uniqueProducts = this.uniqueProducts(products);
    const paperbackBindings = ['Perfect', 'Coil', 'Saddle Stitch', 'Wire O'];
    const hardcoverBindings = ['Case Wrap', 'Linen Wrap'];
    const paperback = uniqueProducts.filter((option) =>
      paperbackBindings.includes(option.bind),
    );
    const hardcover = uniqueProducts.filter((option) =>
      hardcoverBindings.includes(option.bind),
    );

    return {
      paperback,
      hardcover,
      categories: {
        paperbackBindings: this.toOptions(paperbackBindings),
        hardcoverBindings: this.toOptions(hardcoverBindings),
        bookTypes: this.toOptions(
          uniqueProducts.map((option) => option.bookType),
        ),
        interiorColors: this.toOptions(
          uniqueProducts.map((option) => option.interiorColor),
        ),
        printQualities: this.toOptions(
          uniqueProducts.map((option) => option.printQuality),
        ),
        paperTypes: this.toOptions(
          uniqueProducts.map((option) => option.paperType),
        ),
        laminations: this.toOptions(
          uniqueProducts.map((option) => option.lamination),
        ),
        linenColors: this.toOptions(
          uniqueProducts
            .map((option) => option.linenColor)
            .filter((value) => value !== 'X'),
        ),
        foilColors: this.toOptions(
          uniqueProducts
            .map((option) => option.foilColor)
            .filter((value) => value !== 'X'),
        ),
        printInsideCover: this.toOptions(
          uniqueProducts.map((option) => option.printInsideCover),
        ),
      },
    };
  }

  private uniqueProducts(products: PrintProductOption[]): PrintProductOption[] {
    const seen = new Set<string>();
    return products.filter((product) => {
      const key = [
        product.bookType,
        product.minPage,
        product.maxPage,
        product.trimWidthIn,
        product.trimHeightIn,
        product.interiorColor,
        product.printQuality,
        product.bind,
        product.paperType,
        product.lamination,
        product.linenColor,
        product.foilColor,
        product.printInsideCover,
      ].join('|');

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private toOptions(values: string[]): PrintOptionValue[] {
    return [...new Set(values.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));
  }

  findPricingRow(params: {
    bookType: string;
    bind: string;
    interiorColor: string;
    paperType: string;
    lamination: string;
    pageCount: number;
    printQuality?: string;
  }): PricingRow | null {
    const candidates = this.pricingRows.filter((row) => {
      if (row.bookType.toLowerCase() !== params.bookType.toLowerCase())
        return false;
      if (row.bind.toLowerCase() !== params.bind.toLowerCase()) return false;
      if (row.paperType.toLowerCase() !== params.paperType.toLowerCase())
        return false;
      if (row.lamination.toLowerCase() !== params.lamination.toLowerCase())
        return false;
      if (
        params.printQuality &&
        row.printQuality.toLowerCase() !== params.printQuality.toLowerCase()
      )
        return false;

      let colorMatch = false;
      const paramColor = params.interiorColor.toLowerCase();
      const rowColor = row.interiorColor.toLowerCase();

      if (paramColor === 'black & white' || paramColor === 'mono') {
        colorMatch = rowColor === 'black & white';
      } else if (paramColor === 'full color') {
        colorMatch = rowColor === 'full color';
      } else {
        colorMatch = rowColor === paramColor || rowColor === 'full color';
      }

      if (!colorMatch) return false;
      if (params.pageCount < row.minPage || params.pageCount > row.maxPage)
        return false;

      return true;
    });

    if (candidates.length === 0) {
      this.logger.warn(`No pricing row found for: ${JSON.stringify(params)}`);
      return null;
    }

    if (candidates.length > 1 && !params.printQuality) {
      const standard = candidates.find(
        (c) => c.printQuality.toLowerCase() === 'standard',
      );
      if (standard) return standard;
    }

    return candidates[0];
  }

  calculateManufacturingCost(
    pricingRow: PricingRow,
    pageCount: number,
    currency: SupportedCurrency = 'USD',
  ): number {
    let basePrice: number;
    let perPagePrice: number;

    switch (currency) {
      case 'USD':
        basePrice = pricingRow.basePriceUSD;
        perPagePrice = pricingRow.perPagePriceUSD;
        break;
      case 'GBP':
        basePrice = pricingRow.basePriceGBP;
        perPagePrice = pricingRow.perPagePriceGBP;
        break;
      case 'EUR':
        basePrice = pricingRow.basePriceEUR;
        perPagePrice = pricingRow.perPagePriceEUR;
        break;
      case 'AUD':
        basePrice = pricingRow.basePriceAUD;
        perPagePrice = pricingRow.perPagePriceAUD;
        break;
      case 'CAD':
        basePrice = pricingRow.basePriceCAD;
        perPagePrice = pricingRow.perPagePriceCAD;
        break;
      default:
        basePrice = pricingRow.basePriceUSD;
        perPagePrice = pricingRow.perPagePriceUSD;
    }

    return Math.round((basePrice + pageCount * perPagePrice) * 100) / 100;
  }
}
