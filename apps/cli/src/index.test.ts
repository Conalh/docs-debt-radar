import { describe, expect, it } from "vitest";

import { join } from "node:path";

import { createCliHelp, runCli } from "./index.js";

describe("createCliHelp", () => {
  it("documents the initial scan command surface", () => {
    expect(createCliHelp()).toContain("docs-debt-radar scan <path>");
    expect(createCliHelp()).toContain("--format <text|markdown|json>");
    expect(createCliHelp()).toContain("--fail-on <none|low|medium|high>");
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
});
