# Rules

Rules compare documentation claims with repository facts. Every finding includes a rule ID, severity, document path and line, evidence, a suggested edit, and a false-positive note.

## Rule Reference

| Rule                                 | Default severity | What it checks                                                                 |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------ |
| `missing-referenced-file`            | medium           | A Markdown relative link points to a file that is not present.                 |
| `missing-package-script`             | high             | Docs mention an npm, pnpm, or yarn script that is missing from `package.json`. |
| `env-var-not-documented`             | high             | Source reads an env var that docs or env examples do not mention.              |
| `documented-env-var-not-used`        | low              | Docs mention an env var that scanned source does not reference.                |
| `stale-route-mention`                | medium           | Docs mention a route not found by supported route extractors.                  |
| `broken-markdown-anchor`             | medium           | A Markdown link points to a missing heading anchor.                            |
| `missing-screenshot`                 | medium           | Docs reference an image path that is not present.                              |
| `external-link-unreachable`          | low              | An opted-in external link check returns a failed status or request error.      |
| `workflow-references-missing-script` | high             | A GitHub Actions workflow runs a package script or local file that is missing. |

## Inspect Rules Locally

```bash
docs-debt-radar list-rules
docs-debt-radar explain missing-package-script
```

Example explanation:

```text
# missing-package-script

Documented package script does not exist

Default severity: high

Flags documented npm, pnpm, or yarn scripts that are missing from package.json.
```

## Severity Guidance

- `high`: likely blocks install, test, CI, auth, database, or core setup.
- `medium`: likely misleads a user but may not block all workflows.
- `low`: cleanup signal or possible stale optional detail.
- `info`: context-only signal for future rules.

Findings from `docs/archive/**`, `docs/archives/**`, and changelog files are downgraded to `info` because those docs may intentionally preserve historical claims.

## False Positives

Prefer fixing current docs over suppressing findings. Use suppressions only for generated files, archived docs, dynamic runtime behavior, or scanner limitations that are understood and documented with a reason.
