import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { IdeasListPage } from '../pages/ideas-list.page';
import { IdeaDetailPage } from '../pages/idea-detail.page';

interface UiFixtures {
  homePage: HomePage;
  ideasListPage: IdeasListPage;
  ideaDetailPage: IdeaDetailPage;
}

/** Extends the base test with ready-to-use page objects, one per spec's `page`. */
export const test = base.extend<UiFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  ideasListPage: async ({ page }, use) => {
    await use(new IdeasListPage(page));
  },
  ideaDetailPage: async ({ page }, use) => {
    await use(new IdeaDetailPage(page));
  },
});

export { expect } from '@playwright/test';
