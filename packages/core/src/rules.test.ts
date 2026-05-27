import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { scanDocsDebt } from "./index.js";

interface ExpectedReport {
  fixtureId: string;
  summary: {
    totalFindings: number;
    bySeverity: {
      info: number;
      low: number;
      medium: number;
      high: number;
    };
  };
  findings: Array<{
    ruleId: string;
    severity: string;
    documentPath: string;
    documentLine: number;
    title: string;
    evidence: {
      claim: string;
      currentFact: string;
    };
    suggestedAction: string;
  }>;
}

const fixtureIds = [
  "basic-node-drift",
  "docs-assets-env-drift",
  "github-actions-drift",
  "nextjs-route-drift",
  "python-fastapi-drift"
];

describe("scanDocsDebt", () => {
  it.each(fixtureIds)("matches the expected report for %s", async (fixtureId) => {
    const fixtureRoot = join(process.cwd(), "tests/fixtures", fixtureId);
    const expected = readExpectedReport(fixtureId);
    const report = await scanDocsDebt({
      root: fixtureRoot,
      scannerVersion: "0.0.0-test",
      scannedAt: "2026-05-27T00:00:00.000Z"
    });

    expect({
      fixtureId,
      summary: {
        totalFindings: report.summaryJson.totalFindings,
        bySeverity: report.summaryJson.bySeverity
      },
      findings: [...report.findingsJson].sort(compareExpectedFindings).map((finding) => {
        const [claim, currentFact] = finding.body.replace(/^Claim: /, "").split("\nCurrent fact: ");

        return {
          ruleId: finding.ruleId,
          severity: finding.severity,
          documentPath: finding.documentPath,
          documentLine: finding.documentLine,
          title: finding.title,
          evidence: {
            claim,
            currentFact
          },
          suggestedAction: finding.suggestedEdit
        };
      })
    }).toEqual({
      ...expected,
      findings: [...expected.findings].sort(compareExpectedFindings)
    });
  });

  it("scans only changed Markdown docs while keeping full repository facts", async () => {
    const fixtureRoot = join(process.cwd(), "tests/fixtures/basic-node-drift");
    const report = await scanDocsDebt({
      root: fixtureRoot,
      scannerVersion: "0.0.0-test",
      scannedAt: "2026-05-27T00:00:00.000Z",
      changedOnly: true,
      changedPaths: ["README.md"]
    });

    expect(report.config.changedOnly).toBe(true);
    expect(report.config.docsGlobs).toEqual(["README.md"]);
    expect(report.documentsJson.map((document) => document.path)).toEqual(["README.md"]);
    expect(report.summaryJson.factCount).toBeGreaterThan(0);
    expect(report.findingsJson).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "missing-package-script",
          documentPath: "README.md"
        })
      ])
    );
  });
});

function compareExpectedFindings(
  left: { documentPath: string; documentLine: number; ruleId: string },
  right: { documentPath: string; documentLine: number; ruleId: string }
): number {
  return (
    left.documentPath.localeCompare(right.documentPath) ||
    left.documentLine - right.documentLine ||
    left.ruleId.localeCompare(right.ruleId)
  );
}

function readExpectedReport(fixtureId: string): ExpectedReport {
  return JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures", fixtureId, "expected-report.json"), "utf8")
  ) as ExpectedReport;
}
