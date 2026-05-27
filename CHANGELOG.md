# Changelog

All notable changes to Docs Debt Radar will be documented here.

## 0.0.0

- Initialized project foundation.
- Added TypeScript workspace skeleton.
- Added initial core scan report model.
- Added initial CLI help surface.
- Added V1 fixture repositories and expected report contracts.
- Added severity and V1 scope product docs.
- Added the shared core evidence model for scanner config, documents, claims, facts, findings, warnings, and reports.
- Added Markdown parsing and high-confidence claim extraction for links, images, inline code, fenced shell commands, env vars, routes, package scripts, and external URLs.
- Added a CLI `scan <path> --claims --format json` path for listing extracted Markdown claims.
- Added repository fact extraction for file tree entries, Markdown anchors, package scripts, env vars, Next.js routes, FastAPI routes, GitHub Actions workflows, and workflow commands.
- Added a CLI `scan <path> --facts --format json` path for listing extracted repository facts.
- Added the V1 rules engine and default CLI findings scan path.
- Added CLI report formats, `--write-report`, `--fail-on`, `list-rules`, and `explain <rule-id>`.
- Added inline and config-file suppressions with required reasons and report counts.
- Added the GitHub Action wrapper, job summary output, report artifact upload, and workflow examples.
- Reworked the public README and added demo reports, configuration docs, rule docs, and project-shape examples.
- Added the optional static report viewer for local JSON report inspection.
- Added release-readiness packaging metadata, package surface audits, packed CLI smoke tests, compatibility notes, and an MIT license.
- Added SARIF 2.1.0 output for code-scanning compatible docs debt reports.
- Added `--changed-only` scanning for changed Markdown docs while preserving full-repository fact extraction.
- Added Express route extraction for literal app/router route calls and stale route reporting.
- Added opt-in external link checking for Markdown links in the CLI and GitHub Action.
- Added structured suggested fixes and CLI `--format patch` output for patchable documentation findings.
- Added opt-in GitHub Action pull request summary comments.
- Added `--changed-since` base-ref scanning for pull request and monorepo workflows.
- Downgraded archived and changelog documentation drift to informational findings.
- Added CLI `--format agent` handoff reports for coding agents.
- Added release check automation and a tag-triggered release verification workflow.
- Added a local GitHub Action smoke test for temporary demo checkout validation.
- Added Flask route extraction for literal app and blueprint decorators.
- Added a dogfood scan script and repo suppression config for intentional fixture/demo drift.
- Added Django route extraction for literal `path()` URL patterns.
