import { Page } from '@playwright/test';
import { InteractionUtils } from './interaction_utils';

export class PageActions {
  static async handleCookieConsent(page: Page): Promise<void> {
    try {
      const acceptButton = await page.waitForSelector('button[aria-label="Accept all"]', {
        timeout: 5000,
      });
      if (acceptButton) {
        const box = await acceptButton.boundingBox();
        if (box) {
          await InteractionUtils.moveMouseNaturally(page, box.x + 20, box.y + 10);
          await acceptButton.click();
        }
      }
    } catch {
      // Accept button not found or not needed
    }
  }

  static async performSearch(
    page: Page,
    searchQuery: string,
    config: { minDelay: number; maxDelay: number },
  ): Promise<void> {
    const searchBox = 'textarea[name="q"]';
    await InteractionUtils.randomDelay(config.minDelay, config.maxDelay);

    const searchElement = await page.waitForSelector(searchBox);
    if (searchElement) {
      const box = await searchElement.boundingBox();
      if (box) {
        await InteractionUtils.moveMouseNaturally(
          page,
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        await InteractionUtils.humanLikeTyping(page, searchBox, searchQuery);
      }
    }

    await InteractionUtils.randomDelay(0.5, 1.5);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
  }

  static async simulateNaturalScrolling(
    page: Page,
    config: { minDelay: number; maxDelay: number },
  ): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, Math.floor(Math.random() * 201 + 100));
      await InteractionUtils.randomDelay(config.minDelay, config.maxDelay);
    }
  }
}
