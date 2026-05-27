# Contributing

Docs Debt Radar is early-stage. Contributions should keep the scanner precise, evidence-backed, and easy to trust.

## Local Setup

```bash
pnpm install
pnpm test
```

## Development Expectations

- Add or update fixtures before changing scanner behavior.
- Prefer high-confidence findings over broad speculative matching.
- Include document path, line number, severity, and evidence in every finding.
- Keep rule behavior documented when adding new rules.
- Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` before submitting changes.

## Commit Scope

Keep commits focused by product lane:

- `core`: models, extraction, rules, reports.
- `cli`: command surface and local output.
- `action`: GitHub Action wrapper.
- `docs`: README, examples, rule docs.
- `fixtures`: sample repositories and expected reports.
