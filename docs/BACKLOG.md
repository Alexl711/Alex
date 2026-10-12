# Prioritized remaining work

The delivered application is functional and tested. The following limitations remain explicit rather than being filled with sample approvals or arbitrary paths.

## P0 — Academic evidence prerequisites

1. Obtain the UMPI 2026–27 catalog / individual audit; catalog, program and GEC endpoints returned HTTP 403. Reconcile all GEC/core/concentration/upper-level/capstone requirements and course descriptions, prerequisites and minimum grades.
2. Get registrar interpretation of the 30-credit CPL/PLA limit versus the FAQ's general transfer language, specifically Sophia/Study.com ACE and CLEP. Do not infer a guaranteed 90-credit outside plan.
3. Obtain complete TESU/SNHU catalog requirements and WGU transfer agreements. WGU standard-path coursework is documented, but the full graduation/residency and individual transfer audit is incomplete. Dynamic partnership pages returned application shells.
4. Confirm current Study.com prices/recommendation limits, CLEP numeric fee, ACE/NCCRS dates/levels, eligibility, all institution/program accreditation claims not already reviewed, transcript deadlines and exact course availability.
5. Resolve UMPI application/document deadline prose versus separate table columns. The table supplies application dates, but all deadlines should be confirmed with admissions before action.

These require actual accessible authoritative evidence or written institutional responses. The app's question generator and review/import workflow are ready; no secret values are needed for ordinary local operation.

## P1 — Optimization and planning depth

- Add an institution-specific session-offering calendar, earliest/later enrollment enumeration, per-term credit loads and application/document deadline enforcement.
- Add provider scheduling permutations, concurrency, annual Sophia plans, provider exam quotas/retake fees, sales tax, transcript fees and TESU Edison Accelerate as a separately confirmed pathway.
- Model future passing thresholds/GPA scenarios without falsely asserting earned grades; keep projected versus official results distinct.
- Add course duration distributions, provider-source workload recommendations, risk weights and sensitivity reports. Current workload values and transcript delay are editable/explicit assumptions.
- Move exhaustive search into a worker for larger candidate sets; keep exact-versus-heuristic output clear.
- Expand ICS timezone/recurrence/exception support. Current imports read individual events, mark RRULE for manual review and do not claim comprehensive calendar interoperability.
- Add multi-day auto-placement, conflicting-time-block detection, catch-up batch scheduling and background timer restoration. Current timers require an open page and explicit logging.

## P2 — UX, reporting and maintenance

- Persist table saved views across navigation; add column pinning, more specialized multi-filter UI and virtualization for very large imports.
- Split the section renderers into smaller feature modules, add richer accessible table keyboard interactions and formal WCAG audit. Radix dialogs, focus indicators, reduced motion and keyboard navigation are implemented; WCAG certification is not claimed.
- Add richer interactive analytics (cumulative credit history, cost-by-university charts, session forecasts), automatically derived earned milestones and reconciled paid commitments.
- Add print-specific multi-page layout polish, more granular document categories, selective encrypted backups and optional on-device scanned-PDF OCR. Current PDF export uses browser print; PDF text extraction cannot read scanned images.
- Expand institution-specific admissions and credential research. Professional development and PLA portfolios work but certification eligibility/cost is not researched.
- Add full persisted structured models for transcript requests and financial-aid award detail beyond the current ledger/evidence records. The core TypeScript schemas exist, but not every schema has a dedicated entity editor.
- Optimize bundle splitting and evaluate dependency security updates with browser checks. Current build reports a large JavaScript bundle warning; extraction modules are lazy-loaded and precached for offline use.
