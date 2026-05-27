# FastAPI Example

Docs Debt Radar detects route facts from common FastAPI app and `APIRouter` decorator patterns.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/v1/search`, but the FastAPI app defines `/health` and router-defined routes such as `/api/users`.
- `env-var-not-documented`: source reads `STRIPE_API_KEY`, but setup docs omit it.
- `documented-env-var-not-used`: docs require `LEGACY_API_TOKEN`, but scanned source does not reference it.

## Supported Patterns

The route extractor handles literal decorators such as:

```python
@app.get("/health")
@router.get("/api/users")
```

## Suggested Adoption

Start in report-only mode:

```bash
docs-debt-radar scan . --format markdown --fail-on none
```

Once current docs are cleaned up, raise the threshold to `high` for setup-critical drift.
