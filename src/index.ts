import { chromium, Browser, BrowserContext, Page } from 'playwright';

interface SearchConfig {
  query: string;
  numPages: number;
  minDelay: number;
  maxDelay: number;
}

interface SearchResult {
  url: string;
  text: string;
}

interface SearchResponse {
  query: string;
  pagesProcessed: number;
  totalLinks: number;
  results: SearchResult[];
}

interface MousePosition {
  x: number;
  y: number;
}

const defaultSearchConfig: SearchConfig = {
  query: '',
  numPages: 5,
  minDelay: 1,
  maxDelay: 3
};

async function randomDelay(minSeconds: number = 1, maxSeconds: number = 3): Promise<void> {
  const delay = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  await new Promise(resolve => setTimeout(resolve, delay * 1000));
}

async function humanLikeTyping(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  for (const char of text) {
    await page.keyboard.type(char);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
  }
}

async function moveMouseNaturally(page: Page, x: number, y: number): Promise<void> {
  const currentPos: MousePosition = await page.evaluate(() => ({
    x: (globalThis as any).mouse_x || 0,
    y: (globalThis as any).mouse_y || 0
  }));

  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const nextX = currentPos.x + (x - currentPos.x) * (i + 1) / steps;
    const nextY = currentPos.y + (y - currentPos.y) * (i + 1) / steps;

    const deviation = Math.random() * 20 - 10;
    await page.mouse.move(nextX + deviation, nextY + deviation);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 10));
  }
}

async function extractPageLinks(page: Page): Promise<SearchResult[]> {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      
      return links
        .filter((link): link is HTMLAnchorElement => {
          if (!(link instanceof HTMLAnchorElement)) return false;
          
          const href = link.href || '';
          return Boolean(
            href &&
            href.startsWith('http') &&
            !href.includes('google.com') &&
            !href.includes('youtube.com') &&
            !href.includes('help')
          );
        })
        .map(link => ({
          url: link.href,
          text: link.innerText.trim()
        }))
        .filter(link => link.text !== '');
    });
}

// Rest of the code remains the same
async function performSearch(config: SearchConfig): Promise<void> {
  const browser: Browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  await context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
  const page: Page = await context.newPage();
  const allResults: SearchResult[] = [];

  try {
    await page.goto('https://www.google.com', { waitUntil: 'networkidle' });
    await randomDelay(config.minDelay, config.maxDelay);

    try {
      const acceptButton = await page.waitForSelector('button[aria-label="Accept all"]', { timeout: 5000 });
      if (acceptButton) {
        const box = await acceptButton.boundingBox();
        if (box) {
          await moveMouseNaturally(page, box.x + 20, box.y + 10);
          await acceptButton.click();
        }
      }
    } catch {
      // Accept button not found or not needed
    }

    const searchBox = 'textarea[name="q"]';
    await randomDelay(config.minDelay, config.maxDelay);

    const searchElement = await page.waitForSelector(searchBox);
    if (searchElement) {
      const box = await searchElement.boundingBox();
      if (box) {
        await moveMouseNaturally(page, box.x + box.width/2, box.y + box.height/2);
        await humanLikeTyping(page, searchBox, config.query);
      }
    }

    await randomDelay(0.5, 1.5);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    let pagesProcessed = 0;
    while (pagesProcessed < config.numPages) {
      await randomDelay(config.minDelay, config.maxDelay);

      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, Math.floor(Math.random() * 201 + 100));
        await randomDelay(config.minDelay, config.maxDelay);
      }

      const pageResults = await extractPageLinks(page);
      allResults.push(...pageResults);

      pagesProcessed++;
      if (pagesProcessed < config.numPages) {
        const nextButton = await page.locator('a#pnnext').first();
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
        } else {
          break;
        }
      }
    }

    const resultsBase = `search_results_${config.query.replace(/ /g, '_')}`;
    const searchResponse: SearchResponse = {
      query: config.query,
      pagesProcessed,
      totalLinks: allResults.length,
      results: allResults
    };

    const fs = require('fs').promises;
    await fs.writeFile(
      `${resultsBase}.json`,
      JSON.stringify(searchResponse, null, 2),
      'utf-8'
    );

    console.log(`Search completed successfully. Results saved to ${resultsBase}.json`);

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const searches: SearchConfig[] = [
    { ...defaultSearchConfig, query: "laporan keuangan bbri", numPages: 1 }
  ];

  for (const searchConfig of searches) {
    console.log(`\nStarting search for: ${searchConfig.query}`);
    await performSearch(searchConfig);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SearchConfig, SearchResult, SearchResponse, performSearch };