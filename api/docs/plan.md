# Extend Scraping & Scraper Generation Architecture

We need to redesign and extend the existing scraping and scraper-generation functionality so that the platform supports multiple independent scraping/extraction workflows.

Do not try to preserve the current Prisma schema if it makes the architecture unnecessarily complicated. The application is still in development, existing data can be deleted, and database migrations do not need to maintain backward compatibility. You may redesign the relevant Prisma models, relationships, enums, and execution architecture from scratch if that results in a cleaner and more scalable implementation.

A major requirement across these workflows is **schema-driven structured extraction**.

The application must allow users to define the exact shape and data types of the normalized data they expect to receive. The backend should convert the application's schema representation into the appropriate structured-output/JSON Schema format required by the AI model.

---

# Shared Concept: App-Defined Output Schema

The scraping system needs a reusable concept representing the **expected structured output** of an extraction.

Users should be able to define an interface-like structure through the application.

For example, conceptually:

```json
{
  "contains_ai_agent": "boolean",
  "company_name": "string",
  "emails": "string[]",
  "employee_count": "number",
  "pricing_available": "boolean",
  "some_complex_data": "regex-example"
}
```

This is an illustrative application-level representation, not necessarily the exact API format.

The application should support common types such as:

```text
string
number
integer
boolean
string[]
number[]
boolean[]
object
object[]
enum
nullable values
nested objects
nested arrays
```

It should also be extensible enough to support validation constraints such as:

```text
regex / pattern
enum values
minimum / maximum
minLength / maxLength
optional / required
descriptions
nested schemas
array item schemas
```

For example, a more complex schema could conceptually describe:

```json
{
  "company": {
    "name": "string",
    "has_ai_product": "boolean",
    "employees": "number"
  },
  "contacts": [
    {
      "name": "string",
      "email": "email",
      "role": "string"
    }
  ],
  "technologies": "string[]",
  "confidence": "number"
}
```

The important requirement is that the application owns a clear schema representation and can translate it into the structured-output format required by the AI provider.

Do not hardcode extraction around specific fields such as `questions`, `emails`, `company`, etc.

The schema is completely dynamic and user-defined.

---

# Shared Concept: Output Format (Structured JSON, Markdown, or Both)

Not every extraction should be forced into a rigid schema. Users must be able to choose, per saved configuration or per run, which **output format(s)** the extraction produces:

```text
STRUCTURED_JSON
    → normalized data validated against an App-Defined Output Schema

MARKDOWN
    → a clean, readable Markdown document distilled from the collected source data

STRUCTURED_JSON + MARKDOWN (both, together)
    → both artifacts are produced from the same run
```

These are **not mutually exclusive**. A user may select one or the other, or both at once, for any of the three workflows. Model this as a non-empty set (e.g. `outputFormats: ("STRUCTURED_JSON" | "MARKDOWN")[]`) rather than a single enum value, so "both" is a natural selection rather than a special case bolted on afterward.

`STRUCTURED_JSON` follows the App-Defined Output Schema concept above: the AI must return data conforming exactly to the requested schema, and the result is schema-validated.

`MARKDOWN` has no schema contract. Instead, the AI (or a deterministic HTML → Markdown conversion step, where appropriate) normalizes the collected source data into a well-formed Markdown document — headings, lists, tables, links, etc. — suitable for direct display, downstream RAG ingestion, or human reading. This is still a **normalized, AI/processing-produced artifact**, distinct from the raw HTML, even though it is not validated against a JSON Schema.

**When both formats are requested together**, the Markdown output should not simply be a second, redundant rendering of the same raw page content. It should behave as a **human-readable summary of the (often more complex) structured data** — e.g. a nested `object[]` of contacts turned into a bulleted "Contacts" section, a `confidence` score turned into a sentence, etc. Practically, this means the pipeline should be able to feed the already-produced structured JSON result (in addition to, or instead of, the raw source data) into the Markdown normalization step when both are requested — see the pipeline ordering below.

**What guides Markdown generation.** Unlike `STRUCTURED_JSON`, which is always driven by the output schema, `MARKDOWN` normalization benefits from *some* guiding context so it knows what to emphasize rather than dumping the whole page. Where such context already exists for a workflow, reuse it instead of inventing a separate "markdown instructions" field:

