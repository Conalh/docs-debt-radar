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

| Input                  | Default               | Purpose                                           |
| ---------------------- | --------------------- | ------------------------------------------------- |
| `path`                 | `.`                   | Repository path to scan.                          |
| `fail-on`              | `none`                | Severity threshold that fails the workflow.       |
| `report-format`        | `markdown`            | Report artifact format: `markdown` or `json`.     |
| `docs`                 | empty                 | Newline- or comma-separated Markdown docs paths.  |
| `changed-only`         | `false`               | Scan only changed Markdown docs from git status.  |
| `changed-since`        | empty                 | Scan only Markdown docs changed since a git ref.  |
| `check-external-links` | `false`               | Opt in to network checks for external links.      |
| `pr-comment`           | `false`               | Post a pull request summary comment when enabled. |
| `github-token`         | empty                 | Token used for opt-in pull request comments.      |
| `report-path`          | `docs-debt-report.md` | Path for the generated report artifact.           |
| `artifact-name`        | `docs-debt-report`    | Uploaded artifact name.                           |

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

## Pull Request Comments

Set `pr-comment: true` to post the same concise summary as a pull request comment. This is opt-in because it needs a token with permission to write PR issue comments.

```yaml
permissions:
  contents: read
  pull-requests: write

- uses: conalh/docs-debt-radar@v1
  with:
    pr-comment: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

The comment includes a stable marker, severity counts, suppression and warning counts, and the first ten visible findings.

## Changed-Only Scope

Set `changed-only: true` to scan only Markdown docs reported by `git status` in the checked-out repository. The scanner still extracts repository facts from the full checkout, so changed docs can be checked against package scripts, routes, env vars, and workflow files elsewhere in a monorepo.

Set `changed-since` when the changed docs should be computed against a base ref:

```yaml
- uses: conalh/docs-debt-radar@v1
  with:
    changed-since: origin/main
```

## External Links

Set `check-external-links: true` only when the workflow is allowed to make outbound network requests. External link failures are low-severity findings by default because remote sites can block automated checks or fail temporarily.
