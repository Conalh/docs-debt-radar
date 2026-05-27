# Repository Fact Extraction

Goal 4 adds the scanner side that reads the current repository state and emits facts that later rules can compare against documentation claims.

## Extracted Fact Types

`scanRepositoryFacts` currently emits:

- `file_exists` for files and directories in the repository tree.
- `config_key` for Markdown heading anchors.
- `package_script` for scripts in `package.json` files.
- `env_var_declared` for `.env.example` entries and source references.
- `route_exists` for Next.js App Router and Pages Router routes, FastAPI app/router decorators, Flask decorators and literal blueprint prefixes, Django URL patterns, literal Express route and mounted router calls, NestJS controller decorators, Hono route calls, Koa Router calls, Rails route declarations, Laravel route declarations, and Symfony route attributes.
- `workflow_exists` for GitHub Actions workflow names.
- `command_surface` for GitHub Actions `run:` commands.

## Source Coverage

The extractor intentionally stays local and conservative:

- It does not execute commands.
- It does not import application code.
- It ignores `.git`, `node_modules`, `dist`, and `coverage`.
- It scans common source extensions for env references.
- It uses simple App Router and Pages Router file conventions for Next.js, decorator patterns for FastAPI apps and routers, Flask decorators with literal `url_prefix` blueprint support, literal Django `path("route/")` URL patterns, literal `app.get("/path")` / mounted `express.Router()` patterns for Express, literal NestJS `@Controller()` / method decorator pairs, literal Hono app route calls, literal Koa Router route calls, literal Rails route declarations, literal Laravel `Route::` declarations, and literal Symfony `#[Route(...)]` attributes.

## CLI Smoke

```bash
docs-debt-radar scan tests/fixtures/github-actions-drift --facts --format json
```

The output includes full `CodeFact` records with IDs, source paths, line numbers, and metadata.
