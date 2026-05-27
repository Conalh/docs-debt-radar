# GitHub Action

Goal 8 brings Docs Debt Radar into pull request and main-branch workflows.

## Default Report-Only Workflow

The default Action posture is report-only. It publishes a job summary and uploads a report artifact without failing CI.

```yaml
name: Docs Debt Radar

on:
  pull_request:
  push:
    branches: [main]

jobs:
  docs-debt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: conalh/docs-debt-radar@v1
```

## Fail On High Findings

Set `fail-on` when documentation drift should fail CI.

```yaml
- uses: conalh/docs-debt-radar@v1
  with:
    fail-on: high
```

Supported thresholds are `none`, `info`, `low`, `medium`, and `high`.

## Inputs

| Input           | Default               | Purpose                                                 |
| --------------- | --------------------- | ------------------------------------------------------- |
| `path`          | `.`                   | Repository path to scan.                                |
| `fail-on`       | `none`                | Severity threshold that fails the workflow.             |
| `report-format` | `markdown`            | Report artifact format: `markdown` or `json`.           |
| `docs`          | empty                 | Newline- or comma-separated Markdown docs paths.        |
| `changed-only`  | `false`               | Reserved until changed-file scanning exists in the CLI. |
| `report-path`   | `docs-debt-report.md` | Path for the generated report artifact.                 |
| `artifact-name` | `docs-debt-report`    | Uploaded artifact name.                                 |

## Outputs

| Output                | Purpose                   |
| --------------------- | ------------------------- |
| `exit-code`           | Scanner exit code.        |
| `report-path`         | Generated report path.    |
| `total-findings`      | Visible finding count.    |
| `suppressed-findings` | Suppressed finding count. |

## Docs-Only Scope

Restrict scanning to selected docs:

```yaml
- uses: conalh/docs-debt-radar@v1
  with:
    docs: |
      README.md
      docs/setup.md
```

## Artifacts and Summary

The Action always attempts to upload the generated report artifact, even when `fail-on` makes the scan step return exit code `1`. The job summary includes severity counts, warning counts, suppression counts, and the first ten visible findings.

## Current Limitation

`changed-only` is present as an Action input so workflow files can be shaped around the future option, but the current CLI does not implement changed-file scanning yet. Passing `changed-only: true` returns exit code `2`.
