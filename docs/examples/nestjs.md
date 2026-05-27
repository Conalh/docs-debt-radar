# NestJS Example

Docs Debt Radar detects route facts from common NestJS controller and method decorators with literal paths.

## Scan

```bash
docs-debt-radar scan . --format markdown
```

## Common Findings

- `stale-route-mention`: docs mention `/admin`, but the NestJS app defines `/health` and `/api/users`.
- `missing-package-script`: docs mention `npm run start:dev`, but `package.json` does not define it.
- `missing-referenced-file`: docs link to `docs/api.md`, but the file is absent.

## Supported Patterns

The route extractor handles literal decorators such as:

```ts
@Controller()
export class HealthController {
  @Get("health")
  health() {}
}

@Controller("api")
export class UsersController {
  @Post("users")
  createUser() {}
}
```

Dynamic controller prefixes, generated modules, and custom decorators should use suppressions with reasons until a dedicated extractor can prove them safely.