- **Reusable scrapers** already capture a free-text **scraper-generation prompt/instructions** (see Section 1). When `MARKDOWN` is selected for a reusable scraper, generate the Markdown using that same prompt as guidance for what to focus on and include — the prompt describes what the user actually cares about on the site, which is exactly the framing a summary needs.
- **Dynamic browser agent runs** and **plain URL scraping** have no equivalent free-text prompt. There, Markdown normalization is guided by the output schema when `STRUCTURED_JSON` is also requested (summarize *that* data), and otherwise falls back to a general, content-driven normalization of the collected pages.

This choice is not exclusive to one workflow — it applies uniformly to reusable scrapers, dynamic browser agent runs, and plain URL scraping. Each saved configuration/run should record which output format(s) it was executed with, alongside (when applicable) the schema used.

Design this as a single `outputFormats` concept (a set, not a single enum) rather than introducing a parallel set of models or endpoints per format combination.

---

# Structured Extraction Pipeline

Where `STRUCTURED_JSON` output is requested, the conceptual extraction pipeline should be:

```text
App-Defined Output Schema
        ↓
Scraping / Browser / Extraction
        ↓
Collected Source Data
        ↓
AI Structured Extraction
        ↓
Schema Validation
        ↓
Normalized JSON Result
```

Where `MARKDOWN` output is requested on its own, the pipeline branches after the raw data is collected:

```text
Scraping / Browser / Extraction
        ↓
Collected Source Data
        ↓
AI / Conversion Markdown Normalization (guided by scraper prompt, when available)
        ↓
Normalized Markdown Result
```

Where **both** are requested, run `STRUCTURED_JSON` extraction first, then generate the Markdown as a summary informed by that result:

```text
Scraping / Browser / Extraction
        ↓
Collected Source Data
        ↓
AI Structured Extraction → Schema Validation → Normalized JSON Result
        ↓
AI Markdown Normalization (summarizes the Normalized JSON Result,
                            guided by scraper prompt, when available)
        ↓
Normalized Markdown Result
```

Both results are still stored as distinct artifacts of the same run — producing both must not require running the collection/scraping step twice.

The AI must be instructed to generate output matching the requested schema (for `STRUCTURED_JSON`) or well-formed Markdown following the collected content, and the structured result when available, (for `MARKDOWN`).

The generated result must then be validated server-side before being considered successfully normalized.

Do not simply trust that because the AI returned JSON it matches the schema.

The system should detect:

- missing required fields
- incorrect primitive types
- invalid nested structures
- invalid arrays
- invalid enum values
- regex/pattern violations
- malformed JSON
- other schema validation failures

For `MARKDOWN` output, "validation" is naturally lighter-weight (e.g. non-empty content, well-formed Markdown), but the same separation of concerns applies: normalization happens, then the result is checked before being considered successful.

If the project's AI SDK/model supports native structured outputs, use that capability where appropriate for `STRUCTURED_JSON`.

The implementation should also clearly distinguish between:

```text
raw scraped/browser data
```

and:

```text
AI-normalized output (structured JSON and/or markdown)
```

These are different artifacts and should not overwrite each other — including the JSON result and the Markdown result relative to one another, when both are produced by the same run.

---

# 1. Reusable Generated Scrapers

Currently, scraper generation relies primarily on Computer Use to inspect a website and determine how the scraper should operate.

Extend this so users can provide their own **scraper-generation prompt/instructions**.

For example:

> Navigate to the properties page, iterate through every listing, open each property, extract the relevant information, and continue through pagination until no additional pages exist.

The system should use these instructions to generate a fixed/reusable scraper configuration or sequence of scraper steps.

Once generated, the scraper should be saved and reusable without requiring Computer Use to rediscover the process every execution.

## Output Format & Schema

A reusable scraper must support one or both configured **output formats**: `STRUCTURED_JSON`, backed by a **user-defined output schema** describing the normalized data the scraper is expected to produce, and/or `MARKDOWN`, producing a normalized Markdown document from the collected pages.

For example, a `STRUCTURED_JSON`-only configuration:

```json
{
  "outputFormats": ["STRUCTURED_JSON"],
  "outputSchema": {
    "title": "string",
    "price": "number",
    "location": "string",
    "property_url": "string",
    "agent": {
      "name": "string",
      "email": "string"
    },
    "features": "string[]"
  }
}
```

