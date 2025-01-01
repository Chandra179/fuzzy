import { chromium, Browser, BrowserContext } from '@playwright/test';
import { BrowserConfig } from './types';

export class BrowserManager {
  private static readonly DEFAULT_CONFIG: BrowserConfig = {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  };

  static async initializeBrowser(config: Partial<BrowserConfig> = {}): Promise<Browser> {
    return await chromium.launch({
      headless: config.headless ?? this.DEFAULT_CONFIG.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
      ],
    });
  }

  static async createContext(
    browser: Browser,
    config: Partial<BrowserConfig> = {},
  ): Promise<BrowserContext> {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };

    const context = await browser.newContext({
      viewport: mergedConfig.viewport,
      userAgent: mergedConfig.userAgent,
      locale: mergedConfig.locale,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    await context.addInitScript(
      "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})",
    );

    return context;
  }
}
