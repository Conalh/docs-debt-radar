import { describe, expect, it } from "vitest";

import {
  createClaim,
  createCodeFact,
  createDocumentFile,
  createFinding,
  createScanConfig,
  createScanReport,
  createScannerWarning,
  createStableId
} from "./index.js";

describe("evidence model", () => {
  it("creates serializable config, document, claim, fact, finding, and report records", () => {
    const config = createScanConfig({
      root: "C:/example/repo",
      docsGlobs: ["README.md", "docs/**/*.md"],
      ignoreGlobs: ["node_modules/**"],
      changedOnly: false,
      checkExternalLinks: false,
      failOn: "high",
      outputFormat: "json",
      maxFileSizeBytes: 1000000
    });

    const document = createDocumentFile({
      path: "README.md",
      kind: "readme",
      text: "Run `npm run test:e2e`.",
      headings: [{ text: "Setup", anchor: "setup", lineNumber: 1 }],
      links: [],
      codeBlocks: [],
      inlineCode: [{ text: "npm run test:e2e", lineNumber: 3 }]
    });

    const claim = createClaim({
      documentPath: "README.md",
      lineNumber: 3,
      kind: "package_script",
      rawText: "`npm run test:e2e`",
      normalizedValue: "test:e2e",
      context: "Run `npm run test:e2e`.",
      confidence: "high"
    });

    const fact = createCodeFact({
      kind: "package_script",
      value: "test",
      sourcePath: "package.json",
      lineNumber: 5,
      metadata: { packageManager: "npm" }
    });

    const finding = createFinding({
      ruleId: "missing-package-script",
      severity: "high",
      title: "Documented package script does not exist",
      body: "README.md says to run a script that package.json does not define.",
      documentPath: claim.documentPath,
      documentLine: claim.lineNumber,
      claimId: claim.id,
      relatedFactIds: [fact.id],
      suggestedEdit: "Update README.md or add the script.",
      falsePositiveNote: "Workspace package scripts may be discovered by a later resolver."
    });

    const warning = createScannerWarning({
      kind: "file_skipped",
      message: "Skipped large Markdown file.",
      path: "docs/large.md",
      lineNumber: 1
    });

    const report = createScanReport({
      repoRoot: config.root,
      scannedAt: "2026-05-27T00:00:00.000Z",
      scannerVersion: "0.0.0-test",
      config,
      documents: [document],
      claims: [claim],
      facts: [fact],
      findings: [finding],
      warnings: [warning],
      markdown: "# Docs Debt Report\n\n1 high finding."
    });

    expect(report).toEqual({
      id: createStableId("scan", ["C:/example/repo", "2026-05-27T00:00:00.000Z", "0.0.0-test"]),
      repoRoot: "C:/example/repo",
      scannedAt: "2026-05-27T00:00:00.000Z",
      scannerVersion: "0.0.0-test",
      config,
      summaryJson: {
        totalFindings: 1,
        bySeverity: {
          high: 1,
          medium: 0,
          low: 0,
          info: 0
        },
        suppressedFindingCount: 0,
        warningCount: 1,
        scannedDocumentCount: 1,
        claimCount: 1,
        factCount: 1
      },
      documentsJson: [document],
      claimsJson: [claim],
      factsJson: [fact],
      findingsJson: [finding],
      suggestedFixesJson: [],
      suppressionsJson: [],
      warningsJson: [warning],
      markdown: "# Docs Debt Report\n\n1 high finding."
    });

    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it("creates stable ids from semantic identity fields instead of object identity", () => {
    const first = createClaim({
      documentPath: "README.md",
      lineNumber: 3,
      kind: "package_script",
      rawText: "`npm run test:e2e`",
      normalizedValue: "test:e2e",
      context: "Run `npm run test:e2e`.",
      confidence: "high"
    });

    const second = createClaim({
      documentPath: "README.md",
      lineNumber: 3,
      kind: "package_script",
      rawText: "`npm run test:e2e`",
      normalizedValue: "test:e2e",
      context: "Different surrounding paragraph text.",
      confidence: "medium"
    });

    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(/^claim_[a-z0-9]+$/);
  });
});
