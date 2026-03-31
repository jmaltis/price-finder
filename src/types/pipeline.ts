export type ExtractionMethod =
  | 'bright_data'
  | 'apify'
  | 'json_ld'
  | 'meta_og'
  | 'dom'
  | 'llm'
  | 'stagehand';

export interface VariantOption {
  value: string;
  available: boolean;
  selected: boolean;
}

export interface VariantGroup {
  name: string;
  options: VariantOption[];
}

export interface ProductIdentifiers {
  gtin?: string;
  sku?: string;
  mpn?: string;
  brand?: string;
}

export interface ProductPrice {
  productName: string;
  price: number;
  currency: string;
  shippingCost: number | null;
  inStock: boolean | null;
  variant: string | null;
  variants?: VariantGroup[];
  identifiers?: ProductIdentifiers;
  merchantName: string;
  merchantUrl: string;
  sourceUrl: string;
  extractionMethod: ExtractionMethod;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface ExtractionResult {
  url: string;
  prices: ProductPrice[];
  method: ExtractionMethod;
  success: boolean;
  error?: string;
}

export interface PipelineResult {
  query: string;
  searchResults: SearchResult[];
  prices: ProductPrice[];
  errors: string[];
  timing: {
    searchMs: number;
    extractionMs: number;
    totalMs: number;
  };
}
