import { test, expect } from '@src/ui/fixtures/ui-fixtures';

/**
 * Guest (unauthenticated) users can browse and search freely, but
 * write-oriented routes must gate behind Salesforce's real Trailblazer ID
 * login. These tests never submit credentials — they only assert the
 * redirect itself, which is exactly the boundary a QA suite should verify
 * without touching anything requiring a real account.
 */
test.describe('Guest-user access restrictions @ui', () => {
  test('visiting "Post an idea" as a guest redirects to Trailblazer ID login', async ({ page }) => {
    await page.goto('/s/post');

    // Only the redirect target is asserted, deliberately not the login
    // form's own content: tbid.digital.salesforce.com is Okta-backed and,
    // verified while building this suite, serves a blank body to
    // automated/headless browsers past its cookie dialog — bot-detection
    // on the identity provider's side, not a bug in this test. Asserting
    // the redirect boundary is both the actually-interesting behaviour
    // and the part that's reliably observable.
    await page.waitForURL(/tbid\.digital\.salesforce\.com/i, { timeout: 15_000 });
    // The tab title on this step varies slightly by engine/timing
    // ("Trailblazer account" vs an interim "Log in") — both are the same
    // real login destination, so either is an acceptable match.
    await expect(page).toHaveTitle(/trailblazer account|log in/i);
  });

  test('the home page never renders authenticated-only chrome for a guest', async ({
    homePage,
  }) => {
    await homePage.goto();

    await expect(homePage.nav.signUpButton).toBeVisible();
    await expect(homePage.nav.logInButton).toBeVisible();
    // A guest has no profile menu / avatar to click.
    await expect(
      homePage.page.getByRole('button', { name: /account menu|user menu/i }),
    ).toHaveCount(0);
  });
});
