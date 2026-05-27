#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

import {
  type FailThreshold,
  type Finding,
  type ScanReport,
  type Severity,
  V1_RULES,
  scanDocsDebt,
  scanMarkdownClaims,
  scanRepositoryFacts
} from "@docs-debt-radar/core";

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
    "  --docs <path...>                    Restrict Markdown docs scanned for claims",
    "  --fail-on <none|info|low|medium|high> Exit with code 1 at or above this severity",
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

  if (command === "list-rules") {
    return {
      exitCode: 0,
      stdout: `${V1_RULES.map((rule) => `${rule.id}\t${rule.severity}\t${rule.title}`).join("\n")}\n`,
      stderr: ""
    };
  }

  if (command === "explain") {
    const ruleId = targetPath;
    const rule = V1_RULES.find((candidate) => candidate.id === ruleId);

    if (!rule) {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `Unknown rule: ${ruleId ?? ""}\n`
      };
    }

    return {
      exitCode: 0,
      stdout: [
        `# ${rule.id}`,
        "",
        rule.title,
        "",
        `Default severity: ${rule.severity}`,
        "",
        rule.description,
        "",
        `False-positive note: ${rule.falsePositiveNote}`,
        ""
      ].join("\n"),
      stderr: ""
    };
  }

  if (command !== "scan" || !targetPath) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `${createCliHelp()}\n`
    };
  }

  const format = readOption(args, "--format") ?? "text";
  const failOn = readFailThreshold(args);
  if (failOn instanceof Error) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `${failOn.message}\n`
    };
  }

  const writeReportPath = readOption(args, "--write-report");
  const docsPaths = readOptionValues(args, "--docs");
  const claimsOnly = args.includes("--claims");
  const factsOnly = args.includes("--facts");

  const result = claimsOnly
    ? await scanMarkdownClaims({ root: targetPath, docsPaths })
    : factsOnly
      ? await scanRepositoryFacts({ root: targetPath })
      : await scanDocsDebt({ root: targetPath, docsPaths });

  const rendered = renderResult(result, format);
  if (rendered instanceof Error) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `${rendered.message}\n`
    };
  }

  if (writeReportPath) {
    await writeFile(writeReportPath, rendered, "utf8");
  }

  return {
    exitCode: "findingsJson" in result && reachesFailThreshold(result.findingsJson, failOn) ? 1 : 0,
    stdout: rendered,
    stderr: ""
  };
}

function renderResult(
  result:
    | Awaited<ReturnType<typeof scanMarkdownClaims>>
    | Awaited<ReturnType<typeof scanRepositoryFacts>>
    | ScanReport,
  format: string
): string | Error {
  if (format === "json") {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  if (format === "markdown") {
    if ("findingsJson" in result) {
      return result.markdown;
    }

    return new Error("Markdown output is only supported for full scan reports.");
  }

  if (format !== "text") {
    return new Error(`Unsupported output format: ${format}`);
  }

  if ("facts" in result) {
    return result.facts
      .map((fact) => `${fact.sourcePath}:${fact.lineNumber} ${fact.kind} ${fact.value}`)
      .join("\n")
      .concat(result.facts.length > 0 ? "\n" : "");
  }

  if ("findingsJson" in result) {
    return result.findingsJson
      .map(
        (finding) =>
          `${finding.documentPath}:${finding.documentLine} ${finding.severity} ${finding.ruleId} ${finding.title}`
      )
      .join("\n")
      .concat(result.findingsJson.length > 0 ? "\n" : "");
  }

  return result.claims
    .map(
      (claim) => `${claim.documentPath}:${claim.lineNumber} ${claim.kind} ${claim.normalizedValue}`
    )
    .join("\n")
    .concat(result.claims.length > 0 ? "\n" : "");
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function readOptionValues(args: string[], name: string): string[] | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  const values: string[] = [];
  for (let cursor = index + 1; cursor < args.length; cursor += 1) {
    if (args[cursor]?.startsWith("--")) {
      break;
    }

    const value = args[cursor];
    if (value !== undefined) {
      values.push(value);
    }
  }

  return values.length === 0 ? undefined : values;
}

function readFailThreshold(args: string[]): FailThreshold | Error {
  const raw = readOption(args, "--fail-on") ?? "none";
  if (["none", "high", "medium", "low", "info"].includes(raw)) {
    return raw as FailThreshold;
  }

  return new Error(`Unsupported fail threshold: ${raw}`);
}

function reachesFailThreshold(findings: readonly Finding[], threshold: FailThreshold): boolean {
  if (threshold === "none") {
    return false;
  }

  const rank: Record<Severity, number> = {
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };

  return findings.some((finding) => rank[finding.severity] >= rank[threshold]);
}

if (process.argv[1]?.endsWith("index.js")) {
  const result = await runCli(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
