# CLI Product Loop

Goal 6 turns the scanner into a usable local CLI surface.

## Commands

Primary scan:

```bash
docs-debt-radar scan . --format text
docs-debt-radar scan . --format markdown
docs-debt-radar scan . --format json
docs-debt-radar scan . --format sarif
```

Development inspection helpers:

```bash
docs-debt-radar scan . --claims --format json
docs-debt-radar scan . --facts --format json
```

Rule help:

```bash
docs-debt-radar list-rules
docs-debt-radar explain missing-package-script
```

## Report Writing

Reports can be written to disk while also printing to stdout:

```bash
docs-debt-radar scan . --format markdown --write-report docs-debt-report.md
```

## Exit Codes

- `0`: scan completed and no finding met the fail threshold.
- `1`: scan completed and at least one finding met the fail threshold.
- `2`: invalid command, option, rule ID, threshold, or output format.

`--fail-on none` is the default. Valid thresholds are `high`, `medium`, `low`, and `info`.

```bash
docs-debt-radar scan . --fail-on high
```

## Output Formats

- `text`: compact human-readable finding lines.
- `markdown`: full Markdown report for normal scans.
- `json`: full structured scan result.
- `sarif`: SARIF 2.1.0 report for code-scanning tools.

Markdown and SARIF output are only supported for the full docs debt scan, not the `--claims` or `--facts` debug helpers.
