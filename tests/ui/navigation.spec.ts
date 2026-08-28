import { test, expect } from '@src/ui/fixtures/ui-fixtures';
import { issue, testCase } from '@src/utils/traceability';

test.describe('Home page & global navigation', { tag: ['@regression', '@navigation'] }, () => {
  test(
    'loads the IdeaExchange home page for a guest user',
    { tag: '@smoke', annotation: [issue('ST-101'), testCase('ST-TC-101')] },
    async ({ homePage }) => {
      await homePage.goto();

      await expect(homePage.page).toHaveTitle(/idea ?exchange/i);
      await expect(homePage.heading()).toBeVisible();

      // A guest (not logged in) sees Sign Up / Log In — proves we're testing
      // the real public, unauthenticated entry point, not a cached/authed session.
      await expect(homePage.nav.signUpButton).toBeVisible();
      await expect(homePage.nav.logInButton).toBeVisible();
    },
  );

  test(
    'primary navigation links point at their expected sections',
    { annotation: [issue('ST-102')] },
    async ({ homePage }) => {
      await homePage.goto();

      for (const name of ['Known Issues', 'Help', 'Trust']) {
        await expect(homePage.nav.navLink(name)).toBeVisible();
      }
    },
  );

  test(
    'the global header search box accepts input',
    { annotation: [issue('ST-103')] },
    async ({ homePage }) => {
      await homePage.goto();

      await homePage.nav.searchInput.fill('Data Cloud');
      await expect(homePage.nav.searchInput).toHaveValue('Data Cloud');
    },
  );

  test(
    '"IdeaExchange Community" CTA opens the Trailblazer Community',
    { annotation: [issue('ST-104')] },
    async ({ homePage, page, context }) => {
      await homePage.goto();

      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        homePage.ideaExchangeCommunityLink().click(),
      ]);
      await popup.waitForLoadState('domcontentloaded');

      expect(popup.url()).toContain('salesforce.com');
      await popup.close();
      await expect(page).toHaveURL(/ideas\.salesforce\.com/);
    },
  );
});