A `MARKDOWN`-only configuration, with no schema required:

```json
{
  "outputFormats": ["MARKDOWN"]
}
```

Or both together — the scraper still needs an `outputSchema` for the `STRUCTURED_JSON` half, but nothing extra for `MARKDOWN`:

```json
{
  "outputFormats": ["STRUCTURED_JSON", "MARKDOWN"],
  "outputSchema": {
    "title": "string",
    "price": "number",
    "location": "string",
    "property_url": "string",
    "agent": {
      "name": "string",
      "email": "string"
    },
    "features": "string[]"
  }
}
```

### Markdown generation is driven by the scraper's generation prompt

A reusable scraper already carries the free-text **scraper-generation prompt/instructions** used to build it (e.g. *"Navigate to the properties page, iterate through every listing... extract the relevant information..."*, see above). When `MARKDOWN` is one of the requested output formats, that same prompt should be passed to the Markdown normalization step as guidance for what the document should focus on and include — it already describes what the user cares about on the site, so it doubles as the framing for the summary. Do not treat Markdown generation for a reusable scraper as a generic, prompt-agnostic HTML-to-text dump.

When both formats are selected, the Markdown step should be given the scraper prompt **and** the validated `STRUCTURED_JSON` result, and should produce a readable summary of that structured data (see the pipeline ordering in "Structured Extraction Pipeline" above) rather than re-deriving a second, independent document straight from the raw pages.

The scraper execution should first collect the relevant raw information.

The collected information should then be passed through the structured extraction layer so the final normalized result conforms to the scraper's configured output schema (for `STRUCTURED_JSON`) and/or is rendered as a clean, prompt-guided Markdown document (for `MARKDOWN`).

This is especially important because scraper extraction and final normalization should remain separate concerns.

Conceptually:

```text
Reusable Scraper (+ Generation Prompt)
      ↓
Raw Extraction
      ↓
Configured Output Formats (+ Output Schema, if STRUCTURED_JSON is selected)
      ↓
AI Structured Extraction (schema-driven)  ─┐
      ↓ (result feeds into Markdown, when both selected)
AI Markdown Normalization (prompt-driven) ─┘
      ↓
Validated Structured Result and/or Normalized Markdown Result
```

The output formats (and, when applicable, the output schema) should preferably belong to the reusable scraper configuration so executions consistently produce the same kind of result(s).

If architecture benefits from schema versioning, design for it.

Changing a scraper's output schema should not make historical run results ambiguous.

---

# 2. Dynamic Browser / Computer Vision Extraction Runs

We need a separate execution mode for **one-off browser-based AI tasks**.

This mode must NOT require:

- a fixed scraper configuration
- a scraper-generation run
- predefined navigation steps

Instead, the user provides:

- website / starting URL
- **required output format(s)** — `STRUCTURED_JSON`, `MARKDOWN`, or both
- **output schema**, required when `STRUCTURED_JSON` is one of the requested formats

The system launches the browser and uses Computer Use / computer vision together with Playwright to dynamically navigate the website and complete the task.

Example, requesting structured JSON only:

```json
{
  "url": "https://example.com",
  "outputFormats": ["STRUCTURED_JSON"],
  "outputSchema": {
    "contains_ai_agent": "boolean",
    "emails": "string[]",
    "products": [
      {
        "name": "string",
        "description": "string"
      }
    ]
  }
}
```

Requesting a Markdown document instead, with no schema:

```json
{
  "url": "https://example.com",
  "outputFormats": ["MARKDOWN"]
}
```

Or requesting both from the same run:

```json
{
  "url": "https://example.com",
  "outputFormats": ["STRUCTURED_JSON", "MARKDOWN"],
  "outputSchema": {
    "contains_ai_agent": "boolean",
    "emails": "string[]",
    "products": [
      {
        "name": "string",
        "description": "string"
      }
    ]
  }
}
```

This workflow has no free-text scraper-generation prompt to guide Markdown normalization. When both formats are requested, guide the Markdown step with the validated `STRUCTURED_JSON` result, same as elsewhere. When `MARKDOWN` is requested alone (no schema), the browser agent's exploration has nothing more specific than the URL to go on, so it should default to a general "research and document what this site offers" task rather than requiring an extra field that isn't part of this mode's contract today.

