import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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
  "python-fastapi-drift",
  "python-flask-drift",
  "python-django-drift",
  "express-route-drift",
  "nestjs-route-drift",
  "hono-route-drift",
  "koa-route-drift",
  "rails-route-drift",
  "laravel-route-drift",
  "symfony-route-drift"
];

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

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

  it("checks external links only when explicitly enabled", async () => {
    const fixtureRoot = join(process.cwd(), "tests/fixtures/external-link-drift");
    const offlineReport = await scanDocsDebt({
      root: fixtureRoot,
      scannerVersion: "0.0.0-test",
      scannedAt: "2026-05-27T00:00:00.000Z"
    });
    const checkedReport = await scanDocsDebt({
      root: fixtureRoot,
      scannerVersion: "0.0.0-test",
      scannedAt: "2026-05-27T00:00:00.000Z",
      checkExternalLinks: true,
      externalLinkChecker: async (url) => ({
        ok: !url.endsWith("/missing"),
        status: url.endsWith("/missing") ? 404 : 200
      })
    });

    expect(offlineReport.findingsJson).toEqual([]);
    expect(checkedReport.findingsJson).toEqual([
      expect.objectContaining({
        ruleId: "external-link-unreachable",
        severity: "low",
        title: "External link could not be reached",
        documentPath: "README.md",
        documentLine: 4,
        suggestedEdit: "Update or remove the external link to https://example.test/missing."
      })
    ]);
  });

  it("creates patch suggestions for stale single-line documentation claims", async () => {
    const fixtureRoot = join(process.cwd(), "tests/fixtures/basic-node-drift");
    const report = await scanDocsDebt({
      root: fixtureRoot,
      scannerVersion: "0.0.0-test",
      scannedAt: "2026-05-27T00:00:00.000Z"
    });

    expect(report.suggestedFixesJson).toEqual([
      expect.objectContaining({
        ruleId: "missing-package-script",
        documentPath: "README.md",
        documentLine: 7,
        confidence: "low",
        description: "Remove the stale documentation line or replace it with a current command.",
        unifiedDiff: [
          "diff --git a/README.md b/README.md",
          "--- a/README.md",
          "+++ b/README.md",
          "@@ -7,1 +7,0 @@",
          "-Run `npm run test:e2e` before opening a pull request.",
          ""
        ].join("\n")
      }),
      expect.objectContaining({
        ruleId: "missing-referenced-file",
        documentPath: "README.md",
        documentLine: 10,
        confidence: "low",
        description: "Remove the stale documentation line or replace it with a current reference.",
        unifiedDiff: [
          "diff --git a/README.md b/README.md",
          "--- a/README.md",
          "+++ b/README.md",
          "@@ -10,1 +10,0 @@",
          "-See [missing CLI reference](docs/cli.md).",
          ""
        ].join("\n")
      })
    ]);
  });

  it("keeps archived documentation drift informational", async () => {
    const fixtureRoot = join(process.cwd(), "tests/fixtures/archive-docs-drift");
    const report = await scanDocsDebt({
      root: fixtureRoot,
      scannerVersion: "0.0.0-test",
      scannedAt: "2026-05-27T00:00:00.000Z"
    });

    expect(report.findingsJson).toEqual([
      expect.objectContaining({
        ruleId: "missing-package-script",
        severity: "info",
        documentPath: "docs/archive/v0.md"
      }),
      expect.objectContaining({
        ruleId: "missing-referenced-file",
        severity: "info",
        documentPath: "docs/archive/v0.md"
      })
    ]);
    expect(report.summaryJson.bySeverity).toEqual({
      high: 0,
      medium: 0,
      low: 0,
      info: 2
    });
  });

  it("resolves relative Markdown links from the document directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "docs-debt-radar-relative-links-"));
    tempDirs.push(root);
    await mkdir(join(root, "apps/tool"), { recursive: true });
    await mkdir(join(root, "docs/product"), { recursive: true });
    await writeFile(
      join(root, "apps/tool/README.md"),
      "# Tool\n\nSee [product guide](../../docs/product/guide.md).\n",
      "utf8"
    );
    await writeFile(join(root, "docs/product/guide.md"), "# Product Guide\n", "utf8");

    const report = await scanDocsDebt({
      root,
      scannerVersion: "0.0.0-test",
      scannedAt: "2026-05-27T00:00:00.000Z"
    });

    expect(report.findingsJson).toEqual([]);
    expect(report.claimsJson).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentPath: "apps/tool/README.md",
          kind: "file_ref",
          rawText: "../../docs/product/guide.md",
          normalizedValue: "docs/product/guide.md"
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
