import { PrintEditionData, PrintJobData } from './lulu.types';

export interface IPrintRepository {
  updatePrintEdition(
    bookId: string,
    data: Partial<PrintEditionData>,
  ): Promise<void>;
  getPrintEdition(bookId: string): Promise<PrintEditionData | null>;
  updatePrintJob(orderId: string, data: Partial<PrintJobData>): Promise<void>;
  getPrintJob(orderId: string): Promise<PrintJobData | null>;
}

export const PRINT_REPOSITORY_TOKEN = Symbol('IPrintRepository');
