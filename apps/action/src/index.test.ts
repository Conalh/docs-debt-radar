import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildCliArgs, normalizeInputs, renderJobSummary, renderReportArtifact } from "./index.js";

describe("GitHub Action wrapper", () => {
  it("normalizes GitHub Action inputs with report-only defaults", () => {
    expect(normalizeInputs({})).toEqual({
      scanPath: ".",
      failOn: "none",
      reportFormat: "markdown",
      docsPaths: [],
      changedOnly: false,
      reportPath: "docs-debt-report.md",
      artifactName: "docs-debt-report"
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
      "--docs",
      "README.md",
      "docs"
    ]);
  });

  it("rejects changed-only until the CLI supports it", () => {
    expect(
      buildCliArgs({
        scanPath: ".",
        failOn: "none",
        reportFormat: "markdown",
        docsPaths: [],
        changedOnly: true,
        reportPath: "docs-debt-report.md",
        artifactName: "docs-debt-report"
      })
    ).toEqual(new Error("changed-only is not supported by the CLI yet."));
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
    expect(metadata).toContain("actions/upload-artifact@v4");
    expect(metadata).toContain("working-directory: ${{ github.action_path }}");
    expect(metadata).toContain('node "$GITHUB_ACTION_PATH/apps/action/dist/index.js"');
  });
});
