# Django Example

Docs Debt Radar detects route facts from common Django URL config files with literal `path()` entries.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/admin/`, but the Django URL config defines `/health/` and `/api/users/`.
- `missing-referenced-file`: docs link to `docs/api.md`, but the file is absent.
- `documented-env-var-not-used`: setup docs mention `DJANGO_DEBUG`, but source never reads it.

## Supported Patterns

The route extractor handles literal URL patterns such as:

```python
urlpatterns = [
    path("health/", views.health, name="health"),
    path("api/users/", views.users, name="users"),
]
```

Generated URL patterns, `include()` expansion, and regex routes should use suppressions with reasons until a dedicated extractor can prove them safely.
