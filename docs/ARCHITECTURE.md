# Architecture

This document explains the _why_ behind the structure — the README covers the _how to run it_.

## Goals, in priority order

1. **Runs green for a stranger, from a clean clone, with zero secrets.** A framework nobody can execute isn't a framework, it's a slide deck. `npm ci && npx playwright install && npm test` must work on a laptop that has never seen a Salesforce org.
2. **Exercises real Salesforce surfaces, not stand-ins for their own sake.** The UI suite drives a real, live, publicly-accessible Salesforce Experience Cloud (Lightning/Aura) site. The API suite speaks the real Salesforce REST API contract — request/response shapes, the JWT Bearer auth flow, the `[{message, errorCode}]` error envelope — against a mock that implements that contract faithfully, so the exact same client code runs unmodified against a real org.
3. **Fails with a diagnosis, not a mystery.** Typed clients, schema validation on every response, `test.step()` breadcrumbing, traces/videos/screenshots retained on failure, secret-masked logging.
4. **Costs little to maintain.** Page objects and components isolate Lightning/Aura's shadow-DOM churn behind a stable API; CI is parallel and fast; lint/format/typecheck gates catch drift before a human has to.

## UI target: why ideas.salesforce.com

Testing "a Salesforce-based SaaS platform" needs a real Salesforce Experience Cloud front end to point at. For a public code sample, that target has to be:

- **Genuinely Salesforce** — real Aura/Lightning DOM (`aura_prod.js`, `siteforce:communityApp`, SLDS classes, shadow-DOM-encapsulated LWC components), not a look-alike custom app.
- **Publicly browsable with zero credentials** — a guest-accessible site, so `git clone && npm test` never needs a login.
- **Safe and appropriate to automate against** — Salesforce's _own_ public product, not a third party's production site scraped without any relationship to this project.
- **Stable enough to build a portfolio piece on.**

[ideas.salesforce.com](https://ideas.salesforce.com) (the IdeaExchange) satisfies all four: it's Salesforce's own public community, served by `siteforce:communityApp` over Aura, with a guest user profile (`"authenticated":"false"` in the bootstrap payload — verified directly in the page's own JS bundle URLs), real SLDS markup (`.slds-card`, `.idea-result-details`, `.search-result-item`, …), and genuine record IDs (`a0B8W00000GdiWiUAJ` — the `a0B` prefix is a real Salesforce custom-object key prefix).

Every selector in `src/ui/` was checked against the live DOM (2026-08-27) rather than guessed — including two non-obvious findings worth calling out for anyone extending this suite:

- The **"Ideas" nav tab routes to `/s/search`**, not the `/s/ideas` its label suggests.
- The **category filter checkboxes carry no accessible name** (no `<label>`, no `aria-label` — a real accessibility gap in the live site) but do carry a stable `data-category-id` attribute, which `IdeasListPage.categoryCheckbox()` targets directly.
- The **points/votes counters** are rendered by Salesforce's own `lightning-formatted-number` base component, which owns a _further_ nested shadow root. A plain `.textContent()` read stops at the light-DOM boundary of whatever element it's called on; reading through a descendant custom element's own shadow tree needs an explicit walk (see `IdeaDetailPage.pointsAndVotes()`), which is the standard, documented pattern for this situation — not a Playwright limitation.

This is also, deliberately, the same category of work a real Salesforce Experience Cloud engagement involves: markup isn't a versioned public contract the way a REST API is, so a maintainable suite favours accessible roles and stable custom attributes over brittle generated class names, and documents _why_ each selector was chosen.

## API layer: real contract, mock transport by default

`SalesforceRestClient` (`src/api/clients/salesforce-rest.client.ts`) implements:

- **JWT Bearer authentication** (`src/api/auth/jwt-auth.provider.ts`) — the standard server-to-server OAuth2 flow for CI service accounts: sign a short-lived JWT assertion with a Connected App's private key, exchange it for an access token. No interactive login, no refresh-token rotation to manage.
- **Typed, `zod`-validated CRUD** against the `Account` sobject and read access to a custom `Idea` sobject, using the real `/services/data/vXX.X/sobjects/...` REST shape.
- **Salesforce's real error envelope** — `SalesforceApiError` carries the `status`, `errorCode` (e.g. `NOT_FOUND`, `REQUIRED_FIELD_MISSING`, `INVALID_SESSION_ID`) and `fields` Salesforce itself returns.

`USE_MOCK_SF_API=true` (the default, and what CI runs) points all of this at `src/mocks/salesforce-mock-server.ts` — a dependency-free Node `http` server, started by `globalSetup` before the test run and stopped by `globalTeardown` after. It implements the _same_ token-exchange, CRUD, auth-check and error-envelope contract as the real API, seeded with one realistic `Idea` record mirroring the one the UI suite drives.

Flip `USE_MOCK_SF_API=false` and provide `SF_LOGIN_URL` / `SF_CLIENT_ID` / `SF_USERNAME` / `SF_JWT_PRIVATE_KEY_PATH` (a Connected App configured for JWT Bearer flow, certificate uploaded, private key kept out of source control) and the identical test suite runs against a real sandbox — nothing in `tests/api/` changes.

### Why mock instead of, say, `nock`/`msw`

A hand-rolled HTTP server is the most literal reproduction of "a Salesforce org" available without one: real sockets, real HTTP semantics (status codes, headers, JSON bodies), zero request-interception "magic" that could hide a real client bug. It also has zero runtime dependencies, which matters more in a portfolio piece meant to be read end-to-end than in a large production suite.

## CI/CD

Two workflows (`.github/workflows/`):

- **`pr-checks.yml`** — on every PR: install, `npm run verify` (typecheck + lint + format check), then UI-smoke (`@smoke`-tagged specs, Chromium only) and the full API suite, in parallel jobs. Optimised for fast, cheap feedback on every push.
- **`nightly-regression.yml`** — scheduled (02:00 UTC) and manually dispatchable: the full UI suite across Chromium/Firefox/WebKit plus the full API suite, with the HTML report and JUnit XML uploaded as build artifacts either way.

Both upload `playwright-report/` and `test-results/junit.xml` on failure (and the nightly run always), so a red build comes with a trace/video/screenshot bundle attached, not just a log line.

## What a real engagement would add next

This is a foundation, not the finished platform a production Salesforce SaaS needs. The natural next steps, roughly in order:

1. **Real-org JWT setup docs** — a step-by-step Connected App walkthrough (this repo documents the client-side half; the admin-side Connected App configuration is org-specific).
2. **Data-driven / hybrid tests** — API-seeded seed data, UI verification, API-side cleanup (the pattern the CRUD spec demonstrates in miniature).
3. **Visual regression** on the Lightning components most prone to silent breakage across Salesforce releases.
4. **Cross-environment config** (`local` / `qa` / `staging` / `prod`) via `src/config/env.ts`'s existing zod-validated pattern — already structured to add without touching call sites.
5. **Accessibility assertions** (`@axe-core/playwright`) — the category-checkbox labelling gap this repo already documents is exactly the class of issue that catches.