The browser agent should:

1. Open the provided website.
2. Inspect the website using browser state and computer vision.
3. Navigate to other pages when necessary.
4. Interact with the website when required.
5. Gather evidence relevant to the requested output schema/format(s).
6. Determine when sufficient information has been collected.
7. Pass the gathered information into the structured extraction layer.
8. If `STRUCTURED_JSON` is requested, generate output matching the requested schema and validate it.
9. If `MARKDOWN` is requested, generate a normalized Markdown document — summarizing the validated `STRUCTURED_JSON` result when both formats were requested, or normalizing the collected content directly when `MARKDOWN` is the only format — and check it is well-formed and non-empty.
10. Store and return the validated result(s).

For example, the final result for `STRUCTURED_JSON` might be:

```json
{
  "contains_ai_agent": true,
  "emails": ["sales@example.com", "support@example.com"],
  "products": [
    {
      "name": "AI Support Agent",
      "description": "AI-powered customer support product."
    }
  ]
}
```

Or, for `MARKDOWN`, the final result might be a document such as:

```markdown
# Example Inc.

Example Inc. builds an AI-powered customer support product.

## Products
- **AI Support Agent** — AI-powered customer support product.

## Contact
- sales@example.com
- support@example.com
```

The output schema/format(s) are therefore not simply documentation.

They are the **contract for the final output of the run**.

The AI/browser agent can navigate however it needs internally, but the final normalized result(s) must conform to that contract.

Store separately where appropriate:

```text
output formats requested
output schema (when STRUCTURED_JSON is requested)
browser actions
visited URLs
raw collected information
screenshots/evidence
structured output (when STRUCTURED_JSON is requested)
normalized markdown output (when MARKDOWN is requested)
schema/result validation state (per format)
AI usage
execution metadata
errors
```

---

# 3. Plain HTML / Website Content Scraping

We also need a lightweight scraping mode that does **not require Computer Use, computer vision, or generated scraper steps**.

The user provides one or multiple URLs.

Example:

```json
{
  "urls": ["https://www.site1.com", "https://www.site1.com/contact", "https://www.site2.com/about"]
}
```

The system fetches/scrapes each URL and can return the raw page information.

At minimum, preserve:

- requested URL
- final URL after redirects
- HTTP status
- raw HTML
- extracted/cleaned textual content where supported
- page title
- useful metadata
- success/failure status
- errors

## Optional Output Normalization

For this mode, requesting any normalization at all must be **optional**. When it is requested, `outputFormats` distinguishes what kind(s) of normalization to produce — `STRUCTURED_JSON`, `MARKDOWN`, or both together.

There are four valid use cases.

### Raw Scraping Only

The user may simply want:

```text
URL → HTML / cleaned content
```

For example:

```json
{
  "urls": ["https://example.com", "https://example.com/contact"]
}
```

No AI normalization needs to run.

Return the scraped HTML/content.

### Scraping + Markdown Normalization

The user may request `outputFormats: ["MARKDOWN"]` without any schema, to get a clean Markdown rendering of the page(s) instead of raw HTML.

For example:

```json
{
  "urls": ["https://example.com", "https://example.com/contact"],
  "outputFormats": ["MARKDOWN"]
}
```

The pipeline becomes:

```text
URLs
 ↓
Fetch Pages
 ↓
Raw HTML / Cleaned Content
 ↓
Markdown Normalization
 ↓
Normalized Markdown Result
```

For example:

```json
{
  "markdown": "# Example Inc.\n\nExample Inc. is a company that...\n\n## Contact\n- hello@example.com"
}
```

This is still a lightweight mode — it does not require an output schema, only the choice of Markdown as a target format.

### Scraping + Structured Extraction

The user may instead provide `outputFormats: ["STRUCTURED_JSON"]` together with an output schema.

For example:

```json
{
  "urls": ["https://example.com", "https://example.com/contact"],
  "outputFormats": ["STRUCTURED_JSON"],
  "outputSchema": {
    "company_name": "string",
    "contains_ai_agent": "boolean",
    "emails": "string[]",
    "phone_numbers": "string[]"
  }
}
```

