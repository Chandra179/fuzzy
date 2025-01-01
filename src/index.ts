import { SearchConfig } from './types';
import { SearchEngine } from './search_engine';
import { Server } from './api/server';

const defaultSearchConfig: SearchConfig = {
  query: '',
  numPages: 5,
  minDelay: 1,
  maxDelay: 3,
};

async function runCLI(): Promise<void> {
  const searches: SearchConfig[] = [
    { ...defaultSearchConfig, query: 'laporan keuangan bbri', numPages: 1 },
  ];

  for (const searchConfig of searches) {
    console.log(`\nStarting search for: ${searchConfig.query}`);
    await SearchEngine.performSearch(searchConfig);
  }
}

function startServer(): void {
  const server = new Server(3000);
  server.start();
}

if (require.main === module) {
  // const args = process.argv.slice(2);
  // if (args.includes('--api')) {
  //   startServer();
  // } else {
  //   runCLI().catch(console.error);
  // }
  startServer();
}
