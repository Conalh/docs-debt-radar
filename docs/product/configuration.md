# Configuration

Docs Debt Radar is intentionally small in V1. Most behavior is controlled through CLI flags or GitHub Action inputs.

## CLI Options

| Option                  | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `--format text`         | Compact terminal finding lines.                                  |
| `--format markdown`     | Human-readable Markdown report.                                  |
| `--format json`         | Full structured scan report.                                     |
| `--format sarif`        | SARIF 2.1.0 report for code-scanning compatible consumers.       |
| `--write-report <path>` | Write the selected output format to disk.                        |
| `--fail-on <threshold>` | Return exit code `1` when a visible finding meets the threshold. |
| `--docs <path...>`      | Restrict Markdown docs scanned for claims.                       |
| `--claims`              | Print extracted Markdown claims for debugging.                   |
| `--facts`               | Print extracted repository facts for debugging.                  |

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

| Input           | Default               | Purpose                                          |
| --------------- | --------------------- | ------------------------------------------------ |
| `path`          | `.`                   | Repository path to scan.                         |
| `fail-on`       | `none`                | Severity threshold that fails the workflow.      |
| `report-format` | `markdown`            | Report artifact format.                          |
| `docs`          | empty                 | Newline- or comma-separated Markdown docs paths. |
| `changed-only`  | `false`               | Reserved until CLI changed-file scanning exists. |
| `report-path`   | `docs-debt-report.md` | Generated report path.                           |
| `artifact-name` | `docs-debt-report`    | Uploaded artifact name.                          |

## Current Limits

- `changed-only` is not implemented by the CLI yet.
- External URL checking is out of V1 scope.
- The scanner does not run documented commands.
- Route extraction is limited to supported Next.js and FastAPI conventions.
