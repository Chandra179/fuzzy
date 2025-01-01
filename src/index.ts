import { SearchConfig } from './types';
import { SearchEngine } from './search_engine';

const defaultSearchConfig: SearchConfig = {
  query: '',
  numPages: 5,
  minDelay: 1,
  maxDelay: 3,
};

async function main(): Promise<void> {
  const searches: SearchConfig[] = [
    { ...defaultSearchConfig, query: 'laporan keuangan bbri', numPages: 1 },
  ];

  for (const searchConfig of searches) {
    console.log(`\nStarting search for: ${searchConfig.query}`);
    await SearchEngine.performSearch(searchConfig);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
