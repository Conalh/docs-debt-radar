# Release Readiness

Goal 11 turns Docs Debt Radar from a local workspace into a packageable project.

## Compatibility

- Node.js 22 or newer is the supported runtime for the CLI and core package.
- pnpm 11.3.0 is the workspace package manager.
- Windows is validated locally.
- Linux is validated through CI on `ubuntu-latest`.
- macOS is expected to work through Node's filesystem APIs, but it is not yet covered by CI.

## Package Contents

Run the package surface audit before publishing:

```bash
pnpm pack:dry-run
```

The audit builds the workspace and runs `npm pack --dry-run` through pnpm for:

- `@docs-debt-radar/core`
- `@docs-debt-radar/cli`

The tarballs should contain only `package.json`, `README.md`, `LICENSE`, and `dist/` output.
Source files, tests, TypeScript configs, and `.tsbuildinfo` files should not be published.

## Clean Machine Smoke

Run the packed CLI smoke before cutting a release:

```bash
pnpm smoke:packed
```

The smoke script builds both publishable packages, creates tarballs, installs them into a clean machine-style temporary npm project, and runs the installed `docs-debt-radar` bin against the basic fixture.

## SARIF Output

Post-V1 scans can emit SARIF 2.1.0 for code-scanning compatible consumers:

```bash
docs-debt-radar scan . --format sarif --write-report docs-debt-radar.sarif
```

SARIF output keeps docs debt as documentation findings, not security findings. High severity maps to SARIF `error`, medium maps to `warning`, and low/info map to `note`.

## Release Checklist

Run the release gate before tagging:

```bash
pnpm release:check
```

The release gate verifies package versions, the changelog section, a clean tracked worktree, formatting, linting, typechecking, tests, build output, package contents, and the packed CLI smoke.

1. Update all package versions to the target semver.
2. Update `CHANGELOG.md` with a matching `## <version>` section.
3. Run `pnpm release:check`.
4. Create a signed release tag such as `v0.1.0`.
5. Push the tag and let the Release workflow re-run `pnpm release:check`.
6. Publish `@docs-debt-radar/core` before `@docs-debt-radar/cli`.

Do not publish until a real npm token and release remote are configured.

## GitHub Action Pin

Workflow examples should pin the composite Action to a stable release tag:

```yaml
- uses: conalh/docs-debt-radar@v1
  with:
    fail-on: high
```
