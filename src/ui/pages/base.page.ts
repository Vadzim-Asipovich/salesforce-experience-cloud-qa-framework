import type { Page } from '@playwright/test';
import { dismissCookieBannerIfPresent } from '../utils/dismiss-cookie-banner';

/**
 * Shared behaviour for every page object.
 *
 * Two things worth calling out for reviewers unfamiliar with Aura/LWC UIs:
 *  - Playwright's built-in locators pierce open shadow DOM automatically,
 *    which is exactly the DOM Experience Cloud / Lightning components
 *    render into. No custom shadow-piercing helpers are needed — that's
 *    one of the strongest practical reasons to prefer Playwright over
 *    classic Selenium `WebDriver.findElement` for Salesforce UIs.
 *  - `waitForLoadState('networkidle')` is deliberately NOT used as a
 *    general-purpose wait: Aura apps keep long-lived polling connections
 *    open, so `networkidle` either times out or fires too early. Each
 *    page object instead waits on an element/condition that actually
 *    signals "this page is interactive".
 */
export abstract class BasePage {
  /** Public so specs can drop to raw Playwright APIs (e.g. `context`, `waitForURL`) when a page object doesn't cover something. */
  constructor(public readonly page: Page) {}

  /**
   * Navigate within the Experience Cloud app. Uses `domcontentloaded`, not
   * Playwright's default `load`: the Aura/LWC bundle keeps pulling
   * non-critical resources (images, analytics beacons, long-poll
   * connections) long after the page is interactive, so waiting for `load`
   * routinely costs 10-15s in Firefox/WebKit and signals nothing useful.
   * Callers wait on a real readiness element immediately afterwards.
   */
  protected async open(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async acceptCookiesIfPresent(): Promise<void> {
    await dismissCookieBannerIfPresent(this.page);
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  url(): string {
    return this.page.url();
  }
}
