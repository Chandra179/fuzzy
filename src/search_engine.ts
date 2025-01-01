import { SearchConfig, SearchResponse, SearchResult } from './types';
import { BrowserManager } from './browser_setup';
import { InteractionUtils } from './interaction_utils';
import { PageActions } from './page_actions';
import { ResultsManager } from './result_manager';
import { extractPageLinks } from './page_extraction';

export class SearchEngine {
  static async performSearch(config: SearchConfig): Promise<void> {
    const browser = await BrowserManager.initializeBrowser();
    const context = await BrowserManager.createContext(browser);
    const page = await context.newPage();
    const allResults: SearchResult[] = [];

    try {
      await page.goto('https://www.google.com', { waitUntil: 'networkidle' });
      await InteractionUtils.randomDelay(config.minDelay, config.maxDelay);

      await PageActions.handleCookieConsent(page);
      await PageActions.performSearch(page, config.query, config);

      let pagesProcessed = 0;
      while (pagesProcessed < config.numPages) {
        await InteractionUtils.randomDelay(config.minDelay, config.maxDelay);
        await PageActions.simulateNaturalScrolling(page, config);

        const pageResults = await extractPageLinks(page, 1);
        allResults.push(...pageResults);

        pagesProcessed++;
        if (pagesProcessed < config.numPages) {
          const nextButton = page.locator('a#pnnext').first();
          if (await nextButton.isVisible()) {
            await nextButton.click();
            await page.waitForLoadState('networkidle');
          } else {
            break;
          }
        }
      }

      const searchResponse: SearchResponse = {
        query: config.query,
        pagesProcessed,
        totalLinks: allResults.length,
        results: allResults,
      };

      const filename = await ResultsManager.saveResults(searchResponse);
      console.log(`Search completed successfully. Results saved to ${filename}`);
    } catch (error) {
      console.error('An error occurred:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
