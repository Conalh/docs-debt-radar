# Symfony Example

Docs Debt Radar detects route facts from Symfony controller attributes with literal `#[Route(...)]` declarations and literal class-level prefixes.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/admin`, but the Symfony app defines `/health` and `/api/users`.
- `missing-referenced-file`: docs link to `docs/api.md`, but the file is absent.
- `documented-env-var-not-used`: docs require `LEGACY_API_TOKEN`, but scanned source does not reference it.

## Supported Patterns

The route extractor handles literal attributes such as:

```php
#[Route('/health', methods: ['GET'])]
public function show(): Response {}

#[Route('/api')]
final class UserController
{
    #[Route('/users', methods: ['POST'])]
    public function store(): Response {}
}
```

Dynamic route registration, YAML/XML route config, annotation comments, computed prefixes, and package-provided routes should use suppressions with reasons until a dedicated extractor can prove them safely.
