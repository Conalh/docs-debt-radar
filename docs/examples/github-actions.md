# GitHub Actions Example

Docs Debt Radar can run as a repository workflow and can also scan workflow files for stale package script references.

## Report-Only Workflow

```yaml
name: Docs Debt Radar

on:
  pull_request:

jobs:
  docs-debt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: conalh/docs-debt-radar@v1
```

## Fail On High Findings

```yaml
- uses: conalh/docs-debt-radar@v1
  with:
    fail-on: high
    report-format: markdown
```

## Common Findings

- `workflow-references-missing-script`: `.github/workflows/ci.yml` runs `npm run lint:ci`, but `package.json` does not define `lint:ci`.
- `missing-package-script`: README tells contributors to run a script missing from `package.json`.

The Action writes a Markdown job summary and uploads the generated report artifact.
