export interface SearchConfig {
  query: string;
  numPages: number;
  minDelay: number;
  maxDelay: number;
}

export interface SearchResult {
  url: string;
  text: string;
  source?: string;
}

export interface SearchResponse {
  query: string;
  pagesProcessed: number;
  totalLinks: number;
  results: SearchResult[];
}

export interface ProcessedResult {
  originalUrl: string;
  extractedLinks: SearchResult[];
  error?: string;
}

export interface BrowserConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent: string;
  locale: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
