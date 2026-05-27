# Next.js Example

Docs Debt Radar detects App Router and Pages Router page/API route facts from common Next.js paths.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs tell users to open `/settings`, but no matching App Router or Pages Router route exists.
- `missing-referenced-file`: docs link to a removed component or setup file.
- `broken-markdown-anchor`: docs link to `README.md#deployment`, but the heading changed.

## Supported Patterns

The route extractor handles file-convention routes such as:

```text
app/dashboard/page.tsx
app/api/health/route.ts
pages/profile.tsx
pages/api/status.ts
```

## Docs Scope

```bash
docs-debt-radar scan . --docs README.md docs/setup.md --format json
```

Use scoped scans when a pull request only changes a small documentation surface.
