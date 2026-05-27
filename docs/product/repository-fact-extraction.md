# Repository Fact Extraction

Goal 4 adds the scanner side that reads the current repository state and emits facts that later rules can compare against documentation claims.

## Extracted Fact Types

`scanRepositoryFacts` currently emits:

- `file_exists` for files and directories in the repository tree.
- `config_key` for Markdown heading anchors.
- `package_script` for scripts in `package.json` files.
- `env_var_declared` for `.env.example` entries and source references.
- `route_exists` for Next.js App Router and Pages Router routes, FastAPI app/router decorators, Flask decorators and literal blueprint prefixes, Django URL patterns, and literal Express route calls.
- `workflow_exists` for GitHub Actions workflow names.
- `command_surface` for GitHub Actions `run:` commands.

## Source Coverage

The extractor intentionally stays local and conservative:

- It does not execute commands.
- It does not import application code.
- It ignores `.git`, `node_modules`, `dist`, and `coverage`.
- It scans common source extensions for env references.
- It uses simple App Router and Pages Router file conventions for Next.js, decorator patterns for FastAPI apps and routers, Flask decorators with literal `url_prefix` blueprint support, literal Django `path("route/")` URL patterns, and literal `app.get("/path")` / `router.post("/path")` patterns for Express.

## CLI Smoke

```bash
docs-debt-radar scan tests/fixtures/github-actions-drift --facts --format json
```

The output includes full `CodeFact` records with IDs, source paths, line numbers, and metadata.
