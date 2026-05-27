# Docs Debt Radar

Docs Debt Radar is a documentation drift scanner. It is designed to find checkable claims in README and docs files, compare those claims against the current repository, and report stale commands, missing files, broken anchors, missing env vars, stale routes, and related docs debt.

## Current Status

This repository is in foundation setup. The first committed surface is a TypeScript workspace with:

- `packages/core` for shared scan models, extractors, rules, and reports.
- `apps/cli` for the local `docs-debt-radar` command.
- `apps/action` reserved for the GitHub Action wrapper.
- `apps/web` reserved for the optional report viewer.

The detailed local planning files, `PLAN.md` and `ROADMAP.md`, are intentionally ignored by git.

## Product Definition

The first V1 behavior is defined by product docs and fixtures:

- [Severity model](docs/product/severity-model.md)
- [V1 scope](docs/product/v1-scope.md)
- [Evidence model](docs/product/evidence-model.md)
- [Markdown claim extraction](docs/product/markdown-claim-extraction.md)
- [Repository fact extraction](docs/product/repository-fact-extraction.md)
- [Rules engine](docs/product/rules-engine.md)
- [Fixture manifest](tests/fixtures/fixture-manifest.json)

The fixture set currently covers a basic Node package, a Next.js app, a FastAPI app, a GitHub Actions workflow, and docs assets/env examples. Each fixture includes an `expected-report.json` file so scanner behavior can be developed against concrete examples.

## Intended Product Loop

```bash
docs-debt-radar scan .
```

Current claim-extraction MVP:

```bash
docs-debt-radar scan tests/fixtures/basic-node-drift --claims --format json
```

Current fact-extraction MVP:

```bash
docs-debt-radar scan tests/fixtures/github-actions-drift --facts --format json
```

Current findings scan:

```bash
docs-debt-radar scan tests/fixtures/basic-node-drift --format json
```

The scanner will:

1. Parse Markdown docs and extract checkable claims.
2. Parse repository files and extract current facts.
3. Compare claims to facts with documented rules.
4. Emit text, Markdown, or JSON findings with evidence and severity.

## Development

Install dependencies:

```bash
pnpm install
```

Run the baseline checks:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

Run only the fixture contract:

```bash
pnpm test -- packages/core/src/fixture-contract.test.ts
```

Build packages:

```bash
pnpm build
```

## Project Layout

```text
apps/
  action/    GitHub Action wrapper placeholder
  cli/       Node CLI package
  web/       Optional report viewer placeholder
packages/
  core/      Shared scanner models and engine
```

## License

License has not been selected yet.
