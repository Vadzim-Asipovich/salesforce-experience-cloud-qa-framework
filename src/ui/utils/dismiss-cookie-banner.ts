import type { Page } from '@playwright/test';

/**
 * Dismisses the OneTrust cookie-consent dialog if one is showing. Shared
 * by `BasePage.acceptCookiesIfPresent()` and specs that navigate a bare
 * `page` fixture cross-origin (e.g. into `tbid.digital.salesforce.com`,
 * which layers its own consent dialog on top of the login form).
 */
export async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const acceptButton = page.getByRole('button', { name: /accept all cookies/i });
  try {
    await acceptButton.waitFor({ state: 'visible', timeout: 5_000 });
    await acceptButton.click();
  } catch {
    // Banner didn't appear (already dismissed / cookie already set) — not an error.
  }
}
