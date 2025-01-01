import { Page } from 'playwright';
import { chromium } from '@playwright/test';
import { promises as fs } from 'fs';
import { SearchResult, ProcessedResult, SearchResponse } from './types';

export async function extractPageLinks(page: Page, maxLinks: number): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  const visibleLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button[href], [role="link"]'));

    return links
      .filter((element): element is HTMLElement => {
        if (!(element instanceof HTMLElement)) return false;

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const isVisible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0;

        const href =
          element instanceof HTMLAnchorElement ? element.href : element.getAttribute('href');

        return Boolean(
          isVisible &&
            href &&
            href.startsWith('http') &&
            !href.includes('google.com') &&
            !href.includes('youtube.com') &&
            !href.includes('help'),
        );
      })
      .map((element) => ({
        url:
          element instanceof HTMLAnchorElement ? element.href : element.getAttribute('href') || '',
        text: element.innerText.trim(),
        source: 'visible',
      }))
      .filter((link) => link.text !== '');
  });

  results.push(...visibleLinks);

  // Ensure links are unique
  const uniqueResults = Array.from(new Map(results.map((item) => [item.url, item])).values());

  // Limit to the specified maxLinks
  return uniqueResults.slice(0, maxLinks);
}

export async function handleDropdowns(page: Page): Promise<void> {
  try {
    // Handle standard select elements
    const selects = await page.$$('select');
    for (const select of selects) {
      const isMultiple = await select.evaluate((el: HTMLSelectElement) => el.multiple);
      const options = await select.evaluate((select: HTMLSelectElement) => {
        return Array.from(select.options).map((opt) => ({
          value: opt.value,
          text: opt.text.toLowerCase(),
        }));
      });

      if (options.length === 0) continue;

      if (isMultiple) {
        // Select all options for multiple select
        await select.selectOption(options.map((opt) => opt.value));
      } else {
        // For single select, prefer "All" option or last option
        const allOption = options.find(
          (opt) =>
            opt.text.includes('all') || opt.text.includes('semua') || opt.text.includes('seluruh'),
        );

        if (allOption) {
          await select.selectOption(allOption.value);
        } else {
          await select.selectOption(options[options.length - 1].value);
        }
      }

      // Wait for potential content updates
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }

    // Handle custom dropdowns
    const dropdownTriggers = await page.$$(
      [
        '[role="combobox"]',
        '[aria-haspopup="listbox"]',
        '.dropdown-toggle',
        '[data-toggle="dropdown"]',
        '[class*="dropdown"]',
        '[class*="select"]',
      ].join(','),
    );

    for (const trigger of dropdownTriggers) {
      try {
        // Try to click the dropdown trigger
        await trigger.click({ timeout: 2000 });
        await page.waitForTimeout(500);

        // Look for checkboxes within the dropdown
        const checkboxes = await page.$$('input[type="checkbox"]');
        if (checkboxes.length > 0) {
          // Select all checkboxes
          for (const checkbox of checkboxes) {
            await checkbox.check();
          }
        } else {
          // Look for dropdown items
          const items = await page.$$('[role="option"], .dropdown-item');
          if (items.length > 0) {
            // Click the last item or one with "All"
            const allItem = await page.$('text=/all|semua|seluruh/i');
            if (allItem) {
              await allItem.click();
            } else {
              await items[items.length - 1].click();
            }
          }
        }

        // Wait for potential content updates
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      } catch (error) {
        console.warn(`Failed to interact with dropdown: ${error}`);
        continue;
      }
    }
  } catch (error) {
    console.warn(`Error handling dropdowns: ${error}`);
  }
}

async function processUrl(page: Page, url: string): Promise<ProcessedResult> {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Handle initial dropdowns
    await handleDropdowns(page);

    // Extract links after dropdown interaction
    const extractedLinks = await extractPageLinks(page, Infinity);

    return {
      originalUrl: url,
      extractedLinks,
    };
  } catch (error) {
    return {
      originalUrl: url,
      extractedLinks: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function processSearchResults(jsonFilePath: string): Promise<void> {
  const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
  const searchResponse: SearchResponse = JSON.parse(jsonContent);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const processedResults: ProcessedResult[] = [];

  try {
    for (const result of searchResponse.results) {
      console.log(`Processing URL: ${result.url}`);
      const processed = await processUrl(page, result.url);
      processedResults.push(processed);
    }

    // Save processed results
    const outputPath = jsonFilePath.replace('.json', '_processed.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          originalQuery: searchResponse.query,
          processedResults,
        },
        null,
        2,
      ),
    );

    console.log(`Results saved to: ${outputPath}`);
  } finally {
    await browser.close();
  }
}
