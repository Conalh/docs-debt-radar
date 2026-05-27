# Configuration

Docs Debt Radar is intentionally small in V1. Most behavior is controlled through CLI flags or GitHub Action inputs.

## CLI Options

| Option                   | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `--format text`          | Compact terminal finding lines.                                  |
| `--format markdown`      | Human-readable Markdown report.                                  |
| `--format json`          | Full structured scan report.                                     |
| `--format sarif`         | SARIF 2.1.0 report for code-scanning compatible consumers.       |
| `--format patch`         | Unified-diff suggestions for patchable documentation findings.   |
| `--format agent`         | Compact Markdown stale-instruction handoff for coding agents.    |
| `--write-report <path>`  | Write the selected output format to disk.                        |
| `--fail-on <threshold>`  | Return exit code `1` when a visible finding meets the threshold. |
| `--docs <path...>`       | Restrict Markdown docs scanned for claims.                       |
| `--changed-only`         | Scan only changed Markdown docs reported by `git status`.        |
| `--changed-since <ref>`  | Scan only Markdown docs changed since a git ref.                 |
| `--check-external-links` | Opt in to network checks for external Markdown links.            |
| `--claims`               | Print extracted Markdown claims for debugging.                   |
| `--facts`                | Print extracted repository facts for debugging.                  |

Valid fail thresholds are `none`, `info`, `low`, `medium`, and `high`.

## Suppression Config

Config-file suppressions live in `.docs-debt-radar.json`:

```json
{
  "ignore": [
    {
      "rule": "missing-referenced-file",
      "path": "docs/archive/**",
      "reason": "Archived release notes intentionally reference historical paths."
    }
  ]
}
```

Every ignore entry must include:

- `rule`: rule ID or `*`.
- `path`: document path or simple `*` / `**` glob.
- `reason`: explicit explanation shown in the report data.

Invalid suppressions are ignored and reported as `invalid_suppression` warnings.

## GitHub Action Inputs

| Input                  | Default               | Purpose                                           |
| ---------------------- | --------------------- | ------------------------------------------------- |
| `path`                 | `.`                   | Repository path to scan.                          |
| `fail-on`              | `none`                | Severity threshold that fails the workflow.       |
| `report-format`        | `markdown`            | Report artifact format.                           |
| `docs`                 | empty                 | Newline- or comma-separated Markdown docs paths.  |
| `changed-only`         | `false`               | Scan only changed Markdown docs from git status.  |
| `changed-since`        | empty                 | Scan only Markdown docs changed since a git ref.  |
| `check-external-links` | `false`               | Opt in to network checks for external links.      |
| `pr-comment`           | `false`               | Post a pull request summary comment when enabled. |
| `github-token`         | empty                 | Token used for opt-in pull request comments.      |
| `report-path`          | `docs-debt-report.md` | Generated report path.                            |
| `artifact-name`        | `docs-debt-report`    | Uploaded artifact name.                           |

## Current Limits

- Changed-file modes require the scanned path to be inside a Git repository.
- External URL checking is disabled by default and only runs with `--check-external-links`.
- Patch output is advisory and only covers conservative single-line documentation edits.
- Agent output is a compact handoff for full scans and is not available for `--claims` or `--facts`.
- Pull request comments are disabled by default and require `pr-comment: true` plus `github-token`.
- The scanner does not run documented commands.
- Route extraction is limited to supported Next.js, FastAPI, Flask, Django, Express, and NestJS conventions.
