export interface LuluAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
}

export interface LuluPrintJob {
  id: number;
  status: string;
  line_items: LuluLineItem[];
  shipping_level: string;
  shipping_address: LuluShippingAddress;
  tracking?: LuluTracking;
  created_at: string;
}

export interface LuluLineItem {
  id: number;
  printable_id: number;
  quantity: number;
  status: string;
  printable_type: 'BOOK';
}

export interface LuluShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state_code: string;
  country_code: string;
  postcode: string;
  phone?: string;
}

export interface LuluTracking {
  tracking_code: string;
  carrier: string;
  url: string;
}

export interface LuluValidationResponse {
  id: string;
  status: LuluValidationStatus;
  created_at: string;
  updated_at: string;
  errors?: LuluValidationError[];
}

export type LuluValidationStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'VALID'
  | 'INVALID'
  | 'FAILED';

export interface LuluValidationError {
  message: string;
  code: string;
  field?: string;
}

export interface LuluCostResponse {
  total_cost_excl_tax: number;
  total_cost_incl_tax: number;
  shipping_cost_excl_tax: number;
  shipping_cost_incl_tax: number;
  tax_cost: number;
  currency: string;
}

export interface LuluPrintJobRequest {
  line_items: {
    printable_id: number;
    quantity: number;
  }[];
  shipping_level: string;
  shipping_address: LuluShippingAddress;
}

export interface LuluPodPackage {
  id: number;
  name: string;
  printable: {
    id: number;
    type: string;
  };
}

export interface PrintEditionPricing {
  manufacturingCost: number;
  currency: string;
  authorProfit: number;
  sellingPrice: number;
  lastCalculatedAt: string;
}

export interface PrintEditionValidation {
  interiorValidationId: string | null;
  coverValidationId: string | null;
  interiorStatus: LuluValidationStatus | null;
  coverStatus: LuluValidationStatus | null;
  validated: boolean;
  validationErrors: LuluValidationError[];
  lastValidatedAt: string | null;
}

export interface PrintEditionData {
  enabled: boolean;
  interiorPdfUrl: string;
  coverPdfUrl: string;
  pageCount: number;
  trimSize: string;
  bindingType: string;
  podPackageId: string;
  pricing: PrintEditionPricing;
  validation: PrintEditionValidation;
}

export interface PrintJobData {
  luluJobId: number;
  quantity: number;
  manufacturingCostAtPurchase: number;
  shippingCost: number;
  status: string;
  tracking: LuluTracking | null;
  shippingLevel: string;
}

export interface PricingRow {
  legacySku: string;
  newSku: string;
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
}

export type SupportedCurrency = 'USD' | 'GBP' | 'EUR' | 'AUD' | 'CAD';

export const VALID_CURRENCIES: SupportedCurrency[] = [
  'USD',
  'GBP',
  'EUR',
  'AUD',
  'CAD',
];

export interface ShippingCostRequest {
  shipping_address: LuluShippingAddress;
  line_items: {
    printable_id: number;
    quantity: number;
  }[];
}
