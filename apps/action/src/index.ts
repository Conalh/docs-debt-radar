import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type FailOn = "none" | "info" | "low" | "medium" | "high";
type ReportFormat = "markdown" | "json";

export interface ActionInputs {
  scanPath: string;
  failOn: FailOn;
  reportFormat: ReportFormat;
  docsPaths: string[];
  changedOnly: boolean;
  checkExternalLinks: boolean;
  prComment: boolean;
  githubToken: string;
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

export interface PrCommentRequest {
  url: string;
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  };
}

interface GitHubEventPayload {
  number?: number;
  pull_request?: {
    number?: number;
  };
}

interface HttpResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

type HttpClient = (url: string, init: PrCommentRequest["init"]) => Promise<HttpResponse>;

export function normalizeInputs(env: Record<string, string | undefined>): ActionInputs {
  return {
    scanPath: readInput(env, "path", "."),
    failOn: normalizeFailOn(readInput(env, "fail-on", "none")),
    reportFormat: normalizeReportFormat(readInput(env, "report-format", "markdown")),
    docsPaths: splitInputList(readInput(env, "docs", "")),
    changedOnly: readInput(env, "changed-only", "false").toLowerCase() === "true",
    checkExternalLinks: readInput(env, "check-external-links", "false").toLowerCase() === "true",
    prComment: readInput(env, "pr-comment", "false").toLowerCase() === "true",
    githubToken: readInput(env, "github-token", ""),
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
    ...(input.checkExternalLinks ? ["--check-external-links"] : []),
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

export function renderPrComment(report: ActionScanReport): string {
  const summary = report.summaryJson;
  const topFindings = report.findingsJson.slice(0, 10);

  return [
    "<!-- docs-debt-radar:pr-comment -->",
    "## Docs Debt Radar",
    "",
    `Found **${summary.totalFindings}** visible finding${summary.totalFindings === 1 ? "" : "s"}.`,
    "",
    "| Severity | Count |",
    "| --- | ---: |",
    `| High | ${summary.bySeverity.high} |`,
    `| Medium | ${summary.bySeverity.medium} |`,
    `| Low | ${summary.bySeverity.low} |`,
    `| Info | ${summary.bySeverity.info} |`,
    `| Suppressed | ${summary.suppressedFindingCount} |`,
    `| Warnings | ${summary.warningCount} |`,
    "",
    topFindings.length === 0 ? "No visible findings." : "### Top Findings",
    "",
    ...topFindings.map(
      (finding) =>
        `- **${finding.severity.toUpperCase()}** ${finding.documentPath}:${finding.documentLine} ${finding.title} (${finding.ruleId})`
    ),
    ""
  ].join("\n");
}

export function createPrCommentRequest(
  env: Record<string, string | undefined>,
  githubToken: string,
  body: string
): PrCommentRequest | undefined | Error {
  if (env.GITHUB_EVENT_NAME !== "pull_request" && env.GITHUB_EVENT_NAME !== "pull_request_target") {
    return undefined;
  }

  if (!githubToken) {
    return new Error("Cannot post PR comment without github-token.");
  }

  const repository = env.GITHUB_REPOSITORY;
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!repository || !eventPath) {
    return new Error("Cannot post PR comment without GITHUB_REPOSITORY and GITHUB_EVENT_PATH.");
  }

  const payload = JSON.parse(readFileSync(eventPath, "utf8")) as GitHubEventPayload;
  const pullRequestNumber = payload.pull_request?.number ?? payload.number;
  if (!pullRequestNumber) {
    return new Error("Cannot post PR comment because the pull request number was not found.");
  }

  return {
    url: `https://api.github.com/repos/${repository}/issues/${pullRequestNumber}/comments`,
    init: {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${githubToken}`,
        "content-type": "application/json",
        "user-agent": "docs-debt-radar-action",
        "x-github-api-version": "2022-11-28"
      },
      body: JSON.stringify({ body })
    }
  };
}

export async function postPrComment(
  request: PrCommentRequest,
  httpClient: HttpClient = fetch
): Promise<void> {
  const response = await httpClient(request.url, request.init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Unable to post PR comment: HTTP ${response.status} ${body}`.trim());
  }
}

export async function runAction(
  env: Record<string, string | undefined> = process.env
): Promise<number> {
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

  if (inputs.prComment) {
    const request = createPrCommentRequest(env, inputs.githubToken, renderPrComment(report));
    if (request instanceof Error) {
      process.stderr.write(`${request.message}\n`);
      writeOutput(env, "exit-code", "2");
      return 2;
    }

    if (request) {
      try {
        await postPrComment(request);
      } catch (error) {
        process.stderr.write(
          `${error instanceof Error ? error.message : "Unable to post PR comment."}\n`
        );
        writeOutput(env, "exit-code", "2");
        return 2;
      }
    }
  }

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
  process.exitCode = await runAction();
}
