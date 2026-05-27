# Hono Example

Docs Debt Radar detects route facts from common Hono app calls with literal paths and literal mounted app prefixes.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/admin`, but the Hono app defines `/health` and `/api/users`.
- `missing-package-script`: docs mention `npm run dev`, but `package.json` does not define it.
- `missing-referenced-file`: docs link to `docs/api.md`, but the file is absent.

## Supported Patterns

The route extractor handles literal calls such as:

```ts
const app = new Hono();
const api = new Hono();

app.get("/health", handler);
api.post("/users", handler);
app.route("/api", api);
```

Dynamic route generation, chained route builders, and computed prefixes should use suppressions with reasons until a dedicated extractor can prove them safely.
