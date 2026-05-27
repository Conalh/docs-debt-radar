# Markdown Claim Extraction

Goal 3 establishes the first scanner behavior: parse Markdown files with source positions and extract high-confidence claims.

## Parsed Document Data

`parseMarkdownDocument` records:

- Headings with generated anchors.
- Markdown links.
- Markdown image references.
- Inline code spans.
- Fenced code blocks.
- One-based line numbers from the Markdown parser.

## Extracted Claim Types

`scanMarkdownClaims` currently extracts:

- `file_ref` from relative Markdown links and relative inline code paths.
- `image_ref` from Markdown images.
- `external_url` from absolute URL links.
- `package_script` from inline `npm run`, `pnpm run`, and `yarn run` commands.
- `command` from inline or fenced shell commands.
- `env_var` from inline all-caps env var names.
- `route` from inline route-like values such as `/settings`.

## Intentional Limits

- It does not validate claims yet; fact extraction and rules happen in later goals.
- It keeps prose interpretation conservative and mostly relies on Markdown syntax or inline code.
- Fenced shell commands use the code block start line for now.
- The CLI only exposes the claim-listing scan path for this goal.

## CLI Smoke

```bash
pnpm --filter @docs-debt-radar/cli exec docs-debt-radar scan tests/fixtures/basic-node-drift --claims --format json
```

During development, the callable test helper is `runCli(["scan", "<path>", "--claims", "--format", "json"])`.
