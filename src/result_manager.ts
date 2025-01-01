import { promises as fs } from 'fs';
import { SearchResponse } from './types';

export class ResultsManager {
  static async saveResults(searchResponse: SearchResponse): Promise<string> {
    const resultsBase = `search_results_${searchResponse.query.replace(/ /g, '_')}`;
    const filename = `${resultsBase}.json`;

    await fs.writeFile(filename, JSON.stringify(searchResponse, null, 2), 'utf-8');

    return filename;
  }
}
