import { describe, expect, it } from "vitest";

import {
  filterFindings,
  parseReportJson,
  renderFindingDetail,
  renderFindingRows,
  renderSummaryCards
} from "./report-viewer.js";

const reportJson = JSON.stringify({
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
      id: "finding_1",
      ruleId: "missing-package-script",
      severity: "high",
      title: "Documented package script does not exist",
      body: "Claim: README.md says to run `npm run test:e2e`.\nCurrent fact: package.json defines scripts `dev` and `test`, but not `test:e2e`.",
      documentPath: "README.md",
      documentLine: 7,
      claimId: "claim_1",
      relatedFactIds: [],
      suggestedEdit: "Update the README command or add a `test:e2e` script to package.json.",
      falsePositiveNote: "A script may exist in another workspace package."
    },
    {
      id: "finding_2",
      ruleId: "missing-referenced-file",
      severity: "medium",
      title: "Documented relative file path does not exist",
      body: "Claim: README.md links to `docs/cli.md`.\nCurrent fact: `docs/cli.md` is not present.",
      documentPath: "README.md",
      documentLine: 10,
      claimId: "claim_2",
      relatedFactIds: [],
      suggestedEdit: "Create docs/cli.md or remove the stale link from README.md.",
      falsePositiveNote: "The referenced path may be generated."
    }
  ],
  suppressionsJson: [],
  warningsJson: [],
  markdown: "# Docs Debt Report\n"
});

describe("report viewer", () => {
  it("parses a CLI JSON report", () => {
    const report = parseReportJson(reportJson);

    expect(report.summaryJson.totalFindings).toBe(2);
    expect(report.findingsJson[0]?.ruleId).toBe("missing-package-script");
  });

  it("filters findings by severity and query", () => {
    const report = parseReportJson(reportJson);

    expect(filterFindings(report.findingsJson, { severity: "high", query: "" })).toHaveLength(1);
    expect(filterFindings(report.findingsJson, { severity: "all", query: "cli.md" })).toEqual([
      expect.objectContaining({ ruleId: "missing-referenced-file" })
    ]);
  });

  it("renders summary cards, finding rows, and finding details", () => {
    const report = parseReportJson(reportJson);

    expect(renderSummaryCards(report)).toContain("Total Findings");
    expect(renderSummaryCards(report)).toContain("Suppressed");
    expect(renderFindingRows(report.findingsJson)).toContain("missing-package-script");
    expect(renderFindingDetail(report.findingsJson[0])).toContain("Suggested edit");
  });
});
