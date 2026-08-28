import type { Page, Locator } from '@playwright/test';

/**
 * The global header, present on every page of the community: logo, search,
 * primary nav (IdeaExchange / Known Issues / Help / Trust / Trailblazer
 * Community) and the guest-user Sign Up / Log In actions. Modelled as a
 * component (not a page) since every page object composes it rather than
 * duplicating its locators.
 */
export class NavBarComponent {
  private readonly header: Locator;
  readonly searchInput: Locator;
  readonly signUpButton: Locator;
  readonly logInButton: Locator;
  readonly homeLogoLink: Locator;

  constructor(private readonly page: Page) {
    // Scoped to the header landmark so this never accidentally matches the
    // visually-identical "Search this feed…" box further down the page,
    // or the footer's own "Trust" link (the site renders both).
    const header = page.locator('header, [role="banner"]').first();
    this.header = header;
    this.searchInput = header.getByPlaceholder(/^search/i);
    this.signUpButton = header
      .getByRole('button', { name: /sign up/i })
      .or(header.getByRole('link', { name: /sign up/i }));
    this.logInButton = header
      .getByRole('button', { name: /log in/i })
      .or(header.getByRole('link', { name: /log in/i }));
    this.homeLogoLink = page.getByRole('link', { name: /idea ?exchange.*home/i });
  }

  navLink(name: string): Locator {
    return this.header.getByRole('link', { name, exact: false });
  }

  async search(term: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }
}
