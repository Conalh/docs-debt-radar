# Docs Debt Report

Suppressed findings: 0

## HIGH: Documented package script does not exist

README.md:7

Claim: README.md says to run `npm run test:e2e`.
Current fact: package.json defines scripts `dev` and `test`, but not `test:e2e`.

Suggested edit: Update the README command or add a `test:e2e` script to package.json.

## MEDIUM: Documented relative file path does not exist

README.md:10

Claim: README.md links to `docs/cli.md`.
Current fact: `docs/cli.md` is not present in the fixture file tree.

Suggested edit: Create docs/cli.md or remove the stale link from README.md.
