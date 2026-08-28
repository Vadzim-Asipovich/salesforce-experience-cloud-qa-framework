import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { NavBarComponent } from '../components/nav-bar.component';
import { IdeaCardComponent } from '../components/idea-card.component';

/**
 * The Ideas listing (nav tab "Ideas" → real route `/s/search`): category
 * filter tree, points/date sort, and the paginated feed of idea cards.
 *
 * Selectors here were verified against the live site on 2026-08-27 (see
 * docs/ARCHITECTURE.md § "UI target"). Lightning/Aura markup is not part
 * of any public contract the way a REST API's shape is, so — same as any
 * real Salesforce project — these favour stable, purpose-built CSS
 * classes and `data-*` attributes discovered in the real DOM over blind
 * guesses at accessible roles the site doesn't actually expose.
 */
export class IdeasListPage extends BasePage {
  readonly nav: NavBarComponent;

  constructor(page: Page) {
    super(page);
    this.nav = new NavBarComponent(page);
  }

  async goto(): Promise<void> {
    // Confusingly, the "Ideas" nav tab routes to /s/search, not /s/ideas —
    // verified against the live nav's rendered href, not guessed.
    await this.page.goto('/s/search');
    await this.acceptCookiesIfPresent();
    await this.resultsSummary.waitFor({ state: 'visible' });
  }

  get allIdeasTab(): Locator {
    return this.page.getByText(/^all ideas$/i);
  }

  get myActivityTab(): Locator {
    return this.page.getByText(/^my activity$/i);
  }

  get resultsSummary(): Locator {
    return this.page.getByText(/showing results/i);
  }

  /** Every idea card currently rendered in the feed, in display order. */
  get ideaCards(): Locator {
    return this.page.locator('.search-result-item');
  }

  ideaCard(index: number): IdeaCardComponent {
    return new IdeaCardComponent(this.ideaCards.nth(index));
  }

  /**
   * The category tree's checkboxes have no accessible name (no `<label>`
   * association, no `aria-label` — a real gap in the live site's markup,
   * worth flagging in a real engagement) but each carries a stable
   * `data-category-id`, which is a more precise target here than
   * role+name would be even if the a11y gap were fixed.
   */
  categoryCheckbox(categoryName: string): Locator {
    return this.page.locator(`input[type="checkbox"][data-category-id="${categoryName}"]`);
  }

  /**
   * The clickable surface a real user interacts with: the input itself is
   * visually replaced by this `<label>` (a standard SLDS accessible-hide
   * pattern), and — verified live — the component's filter logic is wired
   * to the label's click, not a native `change` event on the input, so a
   * direct/forced click on the input toggles nothing.
   */
  private categoryLabel(categoryName: string): Locator {
    return this.page.locator(`label.category-label[title="${categoryName}"]`);
  }

  sortControl(mode: 'Points' | 'Date'): Locator {
    return this.page.locator('.sort-label', { hasText: mode });
  }

  async sortBy(mode: 'Points' | 'Date'): Promise<void> {
    await this.sortControl(mode).click();
  }

  async filterByCategory(categoryName: string): Promise<void> {
    await this.categoryLabel(categoryName).click();
  }

  async ideaCount(): Promise<number> {
    return this.ideaCards.count();
  }

  /** Reads every visible card's points value — used to assert sort order. */
  async allPoints(): Promise<number[]> {
    const count = await this.ideaCount();
    const points: number[] = [];
    for (let i = 0; i < count; i++) {
      points.push(await this.ideaCard(i).points());
    }
    return points;
  }
}
