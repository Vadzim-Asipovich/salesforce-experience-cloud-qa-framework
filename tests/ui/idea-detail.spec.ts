import { test, expect } from '@src/ui/fixtures/ui-fixtures';
import { issue, testCase } from '@src/utils/traceability';

// A long-lived, Delivered idea — stable enough to anchor assertions on
// (unlike vote/point counts, which climb daily and are asserted as
// bounds, never exact numbers).
const KNOWN_IDEA_ID = 'a0B8W00000GdiWiUAJ';
const KNOWN_IDEA_TITLE =
  "Dependent page layouts - data rules to show, hide, or make fields/sections req'd";

test.describe('Idea detail page', { tag: ['@regression', '@ideas'] }, () => {
  test(
    'renders title, status, points/votes and posted-by info for a known idea',
    { tag: '@smoke', annotation: [issue('ST-201'), testCase('ST-TC-201')] },
    async ({ ideaDetailPage }) => {
      await ideaDetailPage.gotoById(KNOWN_IDEA_ID);

      await expect(ideaDetailPage.titleHeading).toHaveText(KNOWN_IDEA_TITLE);
      await expect(ideaDetailPage.statusBadge).toHaveText('Delivered');

      // pointsAndVotes() is a raw shadow-DOM read; poll it so a slow-hydrating
      // lightning-formatted-number gets a retry window instead of a hard fail.
      await expect
        .poll(async () => (await ideaDetailPage.pointsAndVotes()).points)
        .toBeGreaterThan(100_000);
      await expect
        .poll(async () => (await ideaDetailPage.pointsAndVotes()).votes)
        .toBeGreaterThan(1_000);

      await expect(ideaDetailPage.postedDate).toContainText(/posted/i);
      await expect(ideaDetailPage.postedDate).toContainText('2006');
    },
  );

  test(
    'a guest user sees a Follow control but is not shown as already following',
    { annotation: [issue('ST-202')] },
    async ({ ideaDetailPage }) => {
      await ideaDetailPage.gotoById(KNOWN_IDEA_ID);

      await expect(ideaDetailPage.followButton).toBeVisible();
      // SLDS stateful buttons expose their state via aria-pressed; a guest
      // has no session to have followed anything in, so it must be false.
      await expect(ideaDetailPage.followButton).toHaveAttribute('aria-pressed', 'false');
    },
  );

  test(
    'the comments section exposes its own scoped search box',
    { annotation: [issue('ST-203')] },
    async ({ ideaDetailPage }) => {
      await ideaDetailPage.gotoById(KNOWN_IDEA_ID);
      await expect(ideaDetailPage.commentsSearchInput).toBeVisible();
    },
  );
});
