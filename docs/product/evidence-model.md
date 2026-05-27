# Evidence Model

The core evidence model is the shared contract between claim extraction, fact extraction, rules, reports, the CLI, the GitHub Action, and the optional viewer.

## Records

- `ScanConfig`: Normalized scanner inputs such as root, docs globs, ignores, changed-only mode, output format, fail threshold, and max file size.
- `DocumentFile`: Parsed documentation file with headings, links, fenced code blocks, and inline code.
- `Claim`: A checkable documentation claim with document path, line number, kind, raw text, normalized value, context, and confidence.
- `CodeFact`: A repository fact with kind, value, source path, line number, and structured metadata.
- `Finding`: A rule result that connects one claim to zero or more related facts and includes severity, suggested edit, and false-positive note.
- `ScannerWarning`: A non-finding scanner issue such as skipped files, unreadable files, unsupported frameworks, or isolated rule errors.
- `ScanReport`: Serializable report containing scan metadata, config, summary, documents, claims, facts, findings, warnings, and Markdown output.

## Stable IDs

IDs are deterministic and generated from semantic identity fields:

- Claims: document path, line number, kind, normalized value.
- Facts: kind, value, source path, line number.
- Findings: rule ID, claim ID, related fact IDs.
- Warnings: kind, path, line number, message.
- Reports: repo root, scan timestamp, scanner version.

This lets tests compare reports without relying on object identity or creation order.

## Source Locations

Line numbers are one-based. Column numbers are optional because not every parser provides useful column positions. Rules should preserve the most user-actionable location, usually the line containing the documented claim.

## Confidence

Claim confidence describes extraction confidence, not rule severity:

- `high`: The claim came from explicit syntax or a strongly bounded pattern such as a Markdown link or inline command.
- `medium`: The claim came from a conservative prose pattern with clear context.
- `low`: The claim is plausible but should usually produce low-severity or informational output unless corroborated by stronger evidence.

## Summaries

`ScanSummary` is derived from report contents. It counts findings by severity, warnings, scanned documents, claims, and facts. Summary values should not be hand-maintained by callers.

## Warning Policy

Scanner warnings are for incomplete scan coverage, not docs drift. They should not fail CI by themselves in V1, but they must appear in reports so users know when evidence may be incomplete.
