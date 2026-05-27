# Laravel Example

Docs Debt Radar detects route facts from Laravel route files with literal `Route::` declarations and literal prefix groups.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/admin`, but the Laravel app defines `/health` and `/api/users`.
- `missing-referenced-file`: docs link to `docs/api.md`, but the file is absent.
- `documented-env-var-not-used`: docs require `LEGACY_API_TOKEN`, but scanned source does not reference it.

## Supported Patterns

The route extractor handles literal declarations such as:

```php
Route::get('/health', [HealthController::class, 'show']);

Route::prefix('/api')->group(function () {
    Route::post('/users', [UserController::class, 'store']);
});
```

Dynamic route registration, resource expansion, computed prefixes, and package-provided routes should use suppressions with reasons until a dedicated extractor can prove them safely.
