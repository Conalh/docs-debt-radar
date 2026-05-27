# CLI Product Loop

Goal 6 turns the scanner into a usable local CLI surface.

## Commands

Primary scan:

```bash
docs-debt-radar scan . --format text
docs-debt-radar scan . --format markdown
docs-debt-radar scan . --format json
docs-debt-radar scan . --format sarif
docs-debt-radar scan . --format patch
docs-debt-radar scan . --changed-only
docs-debt-radar scan . --changed-since origin/main
docs-debt-radar scan . --check-external-links
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
- `patch`: advisory unified-diff suggestions for patchable single-line doc findings.

Markdown, SARIF, and patch output are only supported for the full docs debt scan, not the `--claims` or `--facts` debug helpers.

## Patch Suggestions

Patch output is intentionally conservative:

```bash
docs-debt-radar scan . --format patch
```

The scanner emits unified-diff suggestions for findings where removing or replacing a single stale documentation line is a plausible next edit. It does not apply patches automatically, and unpatchable findings still keep their normal `suggestedEdit` text in Markdown, JSON, and SARIF reports.

## Changed-Only Scans

`--changed-only` reads Markdown paths from `git status` and scans only those changed docs. Repository fact extraction still runs across the full repository, so changed docs in a monorepo can still be compared against package scripts, routes, env vars, and workflow facts outside the changed file set.

Combine it with `--docs` to limit the changed-doc scan to a known docs surface:

```bash
docs-debt-radar scan . --changed-only --docs README.md docs/
```

Use `--changed-since <ref>` for pull request and monorepo workflows where the changed docs should come from a base ref instead of the working tree:

```bash
docs-debt-radar scan . --changed-since origin/main
docs-debt-radar scan . --changed-since origin/main --docs packages/app-a docs/
```

## External Link Checks

External URL checks are opt-in so normal local scans stay offline:

```bash
docs-debt-radar scan . --check-external-links
```

The check reports unsuccessful HTTP statuses or request failures as low-severity `external-link-unreachable` findings. External sites can rate-limit, block, or temporarily fail automated checks, so suppress known exceptions with reasons instead of enabling this as a hard CI gate on day one.
