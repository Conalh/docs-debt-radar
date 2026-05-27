#!/usr/bin/env node

import { scanDocsDebt, scanMarkdownClaims, scanRepositoryFacts } from "@docs-debt-radar/core";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function createCliHelp(): string {
  return [
    "Docs Debt Radar",
    "",
    "Usage:",
    "  docs-debt-radar scan <path> [options]",
    "",
    "Options:",
    "  --format <text|markdown|json>       Output format",
    "  --claims                            Print extracted Markdown claims",
    "  --facts                             Print extracted repository facts",
    "  --fail-on <none|low|medium|high>    Exit with code 1 at or above this severity",
    "  --write-report <path>               Write the report to a file",
    "",
    "Commands:",
    "  scan <path>                         Scan docs and repository facts",
    "  list-rules                          List available rules",
    "  explain <rule-id>                   Explain one rule"
  ].join("\n");
}

export async function runCli(args: string[]): Promise<CliResult> {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return {
      exitCode: 0,
      stdout: `${createCliHelp()}\n`,
      stderr: ""
    };
  }

  const [command, targetPath] = args;

  if (command !== "scan" || !targetPath) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `${createCliHelp()}\n`
    };
  }

  const format = readOption(args, "--format") ?? "text";
  const claimsOnly = args.includes("--claims");
  const factsOnly = args.includes("--facts");

  const result = claimsOnly
    ? await scanMarkdownClaims({ root: targetPath })
    : factsOnly
      ? await scanRepositoryFacts({ root: targetPath })
      : await scanDocsDebt({ root: targetPath });

  if (format === "json") {
    return {
      exitCode: 0,
      stdout: `${JSON.stringify(result, null, 2)}\n`,
      stderr: ""
    };
  }

  if (format === "text") {
    if ("facts" in result) {
      return {
        exitCode: 0,
        stdout: result.facts
          .map((fact) => `${fact.sourcePath}:${fact.lineNumber} ${fact.kind} ${fact.value}`)
          .join("\n")
          .concat(result.facts.length > 0 ? "\n" : ""),
        stderr: ""
      };
    }

    if ("findingsJson" in result) {
      return {
        exitCode: 0,
        stdout: result.findingsJson
          .map(
            (finding) =>
              `${finding.documentPath}:${finding.documentLine} ${finding.severity} ${finding.ruleId} ${finding.title}`
          )
          .join("\n")
          .concat(result.findingsJson.length > 0 ? "\n" : ""),
        stderr: ""
      };
    }

    return {
      exitCode: 0,
      stdout: result.claims
        .map(
          (claim) =>
            `${claim.documentPath}:${claim.lineNumber} ${claim.kind} ${claim.normalizedValue}`
        )
        .join("\n")
        .concat(result.claims.length > 0 ? "\n" : ""),
      stderr: ""
    };
  }

  return {
    exitCode: 2,
    stdout: "",
    stderr: `Unsupported claims output format: ${format}\n`
  };
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

if (process.argv[1]?.endsWith("index.js")) {
  const result = await runCli(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
