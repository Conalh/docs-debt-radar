import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type FailOn = "none" | "info" | "low" | "medium" | "high";
type ReportFormat = "markdown" | "json";

export interface ActionInputs {
  scanPath: string;
  failOn: FailOn;
  reportFormat: ReportFormat;
  docsPaths: string[];
  changedOnly: boolean;
  reportPath: string;
  artifactName: string;
}

export interface ActionScanReport {
  summaryJson: {
    totalFindings: number;
    bySeverity: {
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    suppressedFindingCount: number;
    warningCount: number;
    scannedDocumentCount: number;
    claimCount: number;
    factCount: number;
  };
  findingsJson: Array<{
    ruleId: string;
    severity: string;
    title: string;
    documentPath: string;
    documentLine: number;
  }>;
  markdown: string;
}

export function normalizeInputs(env: Record<string, string | undefined>): ActionInputs {
  return {
    scanPath: readInput(env, "path", "."),
    failOn: normalizeFailOn(readInput(env, "fail-on", "none")),
    reportFormat: normalizeReportFormat(readInput(env, "report-format", "markdown")),
    docsPaths: splitInputList(readInput(env, "docs", "")),
    changedOnly: readInput(env, "changed-only", "false").toLowerCase() === "true",
    reportPath: readInput(env, "report-path", "docs-debt-report.md"),
    artifactName: readInput(env, "artifact-name", "docs-debt-report")
  };
}

export function buildCliArgs(input: ActionInputs): string[] | Error {
  return [
    "scan",
    input.scanPath,
    "--format",
    "json",
    "--fail-on",
    input.failOn,
    ...(input.changedOnly ? ["--changed-only"] : []),
    ...(input.docsPaths.length > 0 ? ["--docs", ...input.docsPaths] : [])
  ];
}

export function renderReportArtifact(report: ActionScanReport, format: ReportFormat): string {
  if (format === "json") {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  return report.markdown;
}

export function renderJobSummary(report: ActionScanReport): string {
  const summary = report.summaryJson;
  const topFindings = report.findingsJson.slice(0, 10);

  return [
    "# Docs Debt Radar",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Total findings | ${summary.totalFindings} |`,
    `| High | ${summary.bySeverity.high} |`,
    `| Medium | ${summary.bySeverity.medium} |`,
    `| Low | ${summary.bySeverity.low} |`,
    `| Info | ${summary.bySeverity.info} |`,
    `| Suppressed | ${summary.suppressedFindingCount} |`,
    `| Warnings | ${summary.warningCount} |`,
    "",
    topFindings.length === 0 ? "No visible findings." : "## Top Findings",
    "",
    ...topFindings.map(
      (finding) =>
        `- **${finding.severity.toUpperCase()}** ${finding.documentPath}:${finding.documentLine} ${finding.title} (${finding.ruleId})`
    ),
    ""
  ].join("\n");
}

export function runAction(env: Record<string, string | undefined> = process.env): number {
  const inputs = normalizeInputs(env);
  const args = buildCliArgs(inputs);
  if (args instanceof Error) {
    process.stderr.write(`${args.message}\n`);
    writeOutput(env, "exit-code", "2");
    return 2;
  }

  const workspace = env.GITHUB_WORKSPACE ?? process.cwd();
  const actionPath = env.GITHUB_ACTION_PATH ?? workspace;
  const cliPath = env.DOCS_DEBT_RADAR_CLI_PATH ?? join(actionPath, "apps/cli/dist/index.js");
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspace,
    encoding: "utf8"
  });
  const exitCode = result.status ?? 2;

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  let report: ActionScanReport;
  try {
    report = JSON.parse(result.stdout) as ActionScanReport;
  } catch (error) {
    process.stderr.write(
      `Unable to parse docs-debt-radar JSON output: ${error instanceof Error ? error.message : "unknown error"}\n`
    );
    writeOutput(env, "exit-code", "2");
    return 2;
  }

  writeReport(inputs.reportPath, renderReportArtifact(report, inputs.reportFormat));
  appendSummary(env, renderJobSummary(report));
  writeOutput(env, "exit-code", exitCode.toString());
  writeOutput(env, "report-path", inputs.reportPath);
  writeOutput(env, "total-findings", report.summaryJson.totalFindings.toString());
  writeOutput(env, "suppressed-findings", report.summaryJson.suppressedFindingCount.toString());

  return exitCode;
}

function readInput(
  env: Record<string, string | undefined>,
  name: string,
  fallback: string
): string {
  return env[`INPUT_${name.toUpperCase().replaceAll("-", "_")}`]?.trim() || fallback;
}

function normalizeFailOn(raw: string): FailOn {
  return ["none", "info", "low", "medium", "high"].includes(raw) ? (raw as FailOn) : "none";
}

function normalizeReportFormat(raw: string): ReportFormat {
  return raw === "json" ? "json" : "markdown";
}

function splitInputList(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function writeReport(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function appendSummary(env: Record<string, string | undefined>, content: string): void {
  if (!env.GITHUB_STEP_SUMMARY) {
    return;
  }

  appendFileSync(env.GITHUB_STEP_SUMMARY, content, "utf8");
}

function writeOutput(env: Record<string, string | undefined>, name: string, value: string): void {
  if (!env.GITHUB_OUTPUT) {
    return;
  }

  appendFileSync(env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
}

if (process.argv[1]?.endsWith("index.js")) {
  process.exitCode = runAction();
}
