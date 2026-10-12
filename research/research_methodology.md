# Research methodology and provenance

Research date: October 12, 2026. Initial URLs and facts were supplied by the user. Network requests first failed at the environment proxy; after additive domain configuration, most public pages became reachable. Every failed attempt is retained in retrieval history.

Authority order: individual official degree audit; written registrar/advisor applicability; applicable official catalog; university articulation agreement; official program/policy/fee pages; provider recommendations; third-party supporting context. No independent degree-planning guide was used to create verified mappings.

The source registry records exact URLs, requested catalog applicability, retrieval state, dates, reviewed excerpt/location, blockage and history. Snapshots are public pages or PDFs and contain no personal documents. Human/agent review of source text is distinct from mere HTTP 200. WGU partnership pages returned shells; UMPI catalog and Study.com pricing returned 403. Missing fields remain unknown.

`research.py` is an explicit Python standard-library retrieval pipeline with normal TLS verification. It does not bypass bot/access restrictions, use private APIs, invent credentials, or perform automatic university decisions. Retrieval alone never changes a student's personal academic history. Readable text was extracted using HTMLParser and `pdftotext` for official PDF documents. Exact extraction assertions and row-count checks guard the reviewed normalization scripts.

The UMPI academic map is deliberately tagged provisional. Its named course rows are imported without inventing elective placeholders, missing prerequisites, descriptions or grade rules. Course-number upper-level indication is provisional and is not asserted as an individual transfer designation. The current retrieved map includes second-year spring; this contradicts the starting omission concern and is recorded as a research finding.

Sophia table rows are labeled provider-published equivalency. They have no assigned degree requirement IDs. Recommendations remain unverified until individual applicability is documented. Provider workloads are **30-hour planning assumptions**, editable by the user and labeled estimates, not published facts. No provider course is marked scheduled, earned or officially applied at initialization.

WGU's standard path is sourced to October 2026 catalog printed pages 85–86, with 36 courses totaling 110 competency units and program version 202605. The program guide's separate publication/version date is retained. No automatic semester-credit conversion, lower/upper designation or complete graduation-policy assertion is made.

Public prices and degree rules carry their own evidence. Estimated completion cost, cash commitments, payments and aid are separate records. Potential aid is never counted as an award. Special pathways such as Edison Accelerate are conditional; no automatic eligibility is asserted.

## Updating safely

1. Back up personal state in the app before a research update.
2. Run `npm run research` with authorized public domains available. Inspect retrieval history and snapshots. Never treat a failed or shell-only request as retrieved policy text.
3. Compare changed source content against the applicable catalog. Preserve prior reviewed excerpts/history; replace a confirmed record only deliberately after review.
4. Update normalization rules and expected source locations for the new reviewed material. The scripts target delivered reviewed snapshots; do not use an old catalog extraction for a new catalog year.
5. Add catalog-specific normalized requirements/equivalencies with traceable source IDs, quotes, location, checked date and explicit approval level. A published table is not individual applicability.
6. Import the reviewed records through the app's preview. Personal awards remain separate and cannot be created by a source refresh.
7. Run unit/build/browser validation after model changes. Get written registrar confirmation when policies conflict or degree applicability is unresolved.

Local document references use `urn:degree-hq:document:<id>`, avoiding fabricated public URLs. PDF/DOCX extraction remains on-device and requires user review before creating an evidence draft. The app cannot independently authenticate the attached document or an entered approval.
