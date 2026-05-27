# V1 Scope

V1 should prove that documentation drift can be detected with local, evidence-backed checks. It should not try to understand every prose claim or run arbitrary project commands.

## Included

- Markdown scanning.
- Internal Markdown link validation.
- Referenced file validation.
- Referenced image validation.
- Package script validation for common `npm`, `pnpm`, and `yarn` command forms.
- Env var comparison between docs, env examples, and source references.
- GitHub Actions workflow command checks for referenced package scripts and files.
- Route mention validation for Next.js App Router, Next.js Pages Router, and FastAPI conventions.
- Text, Markdown, and JSON reports.
- CLI exit codes.
- GitHub Action report mode and explicit fail thresholds.

## Excluded

- Running arbitrary commands from docs or workflows.
- Rewriting docs automatically.
- External link crawling by default.
- Business-domain truth checks.
- Full natural-language understanding of all prose.
- Private hosted dashboards.
- Multi-repo organization scanning.
- Semantic screenshot validation.
- Authentication to third-party services.

## Rule Readiness Standard

A V1 rule is ready only when it has:

- At least one failing fixture.
- At least one passing fixture.
- A severity decision.
- Evidence fields that explain the documented claim and current repository fact.
- A suggested action that does not require automatic rewriting.
- A known false-positive note in rule documentation.

## Fixture Coverage

The initial fixture set covers:

- Basic Node package drift.
- Next.js route drift.
- FastAPI route and env drift.
- GitHub Actions workflow script drift.
- Documentation asset, anchor, and env-var drift.

Future fixtures should be added before broadening scanner behavior.
