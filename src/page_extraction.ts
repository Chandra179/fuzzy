import { Page, ElementHandle } from 'playwright';
import { SearchResult } from './types';

async function isElementVisible(element: ElementHandle): Promise<boolean> {
  try {
    return await element.evaluate((el: Node) => {
      if (!(el instanceof HTMLElement)) return false;

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0 &&
        el.offsetParent !== null
      );
    });
  } catch {
    return false;
  }
}

async function attemptInteraction(page: Page, element: ElementHandle): Promise<boolean> {
  try {
    // Try using JavaScript click first
    await element.evaluate((el: Node) => {
      if (el instanceof HTMLElement) {
        el.click();
      }
    });
    await page.waitForTimeout(100);

    // Check if interaction was successful
    const isExpanded = await element.evaluate((el: Node) => {
      if (!(el instanceof HTMLElement)) return false;
      const expanded = el.getAttribute('aria-expanded');
      const hasVisibleMenu = el.querySelector('.dropdown-menu, [role="menu"]');
      return expanded === 'true' || hasVisibleMenu !== null;
    });

    if (isExpanded) return true;

    // Try forcing pointer events
    await element.evaluate((el: Node) => {
      if (el instanceof HTMLElement) {
        const parent = el.closest('[class*="dropdown"]') || el;
        if (parent instanceof HTMLElement) {
          parent.style.pointerEvents = 'auto';
          parent.style.zIndex = '99999';
        }
      }
    });

    // Try direct click with force option
    await element.click({ force: true, timeout: 1000 });
    await page.waitForTimeout(100);

    return true;
  } catch (error) {
    try {
      // As a last resort, try keyboard navigation
      await element.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      return true;
    } catch {
      return false;
    }
  }
}

async function handleSelect(page: Page, select: ElementHandle): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const isVisible = await isElementVisible(select);
    if (!isVisible) return results;

    const isMultiple = await select.evaluate((el: Node) => {
      return el instanceof HTMLSelectElement ? el.multiple : false;
    });

    const options = await select.evaluate((el: Node) => {
      if (!(el instanceof HTMLSelectElement)) return [];
      return Array.from(el.options).map((option) => ({
        value: option.value,
        text: option.text,
        selected: option.selected,
      }));
    });

    if (isMultiple) {
      await select.selectOption(
        options.map((opt) => opt.value),
        { force: true, timeout: 2000 },
      );
    } else if (options.length > 0) {
      await select.selectOption(options[options.length - 1].value, { force: true, timeout: 2000 });
    }

    const newLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter((link): link is HTMLAnchorElement => link instanceof HTMLAnchorElement)
        .map((link) => ({
          url: link.href,
          text: link.textContent?.trim() || '',
          source: 'select',
        }));
    });

    results.push(...newLinks);
  } catch (error) {
    console.warn('Error handling select element:', error);
  }

  return results;
}

async function handleDropdownMenu(page: Page, trigger: ElementHandle): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const isVisible = await isElementVisible(trigger);
    if (!isVisible) return results;

    const interactionSuccessful = await attemptInteraction(page, trigger);
    if (!interactionSuccessful) return results;

    const dropdownLinks = await page.evaluate(() => {
      const menuSelectors = [
        '.dropdown-menu a',
        '[role="menu"] a',
        '.menu-items a',
        '[aria-expanded="true"] ~ * a',
        '[class*="dropdown"] a',
        '[class*="menu"] a',
      ];

      const links = Array.from(document.querySelectorAll(menuSelectors.join(',')));
      return links
        .filter((link): link is HTMLAnchorElement => {
          if (!(link instanceof HTMLAnchorElement)) return false;
          const style = window.getComputedStyle(link);
          return style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((link) => ({
          url: link.href,
          text: link.textContent?.trim() || '',
          source: 'dropdown',
        }))
        .filter((link) => link.url && link.url.startsWith('http'));
    });

    results.push(...dropdownLinks);
  } catch (error) {
    console.warn('Error handling dropdown:', error);
  }

  return results;
}

export async function extractPageLinks(page: Page): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  const dropdownTriggers = await page.$$(
    [
      '[aria-haspopup="true"]',
      '[data-toggle="dropdown"]',
      '.dropdown-toggle',
      'button.dropdown',
      '[class*="dropdown"]',
      '[role="combobox"]',
      '[class*="select"]',
    ].join(','),
  );

  // for (const trigger of dropdownTriggers) {
  //   const dropdownResults = await handleDropdownMenu(page, trigger);
  //   results.push(...dropdownResults);
  // }

  // const selects = await page.$$('select');
  // for (const select of selects) {
  //   const selectResults = await handleSelect(page, select);
  //   results.push(...selectResults);
  // }

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

  const uniqueResults = Array.from(new Map(results.map((item) => [item.url, item])).values());

  return uniqueResults;
}
