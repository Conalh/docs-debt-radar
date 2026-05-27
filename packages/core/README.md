# @docs-debt-radar/core

Core scanner package for Docs Debt Radar. It extracts checkable documentation claims, extracts repository facts, applies the V1 rules, and renders evidence-backed docs debt reports.

## Install

```bash
npm install @docs-debt-radar/core
```

## Runtime

- Node.js 22 or newer.
- No network access is required while scanning a local repository.

## API

The public entrypoint is `./dist/index.js` with TypeScript declarations in `./dist/index.d.ts`.
