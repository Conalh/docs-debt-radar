# Docs Debt Radar

**A documentation truth layer for fast-moving repos.** README claims, setup docs, workflow snippets, route mentions, env vars, and screenshot links are turned into evidence-backed findings when they drift away from the code.

```text
README / docs ──► claims ─┐
package.json  ──► facts   ├──► rules ──► CLI report / GitHub Action / viewer
routes, envs  ──► facts   ┘
```

Ships as a local TypeScript CLI, a composite GitHub Action, and an optional static report viewer. No network access is needed for local scans, and the default Action posture is report-only.

## Why This Exists

Docs rot because they make claims:

- run this script
- open this route
- set this env var
- see this file
- trust this screenshot
- follow this workflow

When those claims go stale, users lose time and coding agents follow bad instructions. Docs Debt Radar treats documentation as a checkable surface. Every finding points back to the exact document line, the current repository fact, the rule that connected them, and the next edit to make.

The bias is conservative: fewer findings with stronger evidence beats noisy linting.

## Quick Start

```bash
pnpm install
pnpm build
docs-debt-radar scan . --format markdown
```

Write a report and fail only on high-severity visible findings:

```bash
docs-debt-radar scan . --format markdown --write-report docs-debt-report.md --fail-on high
```

Use it in GitHub Actions:

```yaml
- uses: actions/checkout@v4
- uses: conalh/docs-debt-radar@v1
  with:
    fail-on: high
```

Opt in to pull request comments when you want the summary on the PR itself:

```yaml
permissions:
  contents: read
  pull-requests: write

- uses: conalh/docs-debt-radar@v1
  with:
    pr-comment: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Demo

Before:

```markdown
Run `npm run test:e2e` before opening a pull request.

See [missing CLI reference](docs/cli.md).
```

The fixture package only defines `dev` and `test`, and `docs/cli.md` does not exist.

After:

```text
HIGH README.md:7 missing-package-script
README.md says to run `npm run test:e2e`, but package.json does not define it.

MEDIUM README.md:10 missing-referenced-file
README.md links to `docs/cli.md`, but that file is not present.
```

Generated reports:

- [Markdown sample report](docs/demo/basic-node-drift-report.md)
- [JSON sample report](docs/demo/basic-node-drift-report.json)

Reproduce it:

```bash
docs-debt-radar scan tests/fixtures/basic-node-drift --format markdown
```

## The Evidence Model

Four records drive the scanner:

| Record         | What it captures                                        | Example                       |
| -------------- | ------------------------------------------------------- | ----------------------------- |
| `DocumentFile` | Markdown text, headings, links, code spans, code blocks | `README.md`                   |
| `Claim`        | Checkable doc statement with line number                | `npm run test:e2e`            |
| `CodeFact`     | Current repository truth                                | package scripts `dev`, `test` |
| `Finding`      | Claim/fact mismatch with severity and suggested edit    | missing package script        |

Modeling choices worth flagging:

- Claims keep raw text and normalized values so reports can quote the doc and still compare stable keys.
- Facts are deliberately boring: file existence, package scripts, env declarations, routes, workflows, anchors.
- Findings carry false-positive notes because suppression should be a conscious decision, not a hidden ignore.
- Suppressed findings are counted and listed separately in JSON so teams can see what they are choosing not to fix.

## The Rule Layer

Rules-based, not semantic guesswork. Current rules:

```text
missing-referenced-file              docs link to a path that is absent
missing-package-script               docs mention a package script that is absent
env-var-not-documented               source reads an env var docs do not mention
documented-env-var-not-used          docs mention an env var source does not read
stale-route-mention                  docs mention a route not found by supported extractors
broken-markdown-anchor               docs link to a missing heading anchor
missing-screenshot                   docs reference an image path that is absent
external-link-unreachable            opted-in external link check returns a failure
workflow-references-missing-script   workflow runs a package script that is absent
```

Inspect the live rule metadata:

```bash
docs-debt-radar list-rules
docs-debt-radar explain missing-package-script
```

Rule docs live in [docs/product/rules.md](docs/product/rules.md).

## CLI

```bash
docs-debt-radar scan . --format text
docs-debt-radar scan . --format markdown
docs-debt-radar scan . --format json
docs-debt-radar scan . --format sarif
docs-debt-radar scan . --format patch
docs-debt-radar scan . --format agent
docs-debt-radar scan . --docs README.md docs/setup.md
docs-debt-radar scan . --changed-only
docs-debt-radar scan . --changed-since origin/main
docs-debt-radar scan . --check-external-links
docs-debt-radar scan . --fail-on high
```

Exit codes:

- `0`: scan completed and no visible finding met the fail threshold.
- `1`: scan completed and at least one visible finding met the fail threshold.
- `2`: invalid command, option, output format, changed-file lookup, or runtime/config error.

Use `--format sarif` when you want a code-scanning compatible report with finding locations, rule metadata, and suggested edits.
Use `--format patch` when you want conservative unified-diff suggestions for patchable single-line documentation findings. These patches are suggestions only; the scanner does not modify files.
Use `--format agent` when you want a compact Markdown handoff that tells coding agents which stale instructions to avoid before following repo docs.
Use `--changed-only` to scan only Markdown docs reported by `git status`, while still comparing them against facts from the whole repository.
Use `--changed-since <ref>` to scan Markdown docs changed since a base ref, which is useful for pull requests and monorepos.
Use `--check-external-links` when you explicitly want network checks for external Markdown links.

Archived docs under `docs/archive/**`, `docs/archives/**`, and changelog files still report drift, but as `info` findings so historical notes do not look like active setup breakage.

## Suppressions

Known exceptions require reasons:

```markdown
<!-- docs-debt-disable-next-line missing-referenced-file: generated by release packaging -->

See [generated docs](docs/generated.md).
```

Config suppressions live in `.docs-debt-radar.json`; see [Configuration](docs/product/configuration.md) and [Suppressions](docs/product/suppressions.md).

## Report Viewer

```bash
pnpm --filter @docs-debt-radar/web build
```

Open `apps/web/index.html` and load a JSON report. The viewer is optional; the CLI and Action remain complete without it.

## Examples

- [Node package](docs/examples/node.md)
- [Next.js](docs/examples/nextjs.md)
- [FastAPI](docs/examples/fastapi.md)
- [Express](docs/examples/express.md)
- [GitHub Actions workflow](docs/examples/github-actions.md)
- [Release readiness](docs/product/release-readiness.md)

## Development

```bash
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:action
pnpm pack:dry-run
pnpm smoke:packed
pnpm release:check
```

Project layout:

```text
apps/action    GitHub Action wrapper
apps/cli       Node CLI
apps/web       Optional static report viewer
packages/core  Scanner models, extractors, rules, and reports
```

## Status

Prototype / early alpha. The CLI, Action wrapper, suppressions, V1 rules, fixtures, sample reports, static viewer, package surface audit, and packed CLI smoke exist. Remote Action validation and npm publishing are still future work.

## License

MIT.