The pipeline becomes:

```text
URLs
 ↓
Fetch Pages
 ↓
Raw HTML / Cleaned Content
 ↓
AI Structured Extraction
 ↓
Schema Validation
 ↓
Normalized Result
```

For example:

```json
{
  "data": {
    "company_name": "Example Inc.",
    "contains_ai_agent": true,
    "emails": ["hello@example.com", "sales@example.com"],
    "phone_numbers": ["+1 555 123 4567"]
  }
}
```

### Scraping + Structured Extraction + Markdown Summary

The user may request both at once: `outputFormats: ["STRUCTURED_JSON", "MARKDOWN"]` with an output schema. The pipeline runs structured extraction first, then produces a Markdown summary of that structured result (there is no scraper-generation prompt in this mode to guide Markdown otherwise, so the schema/structured result is the best available guidance):

```json
{
  "urls": ["https://example.com", "https://example.com/contact"],
  "outputFormats": ["STRUCTURED_JSON", "MARKDOWN"],
  "outputSchema": {
    "company_name": "string",
    "contains_ai_agent": "boolean",
    "emails": "string[]",
    "phone_numbers": "string[]"
  }
}
```

```json
{
  "data": {
    "company_name": "Example Inc.",
    "contains_ai_agent": true,
    "emails": ["hello@example.com", "sales@example.com"],
    "phone_numbers": ["+1 555 123 4567"]
  },
  "markdown": "# Example Inc.\n\nExample Inc. offers an AI agent product.\n\n## Contact\n- hello@example.com\n- sales@example.com\n- +1 555 123 4567"
}
```

The important distinction is:

```text
outputFormats absent/empty
→ scrape and return raw page data

outputFormats includes MARKDOWN (schema absent)
→ scrape pages AND return a normalized Markdown document (no schema required)

outputFormats includes STRUCTURED_JSON (+ outputSchema)
→ scrape pages AND generate normalized structured data validated against the schema

outputFormats includes both
→ scrape pages, generate the validated structured result, AND generate a Markdown
  summary of that result
```

Do not require AI processing when the user only wants HTML/content.

---

# Multi-URL Structured Extraction Semantics

Pay particular attention to how schemas work with multiple URLs.

This applies to `STRUCTURED_JSON` output. The same COMBINED/PER_URL distinction applies conceptually to `MARKDOWN` output too: by default multiple URLs should be combined into a single Markdown document (e.g. one section per page, or a unified narrative), but per-URL Markdown documents should also be supportable if requested.

By default, multiple supplied URLs should be treated as **multiple sources contributing to one extraction task**, unless the request explicitly asks for per-page results.

Example:

```json
{
  "urls": ["https://company.com", "https://company.com/about", "https://company.com/contact"],
  "outputSchema": {
    "company_name": "string",
    "description": "string",
    "emails": "string[]"
  }
}
```

The system should be able to combine information from all three pages and produce:

```json
{
  "company_name": "Example Company",
  "description": "...",
  "emails": ["sales@company.com", "support@company.com"]
}
```

rather than necessarily generating three independent structured outputs.

However, design the architecture so per-URL extraction can also be supported if requested.

For example, an extraction scope/mode could conceptually distinguish:

```text
COMBINED
PER_URL
```

Do not unnecessarily hardcode this enum if a cleaner design fits the existing application.

---

# Schema Validation & Failure Handling

This section applies to `STRUCTURED_JSON` output. Structured output must be validated.

If the model fails to satisfy the requested schema, the system should have a defined strategy.

Consider supporting:

```text
AI generation
    ↓
Schema validation
    ↓
Valid → save result

Invalid
    ↓
Provide validation errors back to AI
    ↓
Retry/correct
    ↓
Validate again
```

Use bounded retries.

Never allow an infinite correction loop.

If valid structured output cannot be generated after the configured retry limit, preserve:

- raw extraction data
- last generated output
- validation errors
- run error/status

This allows debugging without losing successfully scraped information.

`MARKDOWN` output does not need the same retry-on-schema-violation loop, since there is no schema to violate. It should still have a minimal failure strategy (e.g. treat empty/failed normalization as an error and preserve the raw source data), but does not need bounded correction retries.

