# Next.js Example

Docs Debt Radar detects App Router page and API route facts from common Next.js paths.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs tell users to open `/settings`, but no `app/settings/page.tsx` route exists.
- `missing-referenced-file`: docs link to a removed component or setup file.
- `broken-markdown-anchor`: docs link to `README.md#deployment`, but the heading changed.

## Docs Scope

```bash
docs-debt-radar scan . --docs README.md docs/setup.md --format json
```

Use scoped scans when a pull request only changes a small documentation surface.
