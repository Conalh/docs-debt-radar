import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanDocsDebt } from "./index.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("docs debt suppressions", () => {
  it("suppresses the next Markdown line when an inline suppression has a reason", async () => {
    const root = await createFixture({
      readme: [
        "# Suppressed Inline",
        "",
        "Run `npm run test:e2e`.",
        "<!-- docs-debt-disable-next-line missing-referenced-file: generated during release packaging -->",
        "See [generated docs](docs/generated.md)."
      ].join("\n")
    });

    const report = await scanDocsDebt({
      root,
      scannedAt: "2026-05-27T00:00:00.000Z",
      scannerVersion: "0.0.0-test"
    });

    expect(report.findingsJson.map((finding) => finding.ruleId)).toEqual([
      "missing-package-script"
    ]);
    expect(report.summaryJson.totalFindings).toBe(1);
    expect(report.summaryJson.suppressedFindingCount).toBe(1);
    expect(report.suppressionsJson).toEqual([
      expect.objectContaining({
        ruleId: "missing-referenced-file",
        documentPath: "README.md",
        documentLine: 5,
        reason: "generated during release packaging",
        source: "inline"
      })
    ]);
    expect(report.markdown).toContain("Suppressed findings: 1");
    expect(report.warningsJson).toEqual([]);
  });

  it("applies config-file suppressions when each ignore entry has a reason", async () => {
    const root = await createFixture({
      readme: [
        "# Suppressed Config",
        "",
        "Run `npm run test:e2e`.",
        "See [generated docs](docs/generated.md)."
      ].join("\n"),
      config: {
        ignore: [
          {
            rule: "missing-referenced-file",
            path: "README.md",
            reason: "generated docs are added by the release workflow"
          }
        ]
      }
    });

    const report = await scanDocsDebt({
      root,
      scannedAt: "2026-05-27T00:00:00.000Z",
      scannerVersion: "0.0.0-test"
    });

    expect(report.findingsJson.map((finding) => finding.ruleId)).toEqual([
      "missing-package-script"
    ]);
    expect(report.summaryJson.suppressedFindingCount).toBe(1);
    expect(report.suppressionsJson).toEqual([
      expect.objectContaining({
        ruleId: "missing-referenced-file",
        documentPath: "README.md",
        documentLine: 4,
        reason: "generated docs are added by the release workflow",
        source: "config"
      })
    ]);
  });

  it("does not suppress findings when suppression reasons are missing", async () => {
    const root = await createFixture({
      readme: [
        "# Invalid Suppressions",
        "",
        "Run `npm run test:e2e`.",
        "<!-- docs-debt-disable-next-line missing-referenced-file -->",
        "See [generated docs](docs/generated.md)."
      ].join("\n"),
      config: {
        ignore: [
          {
            rule: "missing-package-script",
            path: "README.md"
          }
        ]
      }
    });

    const report = await scanDocsDebt({
      root,
      scannedAt: "2026-05-27T00:00:00.000Z",
      scannerVersion: "0.0.0-test"
    });

    expect(report.findingsJson.map((finding) => finding.ruleId).sort()).toEqual([
      "missing-package-script",
      "missing-referenced-file"
    ]);
    expect(report.summaryJson.suppressedFindingCount).toBe(0);
    expect(report.suppressionsJson).toEqual([]);
    expect(report.warningsJson).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "invalid_suppression",
          path: ".docs-debt-radar.json",
          message: expect.stringContaining("requires rule, path, and reason")
        }),
        expect.objectContaining({
          kind: "invalid_suppression",
          path: "README.md",
          lineNumber: 4,
          message: expect.stringContaining("requires a reason")
        })
      ])
    );
    expect(report.warningsJson).toHaveLength(2);
  });
});

async function createFixture(input: {
  readme: string;
  config?: Record<string, unknown>;
}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "docs-debt-radar-suppressions-"));
  tempDirs.push(root);

  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "README.md"), `${input.readme}\n`, "utf8");
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({ name: "suppression-fixture", scripts: { test: "node --test" } }, null, 2)}\n`,
    "utf8"
  );

  if (input.config) {
    await writeFile(
      join(root, ".docs-debt-radar.json"),
      `${JSON.stringify(input.config, null, 2)}\n`,
      "utf8"
    );
  }

  return root;
}
