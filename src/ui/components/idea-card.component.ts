import type { Locator } from '@playwright/test';

/**
 * One idea in the results feed. Every selector below was verified against
 * the live DOM (`.search-result-item` cards, nested three shadow-DOM
 * levels deep under `<c-idea-search-result-details>`) rather than guessed
 * — Playwright's locators pierce that shadow boundary transparently, but
 * getting the exact class names right still requires looking at the real
 * page once, the same as it would on a real Salesforce project.
 */
export class IdeaCardComponent {
  constructor(private readonly root: Locator) {}

  get titleLink(): Locator {
    return this.root.locator('a.idea-result-description__title');
  }

  get categoryPath(): Locator {
    return this.root.locator(
      'p.idea-result-description__font:not(.idea-result-description__content)',
    );
  }

  get description(): Locator {
    return this.root.locator('p.idea-result-description__content');
  }

  get authorLink(): Locator {
    return this.root.locator('a[href*="/s/user-profile"]');
  }

  get pointsAmount(): Locator {
    return this.root.locator('h2.idea-result-details__points-amt');
  }

  get statusBadge(): Locator {
    return this.root.locator('span.idea-result-details__status-badge');
  }

  async title(): Promise<string> {
    return ((await this.titleLink.textContent()) ?? '').trim();
  }

  async points(): Promise<number> {
    const text = ((await this.pointsAmount.textContent()) ?? '0').trim();
    return Number.parseInt(text.replace(/,/g, ''), 10);
  }

  async status(): Promise<string> {
    return ((await this.statusBadge.textContent()) ?? '').trim();
  }

  async open(): Promise<void> {
    await this.titleLink.click();
  }
}
