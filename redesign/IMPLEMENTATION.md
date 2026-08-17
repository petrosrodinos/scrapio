# Implementation directions: applying the `/redesign` UX to the real app

**Audience:** an AI coding agent implementing this redesign inside `app/` (React + TypeScript + HeroUI v3). `/redesign` is a static HTML/CSS/vanilla-JS **reference prototype only** — do not copy its markup, its CSS, or its JS into the real app. Its job is to communicate the target IA, copy, naming, and interaction pattern. The real implementation must be built with the app's existing stack (Tailwind, HeroUI v3, TanStack Query, React Hook Form + Zod, Zustand) and must follow `app/CLAUDE.md` precisely — that file's rules override anything implied by the prototype's raw HTML.

Read `app/CLAUDE.md` in full before starting. The two rules most likely to be violated while porting this redesign:
1. All enum/status/type display text goes in `config/constants/dropdowns/**`, never inline in a component. Several *existing* files already violate this (see [Known existing violations to fix](#known-existing-violations-to-fix-while-youre-in-this-code) below) — fix them as part of this work, don't propagate the pattern.
2. No new UI primitives without checking `app/src/components/ui/` first (`action-button-with-pending.tsx`, `confirmation-dialog.tsx`, `table-skeleton.tsx`, `detail-skeleton.tsx`, `form.tsx`, `toast.tsx`, `password-input.tsx`). Extend, don't duplicate.

Note: `app/CLAUDE.md` references `app/DESIGN.md` for the visual system — **that file does not currently exist in the repo.** Don't block on it; derive tokens from `app/src/index.css` (Tailwind v4 CSS-first config) and existing component usage instead. If you create visual tokens as part of this work, that's a reasonable place to also create `app/DESIGN.md`, but it's not required to complete this redesign.

---

## 1. What this redesign changes, in one paragraph

The real app currently exposes 6 separate, near-identical top-level concepts (Website Targets, Scrapers, Plain Scrape, Browser Agent, Generation Runs, Crawl Runs) with no guided entry point and inconsistent depth (Scraper requires Target → Scraper → Generation Run review → Version → Run; Plain Scrape/Browser Agent go straight from config → Run). The redesign: (a) gives every renamed concept a plain-language name with the original term kept as a small secondary label, (b) makes the existing `/workflows/new` "choose how to scrape" screen the prominent, upgraded entry point for the whole workflow, (c) folds Generation Run into a 3-step Scraper creation wizard as a "Teach the scraper" step instead of exposing it as its own top-level nav concept, (d) keeps all underlying entities/routes/mutations — **no backend changes, no data model changes, no functionality removed** — this is a presentation/IA/copy layer on top of what already exists, plus one small new UI addition (an in-context cost badge using the `ai_usage` data that's already captured but never shown).

---

## 2. Naming map — apply everywhere text is user-facing

| New name (primary label) | Original term (small secondary label, e.g. `text-2xs uppercase text-muted`) | Real code identifiers that stay unchanged |
|---|---|---|
| **Site** | Website Target | `WebsiteTarget` type, `website-targets` feature/route/API paths — do not rename these, only the display copy |
| **Scraper** | Scraper | unchanged (already the clearest term) |
| **Teach the scraper** *(a wizard step, not a nav concept)* | Generation Run | `ScraperGenerationRun` / `scraper-generation` feature — logic unchanged, only *where* it's surfaced changes |
| **Quick Scrape** | Plain Scrape | `plain-scrape` feature/route/API paths unchanged |
| **AI Browsing Agent** | Browser Agent | `browser-agent` feature/route/API paths unchanged |
| **Run** | Crawl Run (`WorkflowRun`) | `crawl-runs` feature/route/API paths unchanged |
| **Interface** | Generated UI | already the real tab label (`ExtractionDataView`) — no change needed, just keep the secondary label |

Rule for applying this: **rename only what a user reads** — page titles, nav labels, breadcrumbs, button text, empty-state copy, tooltips, card headers. Never rename TypeScript identifiers, route paths, API paths, DB fields, or feature folder names. Every place a new name appears standalone (nav item, page `<h1>`, card title), pair it with the original term as a small muted secondary line/badge — copy the visual pattern from `redesign/assets/css/components.css` `.name-tag`/`.name-tag__original` (reimplement as a small reusable `<span className="text-[11px] uppercase tracking-wide text-muted">{original}</span>` under the primary label, or promote to `components/ui/` if it recurs enough — check there first per CLAUDE.md).

---

## 3. Information architecture changes

### Navigation (`app/src/components/layout/sidebar-content.tsx`)

Current structure (verified in code):
```
Dashboard          → New Workflow → Targets, Plain Scrape, Browser Agent, Generation → Monitoring: Crawl Runs, Jobs, Diagnostics, Costs → Account → Admin
```

Target structure:
```
Dashboard
Start a scrape        (was "New Workflow", href unchanged: Routes.workflows.new)
— Build & manage —
Sites                  (was "Targets", href unchanged: Routes.websiteTargets.list)
Scrapers               (NEW top-level nav item — currently scrapers have no list route reachable outside a Target's tab; see §5.2)
Quick Scrapes          (was "Plain Scrape", href unchanged: Routes.plainScrape.list)
AI Browsing Agents     (was "Browser Agent", href unchanged: Routes.browserAgent.list)
— Activity —
Runs                   (was "Crawl Runs", href unchanged: Routes.crawlRuns.list)
Jobs, Diagnostics, Costs (unchanged)
— Account / Admin — (unchanged)
```

**Remove "Generation" as a standalone nav item.** Its list/detail routes (`Routes.generationRuns.*`) can stay live for direct linking (a Scraper's detail page still needs to link into a specific generation run's progress/review), just don't surface it in the primary sidebar — it's reached contextually from a Scraper's "Generate/Fix with AI" action, matching how `redesign/scrapers/detail.html` and `redesign/scrapers/generation-progress.html`/`generation-review.html` link to each other.

### Routes (`app/src/routes/routes.ts`)

No route paths need to change. Add nothing new except, if you choose to build the 3-step wizard as real routes rather than in-page steps (recommended — see §5.2), add under the existing `workflows` key, e.g.:
```ts
workflows: {
  new: "/workflows/new",
  newScraperStep1: "/workflows/new/scraper/site",
  newScraperStep2: "/workflows/new/scraper/basics",
  newScraperStep3: "/workflows/new/scraper/teach",
},
```
Exact path strings are your call — keep them under `workflows/new/scraper/*` so they read as one flow. Whatever you choose, add it to `Routes` first per CLAUDE.md §7 before referencing it anywhere.

### The "site is optional" rule

Only the **Scraper** creation path requires picking/creating a Site first. **Quick Scrape** and **AI Browsing Agent** creation flows must NOT be gated behind Site selection — they already don't require `website_target_id` in the data model (confirmed: `PlainScrapeConfig`/`BrowserAgentConfig` have no such field). Don't introduce one.

---

## 4. Design-system translation notes

The prototype's CSS is a rough visual reference, not a spec to copy verbatim. Translate concepts, not pixels:

| Prototype concept | Real app equivalent to use |
|---|---|
| `.chip--success/warning/danger/default` | HeroUI `Chip` with `color="success"/"warning"/"danger"/"default"` `variant="soft"` — exactly the pattern already used by `ScraperStatusChip`, `ScraperHealthChip`, `CrawlRunStatusChip`, `GenerationRunStatusChip`. Reuse those existing chip components; only their **label text** changes if it doesn't already read as expected (labels must come from `config/constants/dropdowns/**`, see §6). |
| `.card`, `.card__header`, `.card__pad` | Existing Tailwind utility classes already used in these pages (`rounded-xl border border-border bg-surface p-6`, etc. — copy the exact utility classes already in use in `crawl-run-detail-body.tsx` / `crawl-run-overview.tsx` for visual consistency with the rest of the app, don't invent a new card style) |
| `.choice-card` (decision screen) | New Tailwind-styled `<button>`/`<Link>` cards — see `workflows/new.tsx`'s existing `WorkflowCard` component, which already implements almost exactly this pattern (icon, title, description, bullet list, hover lift). Extend it, don't replace it with something new. |
| `.stepper` (3-step wizard) | New component — no existing equivalent. Build a small presentational stepper (props: `steps: {label, sublabel}[]`, `activeIndex: number`) and place it in `pages/admin/workflows/components/` (page-local, per CLAUDE.md placement rules) unless/until it's reused elsewhere. |
| `.disclosure` (Advanced settings) | Use HeroUI `Accordion` with a single item, or a simple controlled `<details>`-style component — check if a similar collapsible pattern already exists in `scraper-form.tsx`/`plain-scrape-form.tsx`/`browser-agent-form.tsx` before adding one. |
| `.replay`, `.replay-step` (session replay) | Already exists for real: `ComputerUseSessionReplay` (`app/src/components/ui/computer-use-session-replay.tsx`, referenced from `crawl-run-detail-body.tsx` and generation run detail). Reuse it as-is — do not rebuild. |
| Expand-to-modal preview panels | Already exists for real: `expand-preview-modal.tsx`, `extraction-json-preview.tsx`, `extraction-markdown-preview.tsx`, `generated-ui-frame.tsx`, `extraction-data-view.tsx` in `app/src/pages/admin/crawl-runs/components/`. These are recent/uncommitted additions per git status — reuse and, per the note in §7, fix the one known data-flow inconsistency in them while you're there. |
| `.cost-badge` | **New** — no real equivalent exists yet. `ai_usage` is captured on `WorkflowRun`/`ExtractionResult` but never rendered. Build a small `CostBadge` (props: amount, currency, optional call-count) and surface it: (1) on `runs/detail` header next to the status chip, (2) as a column on the Runs list table, (3) as a small "This month" summary widget on the Dashboard. This is additive — no existing UI to replace. |
| Sandboxed generated-UI iframe | Already exists for real: `generated-ui-frame.tsx` renders `iframe srcDoc` with `sandbox="allow-same-origin"`. No change needed beyond copy/label updates. |

---

## 5. Page-by-page mapping

Legend: **Rename-only** = copy/label changes on an existing page, no structural change. **Restructure** = existing page needs new sections/flow. **New** = no real equivalent exists yet.

### 5.1 Dashboard

| Prototype | Real page | Action |
|---|---|---|
| `redesign/index.html` | `app/src/pages/admin/dashboard/` (confirm exact file — `pages/dashboard/` per routing) | Restructure |

Add: a prominent "Start a scrape" primary CTA (→ `Routes.workflows.new`) as the unmistakable single primary action on the page (per CLAUDE.md's dashboard component patterns, don't compete with other primary buttons). Add the new cost-summary widget (§4). Everything else (recent runs, entity counts) is additive to whatever the dashboard already shows — check its current content first; don't remove existing dashboard functionality.

### 5.2 Sites (Website Targets)

| Prototype | Real page | Action |
|---|---|---|
| `redesign/sites/index.html` | `app/src/pages/admin/website-targets/index.tsx` | Rename-only ("Website Target" → "Site" in copy; keep all existing search/table/delete/create-modal behavior) |
| `redesign/sites/detail.html` | `app/src/pages/admin/website-targets/detail.tsx` | Rename-only — the real page's 2-tab structure (Target info / Scrapers, `?tab=` query param) already matches the redesign's tabs. Don't rebuild the tabs; just relabel "Target" tab as needed and update copy. |

Preserve exactly: search-by-name/URL, block rules editor (`block-rules-editor.tsx` — label/signal/source/pattern/regex/flags, empty-state copy "No extra rules — built-in defaults apply"), delete blocked when `_count.workflow_configs`/`_count.workflow_runs` > 0, "Recent crawl runs" panel, create-target → auto-navigate into Scrapers tab with `createScraper=true` onboarding chain (`Routes.websiteTargets.detail(id, {tab:"scrapers", createScraper:true})`) — **do not remove this chain**, it's the real mechanism the redesign's Scraper-wizard step 1 "+ Add a new site instead" should hook into.

### 5.3 Scrapers

| Prototype | Real page | Action |
|---|---|---|
| `redesign/scrapers/index.html` | **No direct real equivalent** — scrapers are currently only browsed via a Website Target's "Scrapers" tab (`useScrapers` hook already supports listing without a target filter per research, but no page renders it that way) | New page, reusing existing `useScrapers`/`useDeleteScrapers` hooks from `features/scrapers/hooks/use-scrapers.ts` |
| `redesign/scrapers/detail.html` | `app/src/pages/admin/scrapers/detail.tsx` | Rename-only + minor addition — preserve every documented control: inline Status select, Self-healing switch, Diagnostics mode select (all apply-instantly per current behavior — don't change to a "save" pattern), Version history + rollback + raw-JSON compare, Generation-runs panel (last 5, links to `Routes.generationRuns.detail`), embedded `LatestCrawlRun`/`RecentCrawlRuns`, "Generate with AI"/"Fix with AI" action (label swaps on `BROKEN` status — keep this), Run now, Delete (blocked with explanation if active runs exist) |

Add a new top-level route + nav item ("Scrapers") that renders a scrapers-list page using the existing `useScrapers()` hook with no `website_target_id` filter and a Site column linking to `Routes.websiteTargets.detail`. This is genuinely new UI, but zero new backend/hook work — the data layer already supports it.

### 5.4 Scraper creation wizard + Generation Run folding

| Prototype | Real page | Action |
|---|---|---|
| `redesign/scrapers/new-step1-site.html` | Currently: creating a scraper happens via a modal/inline form reached from a Target's Scrapers tab, or `ScraperForm` component | Restructure into step 1 of a new guided flow |
| `redesign/scrapers/new-step2-basics.html` | `ScraperForm` (name + `CrawlIntervalField` schedule) already has these exact fields | Restructure into step 2 — reuse `ScraperForm`'s field logic and `CrawlIntervalField`/`CrawlIntervalPresetOptions`, don't rebuild them |
| `redesign/scrapers/new-step3-teach.html` | `CreateGenerationRunForm` (prompt, output formats, output schema, max_steps) — currently opened as a modal from a Scraper's detail page | Restructure into step 3, reusing `CreateGenerationRunForm`'s fields/validation/mutation as-is, just re-hosted as a wizard step instead of a modal |
| `redesign/scrapers/generation-progress.html` | `app/src/pages/admin/generation-runs/detail.tsx` (RUNNING status) | Reuse as-is — this page already renders `ComputerUseSessionReplay` live. Just make sure it's reachable at the end of step 3, and that its "back" affordance returns into the wizard/scraper context sensibly. |
| `redesign/scrapers/generation-review.html` | `app/src/pages/admin/generation-runs/detail.tsx` (AWAITING_REVIEW status) | Reuse as-is — Approve/Reject/Edit-staged-config already exist. No rebuild needed, just confirm copy/labels match the naming map and that Approve navigates to the resulting `scrapers/detail.html`-equivalent page. |

**This is the biggest IA change in the whole redesign.** Today: New Workflow → "Generate reusable scraper" card → straight to `Routes.generationRuns.list?create=1` (no site-first step, no named 3-step structure). Target: New Workflow → "Keep watch on a site over time" card → step 1 (pick/create site, reusing the Target-creation form) → step 2 (name + schedule, reusing `ScraperForm` fields) → step 3 "Teach the scraper" (reusing `CreateGenerationRunForm` fields, submitting creates the Scraper record *and* kicks off the Generation Run in one submit, same as today's combined behavior) → generation run detail (progress → awaiting review → approve) → lands on the new Scraper's detail page.

Confirm with the actual mutation hooks (`useCreateScraper`, generation-run create mutation in `features/scraper-generation/hooks/`) whether Scraper-record-creation and Generation-Run-creation are already one API call or two sequential ones today, and preserve whichever it is — this doc is not asking you to change the API contract, only the UI sequencing/framing around it.

### 5.5 Quick Scrape (Plain Scrape)

| Prototype | Real page | Action |
|---|---|---|
| `redesign/quick-scrape/index.html` | `app/src/pages/admin/plain-scrape/index.tsx` | Rename-only |
| `redesign/quick-scrape/new.html` | `plain-scrape-form.tsx` | Rename-only + progressive disclosure — wrap `extraction_scope`, `output_schema`, and schedule fields in a collapsed "Advanced settings" section; keep `name`/`urls`/`output_formats` visible by default. Preserve the real behavior that leaving both output formats unchecked is valid ("raw HTML only") — add the inline note from the redesign, don't add new validation that blocks it. |
| `redesign/quick-scrape/detail.html` | `app/src/pages/admin/plain-scrape/detail.tsx` | Rename-only — keep `LatestCrawlRun`/`RecentCrawlRuns` embeds as-is |

### 5.6 AI Browsing Agent (Browser Agent)

| Prototype | Real page | Action |
|---|---|---|
| `redesign/ai-agent/index.html` | `app/src/pages/admin/browser-agent/index.tsx` | Rename-only |
| `redesign/ai-agent/new.html` | `browser-agent-form.tsx` | Rename-only + progressive disclosure (max_steps, capture_api, schedule → "Advanced settings") **+ one real behavior change**: today submit is disabled when zero output formats are selected (`noOutputFormatSelected` check) — per the approved redesign plan, **remove that submit-blocking validation** and instead show the inline note "No format selected — you'll get the agent's raw findings only," matching Quick Scrape's already-valid "raw only" pattern. This is a deliberate, small, real behavior change — call it out in your PR/commit description since it changes validation logic, not just copy. |
| `redesign/ai-agent/detail.html` | `app/src/pages/admin/browser-agent/detail.tsx` | Rename-only |

### 5.7 Runs (Crawl Runs)

| Prototype | Real page | Action |
|---|---|---|
| `redesign/runs/index.html` | `app/src/pages/admin/crawl-runs/index.tsx` | Rename-only + add the new cost column (§4) |
| `redesign/runs/progress.html` | `app/src/pages/admin/crawl-runs/detail.tsx` (QUEUED/RUNNING states) | Rename-only — this state already exists (2s polling, status banners) |
| `redesign/runs/detail.html` | `app/src/pages/admin/crawl-runs/detail.tsx` + `crawl-run-detail-body.tsx` (SUCCESS/other terminal states) | Rename-only + add the cost badge near the status chip. **Do not change the accordion order or conditionality** — verified real order is: `ExtractionDataView` (JSON/Interface/Markdown) → `CrawlRunOverview` → Execution traces (scraper only) → Scraped pages w/ nested Cleaned content + Raw HTML (plain scrape only) → Visited URLs (browser agent only) → Captured API traffic + OpenAPI download (browser agent + `capture_api` only) → Linked jobs (always) → Session replay (browser agent only). The redesign's `runs/detail.html` mirrors this exact order for its Scraper-type example (Execution traces + Linked jobs only, since those are the only two sections that apply to `WorkflowTypes.SCRAPER`) — don't read the prototype's *absence* of the other four sections as "remove them from the real page," it's just that a Scraper-type run doesn't trigger their conditions. |

### 5.8 Settings

| Prototype | Real page | Action |
|---|---|---|
| `redesign/settings/crawler-config.html` | `app/src/pages/admin/crawler-config/index.tsx` | Rename-only — add a one-line "platform-wide, not per-site" clarifying caption at the top; no structural change |

### 5.9 States gallery

`redesign/states-gallery.html` has no single real-page equivalent — it's a design reference, not a page to port. Use it only as a checklist: confirm every status/enum value it depicts (all 5 `ScraperStatus`, all 6 `ScraperHealth`, all `GenerationRunStatus`, all `CrawlRunStatus`, partial-success per-format breakdown, empty states, validation errors) already renders correctly somewhere in the real app once your changes land. Don't build a real "states gallery" page in the product.

---

## 6. Dropdown/label file changes required (`config/constants/dropdowns/**`)

Per CLAUDE.md, every renamed label that's tied to an enum must be updated at its canonical source, not patched in components. Concretely:

- `config/constants/dropdowns/scrapers/scraper-status-form.options.ts` / `-filter.options.ts` — labels stay as-is (Active/Inactive/Deprecated/Testing/Broken — these aren't part of the rename map).
- `config/constants/dropdowns/scrapers/scraper-health-filter.options.ts`, `diagnostics-mode-*.options.ts`, `generation-trigger-filter.options.ts`, `generation-run-status-filter.options.ts`, `output-format-form.options.ts` — audit copy for plain-language clarity per the redesign's tone, but no renames are mapped for these enums specifically; keep technical accuracy.
- **Workflow type labels** (`WorkflowTypes.SCRAPER/PLAIN_SCRAPE/BROWSER_AGENT` → currently "Reusable scraper"/"Plain scrape"/"Browser agent"): update to "Scraper"/"Quick Scrape"/"AI Browsing Agent". These labels currently live **inline** in `app/src/pages/admin/crawl-runs/components/workflow-type-chip.tsx` as a local `Record<WorkflowType, string>` — this is an existing CLAUDE.md violation (see §7). Fix it: create `config/constants/dropdowns/crawl-runs/workflow-type-form.options.ts` (new domain folder `crawl-runs`, or reuse `scrapers` if that reads better — your call, but keep it consistent with how `crawl-runs` interfaces are organized) exporting `WorkflowTypeFormOptions: {id, label}[]` + `getWorkflowTypeLabel()`, then have `WorkflowTypeChip` and `workflows/new.tsx`'s `workflowOptions` both import from it — this also fixes the current duplication between those two files (today `workflow-type-chip.tsx` and `workflows/new.tsx` each hardcode their own overlapping label sets).
- `workflows/new.tsx` card copy: update `title`/`description`/`bullets` for all three `workflowOptions` entries to match the redesign's plain-language "what/best-for" framing (see `redesign/start.html` for the exact target copy: "Keep watch on a site over time" / "Get data from a list of pages right now" / "Let AI explore a site for you"). These are local to the page (not enum-driven), so editing them inline in `workflows/new.tsx` is correct per CLAUDE.md — only enum-backed vocabulary needs to move to `dropdowns/`.

---

## 7. Known existing violations to fix while you're in this code

These aren't caused by the redesign, but you'll be touching these exact files anyway — fix them per CLAUDE.md rather than leaving them:

1. `app/src/pages/admin/crawl-runs/components/workflow-type-chip.tsx` defines `workflowTypeLabel: Record<WorkflowType, string>` inline — CLAUDE.md explicitly calls this pattern out as wrong. Move to a dropdown options file (see §6) and consume via `getDropdownOptionLabel()`.
2. In `crawl-run-detail-body.tsx`, `ExtractionMarkdownPreview` is rendered both standalone (with a `markdown` prop) AND `ExtractionDataView` also declares a `markdown` prop but the current call site doesn't appear to pass it consistently — verify which component should own the Markdown tab and remove the redundant render path. Confirm current behavior first (this may already be fixed since the branch is actively changing); if still present, resolve by making `ExtractionDataView` the single owner of the JSON/Interface/Markdown tab switcher (matching `redesign/runs/detail.html`'s single-tab-group pattern) and removing the standalone `ExtractionMarkdownPreview` render.

---

## 8. What NOT to change

- No API/DTO/Prisma schema changes. Every field referenced in this doc already exists.
- No removal of any action, field, or panel documented above, even ones the redesign prototype didn't visually emphasize (e.g. "Compare versions" raw JSON diff, `diagnostics_mode`, execution traces, diagnostics package links, job logs, OpenAPI spec download) — progressive disclosure means *collapsed by default*, not removed.
- Don't rename TypeScript types, enum values, route path strings, or API path strings — only user-facing copy.
- Don't touch `/redesign` itself as part of this work — it's a frozen reference; if IA questions come up, resolve them by re-reading the relevant `redesign/*.html` file and this document, not by editing the prototype.

---

## 9. Suggested implementation order

1. Dropdown/label fixes (§6, §7) — small, isolated, unblocks everything else.
2. Nav rename (`sidebar-content.tsx`) — cheap, makes the new IA visible immediately for manual testing.
3. Rename-only pages (Sites, Quick Scrape, AI Browsing Agent, Runs, Settings, Dashboard copy) — low risk, mostly copy edits + progressive-disclosure wrapping.
4. New Scrapers list page (§5.3) — additive, reuses existing hooks.
5. `workflows/new.tsx` copy/card updates (§6).
6. AI Browsing Agent's zero-output-format validation change (§5.6) — flag as a real behavior change.
7. Cost badge component + surfacing on Runs list/detail/Dashboard (§4) — net-new, self-contained.
8. The 3-step Scraper wizard restructure (§5.4) — largest, most structurally involved change; do last once everything it depends on (Site create flow, `ScraperForm` fields, `CreateGenerationRunForm` fields, generation-run detail page) has already been verified working under the new naming.

## 10. Verification

- `npm run build` / `tsc` clean in `app/`.
- Manually click through, per page listed in §5, the golden path: Dashboard → Start a scrape → each of the 3 method cards → configure → run → results, plus the Sites list/detail and Scrapers list/detail.
- Confirm every HeroUI v3 Modal/Table/Select nesting rule in CLAUDE.md still holds for any component you touch.
- Confirm no `"Loading..."` text was introduced — Skeleton only, per CLAUDE.md.
- Confirm deletes still route through `ConfirmationDialog`.
- Re-check the naming map (§2) against final copy — grep for the retired terms ("Website Target" as a page title, "Plain Scrape" as a page title, "Browser Agent" as a page title, "Generation Run" as a nav label) to make sure only intentional occurrences (secondary labels, code identifiers) remain.
