# Validation report — October 12, 2026

Validated the actual application in `/workspace/Alex` using Node 24.19.0, npm 11.9.0 and installed system Chromium. This report describes the current instance, not a claim that a new cloud task or published snapshot was tested.

| Check | Final result |
|---|---|
| Frozen dependency reinstall (`npm ci --cache /workspace/.npm-cache`) | Passed; 486 packages installed from lockfile |
| TypeScript + static/PWA build (`npm run build`, also executed by Playwright's web server) | Passed |
| Unit tests (`npm test`) | **53 passed, 0 failed, 0 skipped** across two files |
| Production browser journeys (`npm run test:e2e`) | **9 passed, 0 failed, 0 skipped** |
| Development startup / internal HTTP response | Existing started Vite process responds 200 with expected app title |
| Offline reload | Passed after production service-worker cache installation |
| Offline PDF/DOCX extraction | Passed using explicitly labeled fixture documents; no automatic approvals created |
| Full backup including attachment / reset / restore | Passed |
| Desktop and 390px mobile screenshots | Captured and visually inspected |
| All 17 desktop/mobile destinations | Browser checks passed; mobile pages have no document-level horizontal overflow |
| Keyboard dialog / command palette | Focus remains within modal; Escape closes; Ctrl+K navigation works |
| Runtime errors in navigation journey | None observed |
| Production dependency audit (`npm audit --omit=dev`) | **0 known vulnerabilities** in the final audited production dependency set |
| Python research script syntax | Passed |

The production audit exposed a vulnerable PDF.js version during implementation. The parser was upgraded to 6.4.299. Mammoth's legacy CLI dependency chain was removed; DOCX body extraction now uses bounded fflate decompression and browser XML parsing without executing HTML/macros/external entities. The updated parsers passed offline document journeys.

Browser tests caught navigation accessible-name mismatches, a document locator issue and a saving-status race. Navigation labels were fixed, filenames received explicit text elements, and save status now reflects the latest queued revision. Pending writes produce a browser unload warning. Persistence journeys wait for actual saved state before reload.

Build warnings remain: large initial JavaScript chunk and third-party Zod annotation notices. They are not build/test failures. npm also reports a deprecated glob transitive development/build dependency. A zero-vulnerability **production** audit is not a claim that all development tooling or arbitrary future dependency versions are risk-free.

Tests exercise actual engine rules, schema failures, database persistence and real production UI actions. Fixture URLs/documents are clearly labeled and never enter initial research or personal credit data. Screenshots use the test name Taylor and zero credits; no fictional earned progress is shown.

Academic verification remains incomplete even though the development environment and implemented workflows pass. See `research/verification_gaps.md` for unavailable catalog content, individual applicability and policy conflicts. See `docs/BACKLOG.md` for advanced features beyond this functional delivery.

Saved cloud draft fields: additive public-research domain policy, installation script and startup instructions. Draft persistence was confirmed. Publication and fresh-task restoration are user/product actions and have not been claimed or independently verified.
