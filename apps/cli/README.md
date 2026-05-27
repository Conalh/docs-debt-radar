# @docs-debt-radar/cli

Command-line scanner for Docs Debt Radar.

## Install

```bash
npm install -D @docs-debt-radar/cli
```

## Use

```bash
npx docs-debt-radar scan . --format markdown
npx docs-debt-radar scan . --changed-since origin/main
npx docs-debt-radar scan . --format patch
npx docs-debt-radar scan . --format agent
npx docs-debt-radar list-rules
npx docs-debt-radar explain missing-package-script
```

## Runtime

- Node.js 22 or newer.
- Windows, Linux, and macOS are supported through Node's filesystem APIs.
- Local scans do not require network access.