**When both formats are requested**, treat them as independently-failable outputs of the same run rather than an all-or-nothing pair. If `STRUCTURED_JSON` fails to validate after the retry limit, still attempt `MARKDOWN` normalization — falling back to the raw collected data (and, for reusable scrapers, the generation prompt) as its guidance instead of the unavailable structured result — so a JSON validation failure doesn't also discard an otherwise-successful Markdown output.

---

# Schema Storage

Inspect the Prisma architecture and determine the cleanest way to persist these schemas.

The schema should not be duplicated unnecessarily.

Every saved configuration and run must also persist which `outputFormats` it used, so the correct result field(s) can be interpreted. Since a run can produce both a JSON result and a Markdown result, this must be modeled as a set/join, not a single discriminator column that forces a choice between the two.

Potential concepts may include:

```text
ExtractionSchema
ExtractionSchemaVersion
ExtractionResult (holding a nullable normalized JSON payload + its validation state,
                  and a nullable normalized Markdown payload + its validation state,
                  populated according to which output formats the run requested)
```

These are examples, not mandatory model names. A single result model with independent nullable JSON/Markdown payload fields is one option; separate `StructuredExtractionResult` / `MarkdownExtractionResult` models linked to the same run is another (this reads more naturally if the two are also allowed to succeed/fail independently, per the failure-handling note above). Choose whichever fits the broader project architecture more cleanly, but avoid scattering ad-hoc "is this markdown or json" checks across unrelated columns, and avoid a discriminator that can't represent "both" as a valid state.

A reusable scraper may reference a persistent/versioned output schema (only meaningful when `STRUCTURED_JSON` is one of its output formats).

A one-off Browser Agent run may store the schema directly on the run or reference a reusable schema, when `STRUCTURED_JSON` is one of its requested output formats.

A plain scrape run with structured extraction may do the same. A plain scrape run configured for `MARKDOWN`-only output has no schema to store at all.

Design this based on the broader project architecture.

At minimum, historical runs must preserve the exact schema they were executed against.

For example, if:

```text
Scraper v1 expects:
{
  "name": "string"
}
```

and later becomes:

```text
Scraper v2 expects:
{
  "name": "string",
  "emails": "string[]"
}
```

a historical v1 result should still clearly reference the v1 schema.

---

# Execution: On-Demand & Scheduled Runs

All three workflows — reusable scrapers, dynamic browser extraction, and plain scraping — must be persisted as **saved, reusable configurations**, not only executed once and discarded.

Every saved configuration should support two trigger modes:

```text
On-Demand
    → triggered manually (API call / UI action) whenever the user wants

Scheduled
    → attached to a cron expression, executed automatically by the queue/worker system
```

Requirements:

- Manual and scheduled runs must execute through the exact same pipeline. Do not duplicate execution logic per trigger type.
- Each run record should store how it was triggered (e.g. `MANUAL` vs `SCHEDULED`) so history stays auditable.
- A schedule can be enabled/disabled without deleting the saved configuration.
- Support standard cron expressions (with timezone) rather than ad-hoc interval fields.
- Scheduling is a property of the saved configuration itself (scraper, browser-agent config, or plain-scrape config) — not a separate parallel concept per workflow type.

---

# Architecture

The overall architecture should now conceptually support:

### Reusable Scrapers

```text
Generation (+ Generation Prompt)
    ↓
Scraper Configuration
    +
Output Formats (STRUCTURED_JSON + Output Schema, and/or MARKDOWN)
    ↓
Fixed Scraper Execution
    ↓
Raw Data
    ↓
Structured Extraction (schema-driven) ──┐
    ↓ (feeds summary, if MARKDOWN also requested)
Markdown Normalization (prompt-driven) ─┘
    ↓
Validated Result and/or Normalized Markdown Result
```

### Dynamic Browser Agent

```text
URL + Output Formats (+ Output Schema, if STRUCTURED_JSON requested)
    ↓
Computer Use + Playwright
    ↓
Dynamic Research / Navigation
    ↓
Collected Data
    ↓
Structured Extraction ──┐
    ↓ (feeds summary, if both requested)
Markdown Normalization ─┘
    ↓
Validated Result and/or Normalized Markdown Result
```

### Plain Website Scraping

Without any output format:

```text
URLs
 ↓
HTML / Content
```

