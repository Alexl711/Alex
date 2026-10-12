# Procurement Degree Hacker Pro

**The smartest path from zero college credits to an accredited bachelor's degree.**

A working React / TypeScript local-first degree-planning application. No account, backend or paid service is required for its core functionality. All personal credit awards, payments and approvals start at zero. The provider course library is research data, never earned credit or a personal plan.

## Run

Requires Node 22.12+ (validated with Node 24.19) and npm. From this checkout:

```sh
npm install
npm run dev
```

For a static production build and reliable local offline launch:

```sh
npm run build
npm run preview
```

Open the address printed by Vite in your browser. Keep the same browser origin / port to retain the same IndexedDB database. Do **not** double-click `dist/index.html`; Vite's output is not intended for `file://`. Deploy `dist/` to an HTTPS static host, or use the preview server locally. The PWA service worker runs in the production build, not development. Allow the first load and cache installation to finish before going offline. Snapshot restoration does not preserve running server processes.

On restricted cloud filesystems, use `npm ci --cache /workspace/.npm-cache`. The saved cloud startup instructions use `/workspace/Alex`. Each cloud task is already isolated; use this checkout rather than creating a worktree.

## What works

- Responsive desktop / mobile shell with all 17 requested destinations, collapsible navigation, Ctrl/Cmd+K search, light/dark/system themes and density preferences.
- Course CRUD, progress tracking, scheduling, CSV import preview/export, sorting, search, selection, column visibility/resizing and pagination. Table views can be saved and restored within the current page session.
- Hierarchical AND / OR / credit / upper-level / residency / major residency / GPA requirements, unique credit accounting, written transfer evaluation records, official credit awards, provenance and approval history.
- Exact course-subset optimizer for up to 18 confirmed candidates, three objectives, scenario controls, prerequisite scheduling, study-capacity forecasting and calendar-based subscription billing. It explicitly refuses to produce a graduation winner with incomplete requirements.
- Manual shift blocks, explicit custom rotations, recovery / blackout time, five calendar views, drag/drop rescheduling, focus timer, manual study logging and missed-session queue. No rotating pattern is presumed.
- Transaction ledger, actual versus estimated / committed expenses, refunds, reimbursement, confirmed versus potential aid, 30/60/90-day cash needs and subscription plans.
- University comparison and switching without losing educational history; additional university/program records can be added.
- Prior-learning / professional-development portfolio with editable competency links. Credentials never automatically create degree credit.
- Private document attachments, local PDF/DOCX/text extraction, explicit review before evidence entry, printable reports, charts, JSON backups with SHA-256 integrity, document restoration, compatible schema migration and recovery without silently resetting corrupted data.

## Research state — October 12, 2026

The research folder preserves public HTML/PDF snapshots, readable extracted text, source URLs, retrieval attempts and reviewed excerpts. Source content is never inferred from a failed request.

| Record set | Result | Academic meaning |
|---|---|---|
| UMPI public FAQ / tuition / admissions | Retrieved | 120-credit minimum, 30 institutional / 12 major / 9 upper-major residency, $1,800 per eight-week 2026–27 session and age/documentation rules documented publicly |
| UMPI general education | Retrieved | New curriculum applies to new 2026–27 admits; exact catalog course rules not retrieved |
| UMPI academic map | 25 named rows | Provisional scheduling-guide data; **current map includes second-year spring**, correcting the supplied omission claim |
| Sophia library | 85 courses | Unstarted provider records with user-editable workload estimates |
| UMPI–Sophia published table | 72 equivalencies | Provider-published equivalency, **zero individual applicability approvals** |
| WGU October 2026 catalog | 36 courses / 110 CUs | Documented program standard path, program version 202605; competency units are not relabeled as 120 semester credits |
| WGU Sophia / general transfer URLs | JavaScript shells | No transfer rows inferred or invented |
| TESU / SNHU public tuition | Retrieved | Published price structures documented; complete course-by-course catalogs unresolved |
| Accreditation | UMPI / WGU accreditor listings reviewed | Institutional status is separate from any program-specific accreditation claim |
| UMPI catalog and program/GEC URLs | HTTP 403 | Complete 2026–27 audit remains unavailable |
| Study.com pricing | HTTP 403 | Supplied prices remain explicitly unverified |

UMPI's CPL page states a 30-credit limit, while the YourPace FAQ states no fixed transfer limit plus residency minima. Their treatment of third-party ACE credits remains a registrar question. This app does **not** guarantee a 90-transfer-credit plan.

The initial data cannot establish a cheapest legitimate purchase or verified graduation date. It deliberately reports that blockage. You can explore published options and prepare questions without treating them as safe purchases.

