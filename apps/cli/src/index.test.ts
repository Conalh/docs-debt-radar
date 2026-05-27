import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createCliHelp, runCli } from "./index.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("createCliHelp", () => {
  it("documents the initial scan command surface", () => {
    expect(createCliHelp()).toContain("docs-debt-radar scan <path>");
    expect(createCliHelp()).toContain("--format <text|markdown|json>");
    expect(createCliHelp()).toContain("--fail-on <none|info|low|medium|high>");
  });

  it("prints extracted Markdown claims as JSON", async () => {
    const result = await runCli([
      "scan",
      join(process.cwd(), "tests/fixtures/basic-node-drift"),
      "--claims",
      "--format",
      "json"
    ]);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout) as {
      claims: Array<{
        kind: string;
        documentPath: string;
        lineNumber: number;
        normalizedValue: string;
      }>;
    };
    expect(output.claims.slice(0, 2)).toMatchObject([
      {
        kind: "command",
        documentPath: "README.md",
        lineNumber: 5,
        normalizedValue: "npm install"
      },
      {
        kind: "package_script",
        documentPath: "README.md",
        lineNumber: 6,
        normalizedValue: "dev"
      }
    ]);
    expect(result.stderr).toBe("");
  });

  it("prints extracted repository facts as JSON", async () => {
    const result = await runCli([
      "scan",
      join(process.cwd(), "tests/fixtures/github-actions-drift"),
      "--facts",
      "--format",
      "json"
    ]);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout) as {
      facts: Array<{
        kind: string;
        value: string;
        sourcePath: string;
        lineNumber: number;
      }>;
    };

    expect(output.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "workflow_exists",
          value: "CI",
          sourcePath: ".github/workflows/ci.yml",
          lineNumber: 1
        }),
        expect.objectContaining({
          kind: "command_surface",
          value: "npm run lint:ci",
          sourcePath: ".github/workflows/ci.yml",
          lineNumber: 12
        })
      ])
    );
    expect(result.stderr).toBe("");
  });

  it("prints docs debt findings as JSON by default", async () => {
    const result = await runCli([
      "scan",
      join(process.cwd(), "tests/fixtures/basic-node-drift"),
      "--format",
      "json"
    ]);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout) as {
      summaryJson: {
        totalFindings: number;
      };
      findingsJson: Array<{
        ruleId: string;
        severity: string;
      }>;
    };

    expect(output.summaryJson.totalFindings).toBe(2);
    expect(output.findingsJson).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "missing-package-script", severity: "high" }),
        expect.objectContaining({ ruleId: "missing-referenced-file", severity: "medium" })
      ])
    );
    expect(result.stderr).toBe("");
  });

  it("restricts scanned documentation with --docs", async () => {
    const result = await runCli([
      "scan",
      join(process.cwd(), "tests/fixtures/basic-node-drift"),
      "--format",
      "json",
      "--docs",
      "docs/setup.md"
    ]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      summaryJson: {
        totalFindings: 0,
        scannedDocumentCount: 1
      },
      documentsJson: [expect.objectContaining({ path: "docs/setup.md" })]
    });
    expect(result.stderr).toBe("");
  });

  it("prints Markdown reports and writes reports to disk", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "docs-debt-radar-"));
    tempDirs.push(tempDir);
    const reportPath = join(tempDir, "report.md");

    const result = await runCli([
      "scan",
      join(process.cwd(), "tests/fixtures/basic-node-drift"),
      "--format",
      "markdown",
      "--write-report",
      reportPath
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("# Docs Debt Report");
    expect(result.stdout).toContain("## HIGH: Documented package script does not exist");
    expect(await readFile(reportPath, "utf8")).toBe(result.stdout);
    expect(result.stderr).toBe("");
  });

  it("returns exit code 1 when findings meet the fail threshold", async () => {
    const result = await runCli([
      "scan",
      join(process.cwd(), "tests/fixtures/basic-node-drift"),
      "--format",
      "json",
      "--fail-on",
      "high"
    ]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      summaryJson: {
        totalFindings: 2
      }
    });
    expect(result.stderr).toBe("");
  });

  it("prints rule listings and explanations", async () => {
    const listResult = await runCli(["list-rules"]);
    const explainResult = await runCli(["explain", "missing-package-script"]);

    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain("missing-package-script");
    expect(listResult.stdout).toContain("workflow-references-missing-script");
    expect(listResult.stderr).toBe("");

    expect(explainResult.exitCode).toBe(0);
    expect(explainResult.stdout).toContain("# missing-package-script");
    expect(explainResult.stdout).toContain("Documented package script does not exist");
    expect(explainResult.stderr).toBe("");
  });
});
