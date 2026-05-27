# Express Example

Docs Debt Radar detects route facts from common Express app and router calls with literal paths.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/admin`, but the Express app defines `/health` and `/api/users`.
- `missing-package-script`: docs mention `npm run dev`, but `package.json` does not define it.
- `missing-referenced-file`: docs link to `docs/api.md`, but the file is absent.

## Supported Patterns

The route extractor handles literal calls such as:

```js
app.get("/health", handler);
router.post("/api/users", handler);
```

Dynamic route registration and middleware-generated routes should use suppressions with reasons until a dedicated extractor can prove them safely.
