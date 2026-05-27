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
