import { spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createCliHelp, runCli } from "./index.js";

const tempDirs: string[] = [];
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
  await Promise.all(servers.splice(0).map((server) => closeServer(server)));
});

describe("createCliHelp", () => {
  it("documents the initial scan command surface", () => {
    expect(createCliHelp()).toContain("docs-debt-radar scan <path>");
    expect(createCliHelp()).toContain("--format <text|markdown|json|sarif>");
    expect(createCliHelp()).toContain("--check-external-links");
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

  it("restricts scans to Markdown docs changed in git status with --changed-only", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "docs-debt-radar-git-"));
    tempDirs.push(tempDir);
    await mkdir(join(tempDir, "docs"));
    await writeFile(
      join(tempDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest" } }, null, 2)}\n`,
      "utf8"
    );
    await writeFile(join(tempDir, "README.md"), "Run `npm run test`.\n", "utf8");
    await writeFile(join(tempDir, "docs/setup.md"), "Run `npm run missing-docs`.\n", "utf8");
    runGit(tempDir, ["init"]);
    runGit(tempDir, ["add", "."]);
    runGit(tempDir, [
      "-c",
      "user.name=Docs Debt Radar",
      "-c",
      "user.email=docs-debt-radar@example.test",
      "commit",
      "-m",
      "initial fixture"
    ]);
    await writeFile(join(tempDir, "README.md"), "Run `npm run missing-readme`.\n", "utf8");

    const result = await runCli(["scan", tempDir, "--format", "json", "--changed-only"]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      config: {
        changedOnly: true,
        docsGlobs: ["README.md"]
      },
      summaryJson: {
        totalFindings: 1,
        scannedDocumentCount: 1
      },
      findingsJson: [
        expect.objectContaining({
          ruleId: "missing-package-script",
          documentPath: "README.md"
        })
      ]
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

  it("prints SARIF reports for code-scanning compatible docs debt findings", async () => {
    const result = await runCli([
      "scan",
      join(process.cwd(), "tests/fixtures/basic-node-drift"),
      "--format",
      "sarif"
    ]);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout) as {
      version: string;
      $schema: string;
      runs: Array<{
        tool: {
          driver: {
            name: string;
            rules: Array<{
              id: string;
              name: string;
              shortDescription: { text: string };
              help: { text: string };
            }>;
          };
        };
        results: Array<{
          ruleId: string;
          level: string;
          message: { text: string };
          locations: Array<{
            physicalLocation: {
              artifactLocation: { uri: string };
              region: { startLine: number };
            };
          }>;
          properties: {
            docsDebtSeverity: string;
            suggestedEdit: string;
          };
        }>;
      }>;
    };

    expect(output.version).toBe("2.1.0");
    expect(output.$schema).toContain("sarif-schema-2.1.0.json");
    expect(output.runs[0]?.tool.driver.name).toBe("Docs Debt Radar");
    expect(output.runs[0]?.tool.driver.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "missing-package-script",
          shortDescription: { text: "Documented package script does not exist" }
        })
      ])
    );
    expect(output.runs[0]?.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "missing-package-script",
          level: "error",
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: "README.md" },
                region: { startLine: 7 }
              }
            }
          ],
          properties: expect.objectContaining({
            docsDebtSeverity: "high"
          })
        })
      ])
    );
    expect(result.stderr).toBe("");
  });

  it("checks external links only when --check-external-links is set", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "docs-debt-radar-links-"));
    tempDirs.push(tempDir);
    const { server, url } = await startLinkServer();
    servers.push(server);
    await writeFile(
      join(tempDir, "README.md"),
      ["# Links", "", `Read [ok](${url}/ok).`, `Read [missing](${url}/missing).`].join("\n"),
      "utf8"
    );

    const offlineResult = await runCli(["scan", tempDir, "--format", "json"]);
    const checkedResult = await runCli([
      "scan",
      tempDir,
      "--format",
      "json",
      "--check-external-links"
    ]);

    expect(JSON.parse(offlineResult.stdout)).toMatchObject({
      summaryJson: { totalFindings: 0 }
    });
    expect(JSON.parse(checkedResult.stdout)).toMatchObject({
      summaryJson: { totalFindings: 1 },
      findingsJson: [
        expect.objectContaining({
          ruleId: "external-link-unreachable",
          documentLine: 4
        })
      ]
    });
    expect(offlineResult.stderr).toBe("");
    expect(checkedResult.stderr).toBe("");
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

function runGit(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}

async function startLinkServer(): Promise<{ server: Server; url: string }> {
  const server = createServer((request, response) => {
    response.statusCode = request.url === "/missing" ? 404 : 200;
    response.end();
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Unable to start test link server.");
  }

  return { server, url: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
