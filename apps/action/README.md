# Docs Debt Radar GitHub Action

This package contains the testable Node wrapper used by the root `action.yml` composite Action.

Default report-only workflow:

```yaml
- uses: actions/checkout@v4
- uses: conalh/docs-debt-radar@v1
```

Fail on high-severity findings:

```yaml
- uses: actions/checkout@v4
- uses: conalh/docs-debt-radar@v1
  with:
    fail-on: high
```

The Action writes a Markdown job summary and uploads the generated report artifact. See [GitHub Action product docs](../../docs/product/github-action.md) for all inputs, outputs, and examples.