With `outputFormats: ["MARKDOWN"]`:

```text
URLs
 ↓
HTML / Content
 ↓
Markdown Normalization
 ↓
Normalized Markdown Result
```

With `outputFormats: ["STRUCTURED_JSON"]` (+ schema):

```text
URLs
 ↓
HTML / Content
 ↓
Structured Extraction
 ↓
Validated Result
```

With `outputFormats: ["STRUCTURED_JSON", "MARKDOWN"]` (+ schema):

```text
URLs
 ↓
HTML / Content
 ↓
Structured Extraction → Validated Result
 ↓
Markdown Normalization (summarizes Validated Result)
 ↓
Normalized Markdown Result
```

---

# Prisma / Database

Inspect the existing Prisma schema and redesign the scraping-related models as necessary.

You have permission to:

- delete obsolete scraping models
- rename models and fields
- introduce new models
- introduce new enums
- change relationships
- normalize or denormalize data
- redesign output/result storage
- introduce schema/version models
- replace the existing scraper run architecture
- remove backward compatibility code
- reset migrations/database data if necessary

We are currently in development mode.

Do not compromise the architecture simply to preserve existing data.

The database should clearly distinguish between:

```text
execution input
output formats requested (STRUCTURED_JSON and/or MARKDOWN)
extraction/output schema (when STRUCTURED_JSON is requested)
raw source data
normalized structured result (JSON), independently of
normalized markdown result — both may be present on the same run
validation state/errors (per format)
execution metadata
schedule / trigger type
```

---

# API / DTO Requirements

Define proper DTOs for all three workflows.

Do not use `any` everywhere simply because schemas are dynamic.

The API should validate the requested `outputFormats` set (non-empty, when normalization is requested at all) and, when `STRUCTURED_JSON` is included, the application's schema definition itself, before accepting the run. When `outputFormats` contains only `MARKDOWN`, no schema should be required or accepted as meaningful.

Conceptually:

```text
validate outputFormats (+ schema definition, if STRUCTURED_JSON is included)
        ↓
accept request
        ↓
execute scraping/browser workflow
        ↓
if STRUCTURED_JSON requested: convert app schema → AI structured output schema
                               → AI extraction → validate result
if MARKDOWN requested: AI/conversion markdown normalization — guided by the scraper's
                        generation prompt (if any) and/or the STRUCTURED_JSON result
                        (if also produced) — → validate result is well-formed
        ↓
return typed dynamic JSON and/or markdown result(s)
```

If the application already has utilities for dynamic JSON Schema, Zod, structured outputs, or AI response formats, reuse or extend them instead of creating parallel implementations.

---

# Important

Before implementation, inspect:

1. Current Prisma scraping models.
2. Existing scraper-generation logic.
3. Existing Computer Use integration.
4. Existing Playwright/browser infrastructure.
5. Existing queues/workers.
6. Existing run/status architecture.
7. Existing API endpoints and DTOs.
8. Existing result/log storage.
9. Existing AI structured-output implementation.
10. Existing JSON Schema/Zod/schema validation utilities.

Refactor aggressively where necessary.

The final architecture must clearly support:

**1. Reusable generated scrapers**

Fixed reusable scraper logic with a defined structured output contract, configured for Markdown output, or both — with Markdown generation guided by the scraper's own generation prompt (and by the structured result, when both formats are produced).

**2. Dynamic AI browser extraction**

One-off Computer Use + Playwright tasks driven directly by a required output schema, a Markdown output requirement, or both simultaneously.

**3. Plain multi-URL scraping**

Raw HTML/content scraping where structured extraction is optional. When `STRUCTURED_JSON` (with an output schema) is one of the requested `outputFormats`, AI should transform the scraped information into validated normalized data matching that schema. When `MARKDOWN` is one of the requested `outputFormats`, the scraped information (or, if both were requested, the structured result) should be normalized into a clean Markdown document, with no schema required for the Markdown side.

**4. On-demand & scheduled execution**

All three workflows must be persisted as saved, reusable configurations that can be run manually or automatically via a cron schedule, through the same execution pipeline.

Most importantly, treat the **output schema/format as a contract**, not merely as a prompt hint.

The execution should not be considered to have successfully produced normalized data until the generated result has been validated against the requested schema.
