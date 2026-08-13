# Playwright in this codebase

Everything related to Playwright — dependency, runtime image, and every service that drives a browser.

## Dependency & runtime

- **Package**: `playwright` `^1.62.1` in `api/package.json` (dependency, not devDependency — it runs in production, not just tests).
- **Docker base image**: `api/Dockerfile` runs the app on `mcr.microsoft.com/playwright:v1.61.1-jammy` (not a plain Node image) so Chromium and its OS deps are preinstalled. `ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` stops `npm install` from re-downloading browsers that the base image already ships.
- Only Chromium is used (`chromium.launch(...)`) — no Firefox/WebKit usage anywhere in the codebase.
- All launches are `headless: true`.

## Core driver services

### `StealthBrowserService` (`src/integrations/crawler/services/stealth-browser.service.ts`)
Long-lived, shared Chromium instance used by the crawler. `NestJS` lifecycle hooks: launches the browser `onModuleInit`, closes it `onModuleDestroy`.
- `newStealthPage()` — opens a new context/page with stealth options applied.
- `closeContext()` — closes a context with a 10s timeout race so a hung close can't block the worker.
- Recycles the browser after `chromium_max_contexts_before_restart` contexts (from `PlatformConfigService`) to bound memory growth across hundreds of contexts per crawl run, but only when idle (no open contexts) so it never kills another job's live page.

### `PlaywrightDriverService` (`src/integrations/computer-use/services/playwright-driver.service.ts`)
Short-lived driver instantiated per run (`new PlaywrightDriverService()`, not injected) for the AI-controlled "computer use" / browser-agent flows. Owns one browser/context/page at a time.
- `launch(url, blockHandlingConfig)` — launches, navigates, waits out bot challenges.
- `executeAction(action)` — executes a single agent-issued action: `click`, `type`, `navigate`, `go_back`, `close_tab`, `scroll_up/down`, `wait`. Handles popup/new-tab tracking on click.
- `screenshot(forApi)` — full-viewport JPEG (API) or PNG screenshot for the agent's vision loop.

## Stealth configuration

`src/integrations/crawler/utils/stealth.utils.ts`
- `STEALTH_LAUNCH_ARGS`: `--disable-blink-features=AutomationControlled`, `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`.
- `STEALTH_CONTEXT_OPTIONS`: fixed desktop Chrome UA string, 1280×900 viewport, `Accept-Language`/`Accept` headers.
- `applyStealthInitScript()`: injects a script overriding `navigator.webdriver` to `undefined` before any page script runs.

Used by both `StealthBrowserService` and `PlaywrightDriverService`.

## Bot-block / challenge handling

`src/integrations/crawler/block-handling/block-handling.utils.ts`
- `trackDocumentResponses(page)` — records the HTTP status of the main-frame document response per page (via a `WeakMap`), since Playwright's `page.goto()` doesn't expose it directly after subsequent navigations.
- `classifyPageAccess(page, config)` → `'blocked' | 'challenge' | 'pending' | 'ok'`, based on:
  - hard HTTP statuses (`401`, `403`, `429`, `503`),
  - configurable rules matched against title/text/html/path/script-content/selector,
  - minimum "ready" body length.
- `waitForBotChallengeClearance(page, config, timeoutMs)` — polls `classifyPageAccess` until the page clears a challenge or the timeout elapses. Called after every navigation/click in both driver services.
- `buildBlockHandlingConfig()` — maps a `WebsiteTarget`'s persisted `block_rules` (Prisma) into the runtime `BlockHandlingConfig` shape.

## Crawler pipeline (non-AI scraping)

- `CrawlerService` (`src/integrations/crawler/services/crawler.service.ts`) — runs a `ScraperConfig` against a stealth page, orchestrating listing-page pagination, field extraction, and diagnostics capture.
- `FieldExtractionService` (`.../field-extraction.service.ts`) — extracts a field from a Playwright `Locator` per `FieldDef` (`text`, `href`, `src`, `background_image`, `regex`), each with an independent `2s` timeout so one bad field doesn't hang the whole item.
- `CrawlerDebugService` (`.../crawler-debug.service.ts`) — on a failed listing selector, dumps the top candidate CSS class selectors found on the page (by frequency) to logs to help diagnose broken scraper configs.

## AI-driven browser control ("computer use")

- `ComputerUseOrchestratorService` — drives `PlaywrightDriverService` in a loop with Claude (Anthropic SDK) to *generate* a scraper config by exploring a site and issuing actions/screenshots.
- `BrowserAgentOrchestratorService` — same driver, but for one-off "go find this data" tasks rather than config generation.
- Both feed page screenshots back to the model and translate its tool calls into `GenerationAction`s executed via `PlaywrightDriverService.executeAction()`.
- `ScraperConfigVerificationService` (`src/integrations/computer-use/services/scraper-config-verification.service.ts`) — replays a generated config against a real `Page`/`BrowserContext` to verify selectors actually resolve before accepting it, reusing `classifyPageAccess`/`waitForBotChallengeClearance` for access-barrier detection.
- System prompts (`generation-prompt.ts`, `browser-agent-prompt.ts`) explicitly tell the model it is controlling "a real browser (Playwright)".

## Diagnostics capture

`DiagnosticsCaptureService` (`src/integrations/diagnostics/services/diagnostics-capture.service.ts`)
- Wraps a crawl/verification run: opens a stealth page via `StealthBrowserService`, records console messages (capped at 500 entries), captures screenshots/HTML/HAR-style artifacts on failure, uploads them to GCS.
- Reads `playwright/package.json` at runtime to stamp `playwright_version` onto each diagnostics record for later debugging.

## Database

`prisma/schema.prisma:725` — `playwright_version String?` column on the diagnostics run model, populated from `DiagnosticsCaptureService` above.

## Deployment notes

- Because the runtime image is Playwright's own (`mcr.microsoft.com/playwright:v1.61.1-jammy`), Chromium deps are already present — no extra `apt-get install` needed for fonts/libs.
- Headless Chromium under Docker needs `--no-sandbox`/`--disable-dev-shm-usage` (already in `STEALTH_LAUNCH_ARGS`) since containers typically lack a properly configured user namespace / have a small `/dev/shm`.
- Memory: each `StealthBrowserService` Chromium process plus per-context pages can be significant under concurrent crawl workers — size the host/container accordingly (relevant when moving off Railway to a self-hosted box, e.g. Coolify).
