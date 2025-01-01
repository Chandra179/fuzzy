import { Page } from '@playwright/test';

export class InteractionUtils {
  static async randomDelay(minSeconds: number, maxSeconds: number): Promise<void> {
    const delay = Math.random() * (maxSeconds - minSeconds) + minSeconds;
    await new Promise((resolve) => setTimeout(resolve, delay * 1000));
  }

  static async moveMouseNaturally(page: Page, targetX: number, targetY: number): Promise<void> {
    const steps = 10;
    const currentPosition = await page.evaluate(() => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }));

    for (let i = 1; i <= steps; i++) {
      const x = currentPosition.x + (targetX - currentPosition.x) * (i / steps);
      const y = currentPosition.y + (targetY - currentPosition.y) * (i / steps);
      await page.mouse.move(x, y);
      await this.randomDelay(0.05, 0.1);
    }
  }

  static async humanLikeTyping(page: Page, selector: string, text: string): Promise<void> {
    for (const char of text) {
      await page.type(selector, char, { delay: Math.random() * 100 + 50 });
    }
  }
}