See [verification gaps](research/verification_gaps.md), [research methodology](research/research_methodology.md), [optimizer documentation](docs/OPTIMIZER.md) and [prioritized backlog](docs/BACKLOG.md). This is a tested functional delivery with disclosed research and advanced-feature limitations; it is not a fully verified individual degree audit.

## Enter real university confirmations

1. Add an actual degree audit, transcript evaluation or written advisor/registrar response in **Document Vault**. Review extracted text; extraction creates no credits or approvals.
2. In **Research Sources**, create an evidence record with its URL or local document URI, author, evidence type, catalog year, exact excerpt, page/section and checked date. Public pages and provider tables are separate evidence types.
3. In **Degree Audit**, enter/verify exact requirements and nested groups. Preserve the applicable catalog. Review every program condition before marking the program complete.
4. In **Transfer Matrix**, record published equivalency separately from advisor-confirmed applicability, including exact course ID, requirement IDs, grade/score, validity and risk. A confirmed state requires reviewed official individual evidence.
5. After course completion, use **Record official credit** only when the university has posted and evaluated the award. Record university-applied requirements and a degree-audit or transcript-evaluation source. A public transfer table cannot support this action.
6. Add actual enrollment dates, planned courses and study capacity before running the optimizer. Program completion alone does not resolve missing GPA, residency or transfer evidence.

The UI asks you to attest accurately to the evidence; the software cannot authenticate a document or contact a registrar on your behalf.

## Update research explicitly

```sh
npm run research
```

This Python standard-library pipeline fetches only registered public sources with TLS verification enabled. It records failed requests and retrieval history. It never promotes retrieved content to approved records. Catalog PDFs are retained as PDFs; `pdftotext` was used for the reviewed WGU extraction.

The reviewed normalization scripts (`scripts/normalize_research.py`, `scripts/normalize_wgu.py`) encode exact extraction checks for the delivered snapshots. They assert expected text/row counts and require review when content changes. They are not automatic approval of a new catalog year. See the methodology for updating snapshots and preserving prior review history.

Import reviewed JSON in **Research Sources**. Preview normalized records before importing. Refreshes cannot silently overwrite confirmed academic records or previously reviewed evidence. Modify those records deliberately using the evidence editor. Personal credit awards are separate from research refreshes.

## Backup / restore / privacy

In **Settings & Backups**, export a full JSON backup. It includes documents as data URLs, normalized state, schema version and checksum. Store a copy off-device; IndexedDB alone cannot protect against device loss or browser deletion. Request persistent browser storage if desired; the browser may decline.

Restore validates schema, checksum, duplicate IDs and relational references before replacing anything, and uses a database transaction. Bad imports preserve existing data. v1 structured backups migrate to v2; new compatible optional fields receive defaults. Future incompatible schema versions are rejected. Recovery mode lets you export raw records without replacing corrupted data.

Research refresh and document parsing do not upload private records. Opening an official-source link intentionally visits that external website. PDF export uses the browser print dialog's **Save as PDF**. Reset asks for confirmation; document deletion is destructive. Structured undo/redo is session-local and cannot recover deleted file bytes.

Wait for **Saved on this device** before closing. Pending writes trigger a browser unload warning. Export immediately if local saving fails. Browser origin changes (including changing localhost ports) create separate storage.

## Validation

```sh
npm test
npm run test:e2e
```

Playwright uses `/usr/bin/chromium` in this cloud image. Elsewhere set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium binary, or install Playwright Chromium and adjust the configuration. Tests build and serve the actual production PWA, with fresh browser contexts and clearly labeled test fixtures. No test fixture approvals enter shipped initial data.

Tests cover zero-credit initialization, completion versus posting/applicability, duplicate credit prevention, major versus elective mapping, hierarchical groups, residency and upper levels, conflicts, invalid source authority, subscriptions, financial aid, workload forecasting, prerequisite rejection, backup migration/corruption, offline behavior, mobile navigation, keyboard dialogs, attachments and actual approval entry.

Desktop/mobile screenshots are under [docs/screenshots](docs/screenshots). See [validation report](docs/VALIDATION.md) for the final run results.

## Architecture

- `src/models.ts`: normalized TypeScript models and Zod schemas.
- `src/engine.ts`: shared audit, optimization, billing, forecasting and CSV calculations.
- `src/storage.ts`: Dexie database, backup migration and transactional restoration.
- `src/components`: accessible Radix dialog / shadcn-style button, TanStack table, record editors and calendar planner.
- `src/App.tsx`: application shell and working sections.
- `research`: versioned public-source records and explicit verification gaps.
- `tests`: engine/storage unit tests and production browser journeys.

Recharts powers productivity/burn-down charts; date-fns handles calendar calculations; Tailwind and application CSS style the interface. PDF.js and a bounded fflate / browser XML parser load locally on demand for extraction. The static build has no application server/API.
