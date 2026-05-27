# Rules Engine

Goal 5 connects Markdown claims to repository facts and emits evidence-backed findings.

## Scan Orchestration

`scanDocsDebt` runs the current local pipeline:

1. Parse Markdown documents.
2. Extract checkable documentation claims.
3. Extract repository facts.
4. Run V1 rules.
5. Assemble a `ScanReport` with JSON data and Markdown output.

The CLI default scan path now uses this orchestration:

```bash
docs-debt-radar scan tests/fixtures/basic-node-drift --format json
```

## V1 Rules

Implemented rules:

- `missing-referenced-file`
- `missing-package-script`
- `env-var-not-documented`
- `documented-env-var-not-used`
- `stale-route-mention`
- `broken-markdown-anchor`
- `missing-screenshot`
- `workflow-references-missing-script`

## Evidence Contract

Every finding includes:

- Rule ID.
- Severity.
- Title.
- Document path and line.
- Claim evidence.
- Current fact evidence.
- Suggested edit.
- False-positive note.

The fixture expected reports are the acceptance contract for this goal.
