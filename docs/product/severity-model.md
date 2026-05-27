# Severity Model

Docs Debt Radar severity is based on how likely a stale documentation claim is to block a user, contributor, or automation workflow.

## High

Use `high` when the documented claim is setup-critical, CI-critical, release-critical, or likely to stop a user from completing the main product loop.

Examples:

- README tells users to run a package script that does not exist.
- Workflow runs a package script or file that does not exist.
- Source requires an auth, database, token, or payment env var that is not documented.
- Setup docs reference a required file that is missing.

## Medium

Use `medium` when the claim is important and likely stale, but the user still has a reasonable path to continue.

Examples:

- Docs mention an app route that cannot be found.
- Markdown links to a missing anchor.
- README references a missing screenshot or image.
- Non-critical docs reference a missing source file.

## Low

Use `low` when the claim is probably drift but has plausible benign explanations.

Examples:

- Docs mention an env var that source no longer references.
- Historical docs mention a file path that may be archive-only.
- A deeper docs page references an optional image that is missing.

## Info

Use `info` for observations that help maintainers improve docs but should not be treated as failures.

Examples:

- A rule skipped a framework it does not support yet.
- A file was skipped because it exceeded the configured size cap.
- A suppression was applied with a reason.

## Default Threshold Guidance

- Local CLI default: report all severities without failing.
- GitHub Action default: report-only.
- Recommended CI fail threshold for early adopters: `high`.
- Recommended mature-project threshold: `medium` only after suppressions are reviewed.
