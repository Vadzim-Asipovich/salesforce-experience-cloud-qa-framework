Dear Hiring Team,

Thank you for the opportunity to work through this assignment for Singletrack. Please find attached the Playwright framework built for this test task: **[repo link — fill in once pushed]**.

The brief asked for an open-source Playwright framework covering UI, API, and GitHub Actions CI/CD for a Salesforce-based SaaS platform, built from scratch. Rather than a toy example, I approached it as I would a production automation platform's first commit — the kind that a team has to keep extending for years, not a one-off script.

**The submitted code sample demonstrates:**

- A layered TypeScript + Playwright Test architecture, cleanly separating page objects, reusable UI components, API clients, schemas, and fixtures
- Real UI automation against [ideas.salesforce.com](https://ideas.salesforce.com) — Salesforce's own public Experience Cloud (Aura/Lightning) community, chosen specifically because it's genuine Lightning/SLDS markup, guest-accessible (no credentials needed to run the suite), and Salesforce's own property rather than a third party's site
- Every UI selector verified against the live DOM rather than guessed — including two non-obvious findings documented in the code: the "Ideas" nav tab actually routes to `/s/search`, and the points/votes counters live inside a Lightning base component's own nested shadow root, which needs an explicit walk to read
- A typed, `zod`-validated Salesforce REST API client implementing the real JWT Bearer auth flow, the real `/services/data/vXX.X/sobjects/...` contract, and Salesforce's actual `[{message, errorCode}]` error envelope
- A dependency-free mock Salesforce API server that speaks that same contract, so the entire suite — UI and API — runs green from a clean clone with zero secrets and zero Salesforce org; flipping one environment variable points the same client code at a real sandbox without touching a single test
- GitHub Actions CI: fast typecheck/lint/format gates and a UI-smoke + API job on every PR, a full cross-browser (Chromium/Firefox/WebKit) nightly regression, with HTML reports and JUnit XML retained as build artifacts
- Secret-masking logging, so an access token can never leak into a log line even by accident

`docs/ARCHITECTURE.md` in the repo walks through the reasoning behind each of these decisions in more depth, including the trade-offs I'd revisit first on a real engagement (real-org JWT setup docs, data-driven hybrid tests, visual regression, multi-environment config, accessibility checks) — I treated the assignment as a chance to show how I make those calls, not just what the final tree looks like.

**Why I believe I'm well positioned to help execute this efficiently:**

**Why I believe I'm well positioned to help execute this efficiently:**

I bring 8+ years in QA and 5+ years building test automation frameworks in TypeScript, JavaScript, and Playwright. Most recently at Godel Technologies, I led the full migration of a legacy C#/Selenium framework to Playwright/TypeScript for a FinTech client, architecting the new suite and validating hundreds of REST API tests against Swagger/OpenAPI contracts while cutting execution time by more than 50%. As part of that same engagement, I designed and executed automated UI and API tests validating bi-directional data synchronization and API response payloads between the platform and Salesforce CRM — so the JWT auth flow and `/sobjects` contract handling in this sample build on integration work I've actually shipped, not just read about. At Tango, a live-streaming platform with 400M+ downloads, I built E2E UI and API coverage holding 95%+ stability under high load across 10+ production release trains without delay. At ICE Mortgage Technology I worked across a Java/Kafka microservice backend, pairing API automation (Java/JUnit/RestAssured) with UI automation in Playwright, and drove a 20% reduction in requirement-related defects and 25% fewer production issues through tighter requirements-to-test traceability. I've also defined an automation strategy from a blank slate at Kyriba and led QA — including GraphQL API testing and cross-browser automation — at Amasty.

I'd be glad to walk the team through any of the architectural decisions above, discuss trade-offs, or talk through how this foundation would extend to Singletrack's actual Salesforce org, CI environment, and reporting needs.

Kind regards,
Vadzim Asipovich
