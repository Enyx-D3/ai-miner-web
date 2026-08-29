# Refinery Backend Resource Requirements

For the final Refinery feature set, we need more than browser computation. We need a **stable backend server** and **background workers** so large archives can be processed reliably, resumed safely, and stored/accounted for correctly.

| Resource Needed | What It Does | Why We Need It |
|---|---|---|
| Stable backend server | Provides APIs for auth, uploads, job creation, job status, billing checks, and downloads | The browser cannot reliably coordinate long-running processing, secure user access, billing, or durable job state by itself |
| Background worker service | Runs heavy archive processing outside the browser | Large parsing, deduplication, indexing, topic detection, and export generation can exceed browser memory/time limits |
| Job queue | Stores processing jobs and sends them to workers | Required for retries, progress tracking, delayed work, and safe resume after interruption |
| Database | Stores users, jobs, run metadata, inventory, source coordinates, fingerprints, errors, and coverage certificates | Required for reproducible accounting, dashboards, job status, and source traceability |
| Object/file storage | Stores uploaded ZIPs, intermediate artifacts, generated archives, ledgers, and downloads | Large files should not live in the database; storage is needed for durable files |
| Checkpoint/resume system | Saves progress after each processing stage | Large archives must survive browser close, network loss, server restart, or worker failure |
| Parser engine | Normalizes ChatGPT exports first, then Claude/Gemini/etc. later | Each provider has a different export format; we need a modular parser architecture |
| Source inventory system | Counts every conversation, message, attachment, and supported object | Needed before transformation so we can prove what was processed and what was skipped |
| Coverage certificate generator | Produces processed/total counts, errors, unsupported objects, dedup decisions, checksums, and accounting | Gives users trust that the archive was processed completely and reproducibly |
| Stable source coordinate system | Assigns every message/artifact a permanent address | Every generated result must link back to original evidence |
| Fingerprinting/hash pipeline | Creates content hashes, object IDs, and checksums | Needed for deterministic IDs, deduplication, integrity checks, and repeatable results |
| Exact duplicate detection | Finds identical content deterministically | Prevents duplicate content from polluting the archive while keeping auditability |
| Near-duplicate detection | Finds similar conversations/messages with confidence scores | Similar content should be surfaced for review, not silently merged |
| Topic/project reconstruction engine | Builds topics, conversation families, projects, timelines, decisions, artifacts, and open items | These features require cross-conversation analysis beyond simple file parsing |
| Search/index service | Powers Quick Find and Deep Find | Fast exact/fuzzy/semantic search needs an index built from the refined archive |
| Vector/embedding system | Supports semantic search, topic similarity, and near-duplicate scoring | Deep Find and semantic grouping require meaning-based comparison |
| Export builder | Creates final HTML, Markdown, JSON, CSV, source ledgers, and ZIP archive | Users need a portable archive they can own and download |
| Realtime progress channel or polling API | Sends processing progress to the UI | Users need to see stage, percentage, logs, errors, and completion state |
| Authentication | Identifies users and protects their jobs/files | Required for private archives, dashboard history, and secure downloads |
| Billing system | Handles free/paid access, checkout, webhooks, and unlock state | Needed if the product charges for full archive generation or larger processing |
| Encryption and retention policy | Protects uploaded archives and deletes them after a defined period | Required for privacy trust and responsible handling of sensitive chat exports |
| Monitoring/logging | Tracks failures, performance, and job health | Needed to debug processing errors without inspecting private user content |

## Explanation

```text
The browser will handle the user interface, file selection, upload, progress display, and download.

A stable backend server is required to securely coordinate users, uploads, processing jobs, billing, progress, and downloads.

Background workers are required to run the heavy processing tasks reliably outside the browser.
```

## Recommended Minimal Production Setup

| Layer | Suggested Resource |
|---|---|
| Frontend | Next.js app |
| Stable backend server | Next.js API routes or separate Node API |
| Workers | Separate Node/Python worker service |
| Database | Supabase Postgres |
| File storage | Supabase Storage, S3, or Cloudflare R2 |
| Queue | Trigger.dev, Inngest, BullMQ/Redis, or similar |
| Search | Postgres full-text first; Meilisearch/Typesense later if needed |
| Semantic search | pgvector or vector database |
| Auth | Supabase Auth |
| Billing | Stripe |
| Monitoring | Sentry/logging |
