# Node Example

Use this shape for package README and setup docs.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `missing-package-script`: README says `npm run test:e2e`, but `package.json` only defines `test`.
- `missing-referenced-file`: README links to `docs/cli.md`, but the file does not exist.
- `env-var-not-documented`: source reads `DATABASE_URL`, but docs and `.env.example` omit it.

## CI Threshold

```bash
docs-debt-radar scan . --format markdown --write-report docs-debt-report.md --fail-on high
```

Use `--fail-on high` when stale setup or test commands should block CI. Use `--fail-on none` for report-only adoption.
