import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildCliArgs,
  createPrCommentRequest,
  normalizeInputs,
  renderJobSummary,
  renderPrComment,
  renderReportArtifact
} from "./index.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("GitHub Action wrapper", () => {
  it("normalizes GitHub Action inputs with report-only defaults", () => {
    expect(normalizeInputs({})).toEqual({
      scanPath: ".",
      failOn: "none",
      reportFormat: "markdown",
      docsPaths: [],
      changedOnly: false,
      checkExternalLinks: false,
      prComment: false,
      githubToken: "",
      reportPath: "docs-debt-report.md",
      artifactName: "docs-debt-report"
    });
  });

  it("normalizes optional PR comment inputs", () => {
    expect(
      normalizeInputs({
        INPUT_PR_COMMENT: "true",
        INPUT_GITHUB_TOKEN: "ghs_test"
      })
    ).toMatchObject({
      prComment: true,
      githubToken: "ghs_test"
    });
  });

  it("builds CLI JSON scan args from Action inputs", () => {
    expect(
      buildCliArgs({
        scanPath: ".",
        failOn: "high",
        reportFormat: "markdown",
        docsPaths: ["README.md", "docs"],
        changedOnly: false,
        checkExternalLinks: true,
        prComment: false,
        githubToken: "",
        reportPath: "docs-debt-report.md",
        artifactName: "docs-debt-report"
      })
    ).toEqual([
      "scan",
      ".",
      "--format",
      "json",
      "--fail-on",
      "high",
      "--check-external-links",
      "--docs",
      "README.md",
      "docs"
    ]);
  });

  it("passes changed-only through to the CLI", () => {
    expect(
      buildCliArgs({
        scanPath: ".",
        failOn: "none",
        reportFormat: "markdown",
        docsPaths: [],
        changedOnly: true,
        checkExternalLinks: false,
        prComment: false,
        githubToken: "",
        reportPath: "docs-debt-report.md",
        artifactName: "docs-debt-report"
      })
    ).toEqual(["scan", ".", "--format", "json", "--fail-on", "none", "--changed-only"]);
  });

  it("renders a concise Markdown job summary", () => {
    expect(
      renderJobSummary({
        summaryJson: {
          totalFindings: 2,
          bySeverity: { high: 1, medium: 1, low: 0, info: 0 },
          suppressedFindingCount: 1,
          warningCount: 0,
          scannedDocumentCount: 2,
          claimCount: 5,
          factCount: 12
        },
        findingsJson: [
          {
            ruleId: "missing-package-script",
            severity: "high",
            title: "Documented package script does not exist",
            documentPath: "README.md",
            documentLine: 7
          }
        ],
        markdown: "# Docs Debt Report\n"
      })
    ).toContain("| Suppressed | 1 |");
  });

  it("renders a PR comment summary with a stable marker", () => {
    expect(
      renderPrComment({
        summaryJson: {
          totalFindings: 2,
          bySeverity: { high: 1, medium: 1, low: 0, info: 0 },
          suppressedFindingCount: 0,
          warningCount: 0,
          scannedDocumentCount: 2,
          claimCount: 5,
          factCount: 12
        },
        findingsJson: [
          {
            ruleId: "missing-package-script",
            severity: "high",
            title: "Documented package script does not exist",
            documentPath: "README.md",
            documentLine: 7
          }
        ],
        markdown: "# Docs Debt Report\n"
      })
    ).toContain("<!-- docs-debt-radar:pr-comment -->");
  });

  it("builds a GitHub issue-comment request for pull request events", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "docs-debt-radar-action-"));
    tempDirs.push(tempDir);
    const eventPath = join(tempDir, "event.json");
    await writeFile(eventPath, `${JSON.stringify({ pull_request: { number: 42 } })}\n`, "utf8");

    expect(
      createPrCommentRequest(
        {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_REPOSITORY: "conalh/docs-debt-radar"
        },
        "ghs_test",
        "comment body"
      )
    ).toEqual({
      url: "https://api.github.com/repos/conalh/docs-debt-radar/issues/42/comments",
      init: expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "comment body" })
      })
    });
  });

  it("renders artifact content in the requested format", () => {
    const report = {
      summaryJson: {
        totalFindings: 0,
        bySeverity: { high: 0, medium: 0, low: 0, info: 0 },
        suppressedFindingCount: 0,
        warningCount: 0,
        scannedDocumentCount: 1,
        claimCount: 0,
        factCount: 1
      },
      findingsJson: [],
      markdown: "# Docs Debt Report\n\nNo findings.\n"
    };

    expect(renderReportArtifact(report, "markdown")).toBe(report.markdown);
    expect(JSON.parse(renderReportArtifact(report, "json"))).toMatchObject({
      summaryJson: { totalFindings: 0 }
    });
  });
});

describe("action.yml", () => {
  it("declares a composite Action with scan inputs, summary, and artifact upload", async () => {
    const metadata = await readFile(join(process.cwd(), "action.yml"), "utf8");

    expect(metadata).toContain("using: composite");
    expect(metadata).toContain("fail-on:");
    expect(metadata).toContain("report-format:");
    expect(metadata).toContain("docs:");
    expect(metadata).toContain("changed-only:");
    expect(metadata).toContain("check-external-links:");
    expect(metadata).toContain("pr-comment:");
    expect(metadata).toContain("github-token:");
    expect(metadata).toContain("actions/upload-artifact@v4");
    expect(metadata).toContain("working-directory: ${{ github.action_path }}");
    expect(metadata).toContain('node "$GITHUB_ACTION_PATH/apps/action/dist/index.js"');
  });
});
