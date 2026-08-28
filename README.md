# Salesforce Experience Cloud QA Framework

An open-source Playwright framework for testing a Salesforce-based SaaS platform: **UI** (Salesforce Experience Cloud / Lightning), **API** (Salesforce REST API, JWT Bearer auth), and **GitHub Actions CI/CD** — built from scratch as a code sample, runnable by anyone with zero Salesforce credentials.

> **TL;DR**: `npm ci && npx playwright install && npm test` runs a real UI suite against Salesforce's own public [IdeaExchange](https://ideas.salesforce.com) (a genuine Experience Cloud / Lightning site, no login required) and a real API suite against a Salesforce-REST-API-shaped mock server that starts and stops automatically. No secrets, no sandbox, no setup beyond `npm install`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full reasoning behind every major decision — this README is the "how to run it," that document is the "why it's built this way."

## Quickstart

```bash
git clone git@github.com:Vadzim-Asipovich/salesforce-experience-cloud-qa-framework.git
cd salesforce-experience-cloud-qa-framework
cp .env.example .env
npm ci
npx playwright install --with-deps chromium   # add firefox webkit for the full matrix
npm run test:ui    # UI with chrome
npm run test:api    # API tests
```

No Salesforce org, no credentials, no VPN. It just runs.

## What's actually being tested

| Layer   | Target                                                                                                                     | Auth                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **UI**  | [ideas.salesforce.com](https://ideas.salesforce.com) — Salesforce's own public Experience Cloud (Aura/Lightning) community | None (guest user) — verified live, real SLDS/Aura DOM           |
| **API** | Salesforce REST API contract (`/services/data/vXX.X/sobjects/...`, OAuth2 JWT Bearer)                                      | Mock server by default; flip one env var to point at a real org |

Why a real public Salesforce site instead of a private fixture, and a mock instead of a real org by default — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#ui-target-why-ideassalesforcecom).

## Scripts

| Command                                 | What it does                                       |
| --------------------------------------- | -------------------------------------------------- |
| `npm test`                              | UI (Chromium) + API, everything                    |
| `npm run test:ui`                       | UI suite only (Chromium)                           |
| `npm run test:ui:smoke`                 | Just `@smoke`-tagged UI specs — what PR checks run |
| `npm run test:ui:headed`                | UI suite with a visible browser window             |
| `npm run test:api`                      | API suite only, against the mock server            |
| `npm run test:debug`                    | Playwright's step-through debugger                 |
| `npm run report`                        | Open the last HTML report                          |
| `npm run codegen`                       | Playwright's codegen, pre-pointed at the UI target |
| `npm run typecheck` / `lint` / `format` | Individual quality gates                           |
| `npm run verify`                        | All three gates — what CI runs before any test     |

Run the full cross-browser matrix (Chromium/Firefox/WebKit) with `npx playwright test` after `npx playwright install --with-deps` (no browser flags) — the default `npm test` sticks to Chromium for speed; the nightly CI workflow runs all three.

## Project layout

```
src/
  config/env.ts            zod-validated environment config, one source of truth
  config/environments.ts   named local/qa/staging/prod profiles (TEST_ENV)
  ui/
    pages/                 Page Object Model (HomePage, IdeasListPage, IdeaDetailPage)
    components/            Reusable pieces composed by pages (NavBar, IdeaCard)
    fixtures/               `test.extend` wiring page objects into specs
    utils/                  shadow-DOM / cookie-banner helpers
  api/
    clients/                SalesforceRestClient — typed, zod-validated, schema-first
    schemas/                zod schemas mirroring real Salesforce sobject shapes
    auth/                   JWT Bearer flow (real-org and mock paths, same code)
    fixtures/                `test.extend` wiring an authenticated client into specs
  mocks/                    Dependency-free Salesforce REST API mock (+ global setup/teardown)
  utils/                    Secret-masking logger, test-data builders
tests/
  ui/                       5 specs — navigation, search input, filter/sort, idea detail, guest gating
  api/                      3 specs — Account CRUD, Idea schema contract, error handling & security
docs/ARCHITECTURE.md        The full design rationale
.github/workflows/          pr-checks.yml (fast, every PR) + nightly-regression.yml (full matrix, scheduled)
```

## Environment variables

See [.env.example](.env.example) for the full, commented list.

- `TEST_ENV` — `local` (default) `| qa | staging | prod`. Selects a profile from [src/config/environments.ts](src/config/environments.ts) that sets `UI_BASE_URL`, `SF_LOGIN_URL` and `USE_MOCK_SF_API` in one word: `TEST_ENV=qa npm run test:ui`. `qa`/`staging` carry placeholder domains — point them at a real Experience Cloud site (and a Connected App) to use them.
- `UI_BASE_URL` — the Salesforce Experience Cloud site under test. Leave unset to take the `TEST_ENV` profile's value; set it to pin a value regardless of profile. Any non-default site's page-object selectors will need re-verification (see the architecture doc on why Lightning markup isn't a versioned contract).
- `USE_MOCK_SF_API` — `true` runs the API suite against the bundled mock; `false` points `SalesforceRestClient` at a real org via `SF_LOGIN_URL` / `SF_CLIENT_ID` / `SF_USERNAME` / `SF_JWT_PRIVATE_KEY_PATH` (a Connected App configured for JWT Bearer flow). Also profile-driven. Nothing in `tests/api/` changes either way.

**Precedence**: an explicit environment variable wins; otherwise the `TEST_ENV` profile's value; otherwise the schema default. `src/config/env.ts` validates all of it with `zod` at process start — a missing or malformed variable fails immediately with a readable message, not a confusing test failure three layers down.

## CI/CD

Two GitHub Actions workflows:

- **`pr-checks.yml`** — every PR and push to `main`: typecheck + lint + format, then UI-smoke (Chromium) and the full API suite in parallel. Fast, cheap, blocks merges on quality gates.
- **`nightly-regression.yml`** — scheduled (02:00 UTC) and manually dispatchable: the full UI suite across Chromium/Firefox/WebKit plus the full API suite. HTML report and JUnit XML uploaded as artifacts either way.

## Extending this to a real engagement

This repo is a foundation built to demonstrate architecture, not the finished platform a production Salesforce SaaS needs — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#what-a-real-engagement-would-add-next) lists the concrete next steps (real-org JWT setup, hybrid data-driven tests, visual regression, accessibility checks) in the order they'd typically get built.

## License

[MIT](LICENSE)
