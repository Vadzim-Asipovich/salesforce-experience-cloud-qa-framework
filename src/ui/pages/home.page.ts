import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { NavBarComponent } from '../components/nav-bar.component';

export class HomePage extends BasePage {
  readonly nav: NavBarComponent;

  constructor(page: Page) {
    super(page);
    this.nav = new NavBarComponent(page);
  }

  async goto(): Promise<void> {
    await this.open('/s/');
    await this.acceptCookiesIfPresent();
  }

  heading() {
    return this.page.getByRole('heading', { name: /welcome to\s*idea ?exchange/i });
  }

  ideaExchangeCommunityLink() {
    return this.page.getByRole('link', { name: /idea ?exchange community/i });
  }
}
