import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { NavBarComponent } from '../components/nav-bar.component';

// Observed on the live site (2026-08-27) — see api/schemas/idea.schema.ts for the same caveat.
export type IdeaStatus = 'Open' | 'In Development' | 'Delivered' | 'Archived';

/**
 * A single idea's detail view (`/s/idea/{id}/{slug}`). Selectors verified
 * against the live DOM on 2026-08-27 — see docs/ARCHITECTURE.md.
 *
 * The points/votes numbers are rendered by Salesforce's own
 * `lightning-formatted-number` base component, which owns its own nested
 * shadow root — one level past what a plain `textContent()` read can see
 * (that call only sees the light-DOM children of whatever element it's
 * invoked on, not a *descendant* shadow tree). `pointsAndVotes()` below
 * pierces that with a small in-page `evaluate`, the standard escape hatch
 * for exactly this situation rather than a framework limitation.
 */
export class IdeaDetailPage extends BasePage {
  readonly nav: NavBarComponent;

  constructor(page: Page) {
    super(page);
    this.nav = new NavBarComponent(page);
  }

  async gotoById(id: string, slug = ''): Promise<void> {
    await this.open(`/s/idea/${id}/${slug}`);
    await this.acceptCookiesIfPresent();
    await this.titleHeading.waitFor({ state: 'visible', timeout: 20_000 });
  }

  get titleHeading(): Locator {
    return this.page.locator('h1.idx-record-detail-title');
  }

  get statusBadge(): Locator {
    // The page renders a duplicate (responsive/mobile) copy of this badge;
    // `.first()` keeps callers out of Playwright's strict-mode ambiguity error.
    return this.page.locator('div.status-container div.primary').first();
  }

  get postedDate(): Locator {
    return this.page.locator('div.posted-date').first();
  }

  get followButton(): Locator {
    return this.page.getByRole('button', { name: /^follow/i });
  }

  get commentsSearchInput(): Locator {
    return this.page.getByPlaceholder(/search this feed/i);
  }

  private get pointsAndVotesSection(): Locator {
    return this.page.locator('.idx-points-section').first();
  }

  async readStatus(): Promise<string> {
    return ((await this.statusBadge.textContent()) ?? '').trim();
  }

  async readTitle(): Promise<string> {
    return ((await this.titleHeading.textContent()) ?? '').trim();
  }

  /** Pierces the `lightning-formatted-number` shadow trees to read "125,570 Points12,619 Votes". */
  async pointsAndVotes(): Promise<{ points: number; votes: number }> {
    const raw = await this.pointsAndVotesSection.evaluate((el) => {
      function deepText(node: Element | ShadowRoot): string {
        let text = '';
        if ('shadowRoot' in node && node.shadowRoot) text += deepText(node.shadowRoot);
        node.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? '';
          else if (child.nodeType === Node.ELEMENT_NODE) text += deepText(child as Element);
        });
        return text;
      }
      return deepText(el);
    });

    const pointsMatch = raw.match(/([\d,]+)\s*Points/i);
    const votesMatch = raw.match(/([\d,]+)\s*Votes/i);
    const toInt = (group: string | undefined): number =>
      group ? Number.parseInt(group.replace(/,/g, ''), 10) : Number.NaN;
    return {
      points: toInt(pointsMatch?.[1]),
      votes: toInt(votesMatch?.[1]),
    };
  }
}
