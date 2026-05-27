# Rails Example

Docs Debt Radar detects route facts from Rails `config/routes.rb` files with literal route declarations and literal `scope` prefixes.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/admin`, but the Rails app defines `/health` and `/api/users`.
- `missing-referenced-file`: docs link to `docs/api.md`, but the file is absent.
- `missing-screenshot`: docs reference `docs/screenshots/setup.png`, but the image is absent.

## Supported Patterns

The route extractor handles literal declarations such as:

```rb
Rails.application.routes.draw do
  get "/health", to: "health#show"

  scope "/api" do
    post "/users", to: "users#create"
  end
end
```

Dynamic route generation, mounted engines, resource expansion, and computed scopes should use suppressions with reasons until a dedicated extractor can prove them safely.
