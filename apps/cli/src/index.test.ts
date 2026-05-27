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
});
