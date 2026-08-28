import { test, expect } from '../../src/ui/fixtures/ui-fixtures';

test.describe('Ideas listing — category filter & sort @ui', () => {
  test('filtering by a category narrows the results to that category', async ({
    ideasListPage,
  }) => {
    await ideasListPage.goto();
    const unfilteredCount = await ideasListPage.ideaCount();

    await ideasListPage.filterByCategory('Commerce');

    // The filtered feed re-renders; wait for at least one Commerce card
    // instead of a fixed timeout (the summary text stays "Showing results
    // 1-50" either way, so it can't be used as the wait condition here).
    await expect(ideasListPage.ideaCard(0).categoryPath).toContainText('Commerce');

    const filteredCount = await ideasListPage.ideaCount();
    expect(filteredCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(filteredCount, 5); i++) {
      await expect(ideasListPage.ideaCard(i).categoryPath).toContainText('Commerce');
    }

    // A category-scoped result set should never be larger than the
    // unfiltered default page — a sanity bound, not an exact-count
    // assertion, since IdeaExchange is live data that changes daily.
    expect(filteredCount).toBeLessThanOrEqual(unfilteredCount);
  });

  test('sorting by Date surfaces recently-posted ideas at low point totals', async ({
    ideasListPage,
  }) => {
    await ideasListPage.goto();
    // The default sort is by Points (high to low); the very first idea
    // has accumulated a large point total over years — a reliable anchor
    // to detect that switching to Date actually re-ordered the feed.
    // points() is a raw text read, so poll it rather than capturing once.
    await expect.poll(() => ideasListPage.ideaCard(0).points()).toBeGreaterThan(1_000);
    const pointsSortedTopPoints = await ideasListPage.ideaCard(0).points();

    await ideasListPage.sortBy('Date');
    await expect(ideasListPage.ideaCards.first()).toBeVisible();

    // A brand-new idea realistically has far fewer points than the
    // highest-ever community favourite — a loose but stable bound.
    await expect.poll(() => ideasListPage.ideaCard(0).points()).toBeLessThan(pointsSortedTopPoints);
  });

  test('each card in the default view exposes a valid status badge', async ({ ideasListPage }) => {
    await ideasListPage.goto();
    const STATUS_RE = /^(Open|In Development|Delivered|Archived)$/;

    await expect(ideasListPage.ideaCards.first()).toBeVisible();
    const count = await ideasListPage.ideaCount();
    for (let i = 0; i < Math.min(count, 10); i++) {
      await expect(ideasListPage.ideaCard(i).statusBadge).toHaveText(STATUS_RE);
    }
  });
});
