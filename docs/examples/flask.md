# Flask Example

Docs Debt Radar detects route facts from common Flask app and blueprint decorators with literal paths and literal blueprint prefixes.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/admin`, but the Flask app defines `/health` and `/api/users`.
- `env-var-not-documented`: source reads `DATABASE_URL`, but setup docs omit it.
- `missing-referenced-file`: docs link to `docs/api.md`, but the file is absent.

## Supported Patterns

The route extractor handles literal decorators such as:

```python
@app.route("/health")
api = Blueprint("api", __name__, url_prefix="/api")
@api.route("/users", methods=["POST"])
```

Dynamic route registration and generated blueprints should use suppressions with reasons until a dedicated extractor can prove them safely.
