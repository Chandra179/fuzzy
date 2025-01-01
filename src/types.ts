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

export interface BrowserConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent: string;
  locale: string;
}
