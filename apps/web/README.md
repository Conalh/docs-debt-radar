# Docs Debt Radar Report Viewer

This optional static viewer opens JSON reports produced by the CLI or GitHub Action.

## Local Use

Build the viewer:

```bash
pnpm --filter @docs-debt-radar/web build
```

Open `apps/web/index.html` in a browser and choose a JSON report, or load the checked-in sample report.

The viewer provides:

- Summary cards.
- Severity and text filters.
- Finding list.
- Finding details with claim/current fact/suggested edit sections.
- Markdown and JSON export links.

The CLI and GitHub Action remain fully useful without this viewer.
