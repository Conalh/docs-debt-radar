import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { scanRepositoryFacts } from "./index.js";

function fixturePath(name: string): string {
  return join(process.cwd(), "tests/fixtures", name);
}

describe("scanRepositoryFacts", () => {
  it("extracts file tree, Markdown anchor, and package script facts", async () => {
    const result = await scanRepositoryFacts({ root: fixturePath("basic-node-drift") });

    expect(
      result.facts.map((fact) => ({
        kind: fact.kind,
        value: fact.value,
        sourcePath: fact.sourcePath,
        lineNumber: fact.lineNumber,
        metadataJson: fact.metadataJson
      }))
    ).toEqual(
      expect.arrayContaining([
        {
          kind: "file_exists",
          value: "README.md",
          sourcePath: "README.md",
          lineNumber: 1,
          metadataJson: { entryType: "file" }
        },
        {
          kind: "config_key",
          value: "README.md#setup",
          sourcePath: "README.md",
          lineNumber: 3,
          metadataJson: { configType: "markdown_anchor", heading: "Setup" }
        },
        {
          kind: "package_script",
          value: "dev",
          sourcePath: "package.json",
          lineNumber: 5,
          metadataJson: { packageName: "basic-node-drift", command: "node src/index.js" }
        },
        {
          kind: "package_script",
          value: "test",
          sourcePath: "package.json",
          lineNumber: 6,
          metadataJson: { packageName: "basic-node-drift", command: "node --test" }
        }
      ])
    );
    expect(result.warnings).toEqual([]);
  });

  it("extracts env facts from env examples and source references", async () => {
    const result = await scanRepositoryFacts({ root: fixturePath("docs-assets-env-drift") });

    expect(
      result.facts.map((fact) => ({
        kind: fact.kind,
        value: fact.value,
        sourcePath: fact.sourcePath,
        lineNumber: fact.lineNumber,
        metadataJson: fact.metadataJson
      }))
    ).toEqual(
      expect.arrayContaining([
        {
          kind: "env_var_declared",
          value: "PUBLIC_API_URL",
          sourcePath: ".env.example",
          lineNumber: 1,
          metadataJson: { envSource: "example" }
        },
        {
          kind: "env_var_declared",
          value: "PUBLIC_API_URL",
          sourcePath: "src/config.ts",
          lineNumber: 1,
          metadataJson: { envSource: "source_reference" }
        },
        {
          kind: "env_var_declared",
          value: "STRIPE_API_KEY",
          sourcePath: "src/config.ts",
          lineNumber: 2,
          metadataJson: { envSource: "source_reference" }
        }
      ])
    );
  });

  it("extracts Next.js and FastAPI route facts", async () => {
    const nextResult = await scanRepositoryFacts({ root: fixturePath("nextjs-route-drift") });
    const fastApiResult = await scanRepositoryFacts({ root: fixturePath("python-fastapi-drift") });

    expect(
      nextResult.facts.map((fact) => ({
        kind: fact.kind,
        value: fact.value,
        sourcePath: fact.sourcePath,
        lineNumber: fact.lineNumber,
        metadataJson: fact.metadataJson
      }))
    ).toEqual(
      expect.arrayContaining([
        {
          kind: "route_exists",
          value: "/dashboard",
          sourcePath: "app/dashboard/page.tsx",
          lineNumber: 1,
          metadataJson: { framework: "nextjs", routeType: "page" }
        },
        {
          kind: "route_exists",
          value: "/api/health",
          sourcePath: "app/api/health/route.ts",
          lineNumber: 1,
          metadataJson: { framework: "nextjs", routeType: "api" }
        }
      ])
    );

    expect(
      fastApiResult.facts.map((fact) => ({
        kind: fact.kind,
        value: fact.value,
        sourcePath: fact.sourcePath,
        lineNumber: fact.lineNumber,
        metadataJson: fact.metadataJson
      }))
    ).toEqual(
      expect.arrayContaining([
        {
          kind: "route_exists",
          value: "/health",
          sourcePath: "app/main.py",
          lineNumber: 9,
          metadataJson: { framework: "fastapi", method: "get" }
        }
      ])
    );
  });

  it("extracts GitHub Actions workflow and command-surface facts", async () => {
    const result = await scanRepositoryFacts({ root: fixturePath("github-actions-drift") });

    expect(
      result.facts.map((fact) => ({
        kind: fact.kind,
        value: fact.value,
        sourcePath: fact.sourcePath,
        lineNumber: fact.lineNumber,
        metadataJson: fact.metadataJson
      }))
    ).toEqual(
      expect.arrayContaining([
        {
          kind: "workflow_exists",
          value: "CI",
          sourcePath: ".github/workflows/ci.yml",
          lineNumber: 1,
          metadataJson: { fileName: "ci.yml" }
        },
        {
          kind: "command_surface",
          value: "npm run build",
          sourcePath: ".github/workflows/ci.yml",
          lineNumber: 11,
          metadataJson: { commandSource: "github_actions" }
        },
        {
          kind: "command_surface",
          value: "npm run lint:ci",
          sourcePath: ".github/workflows/ci.yml",
          lineNumber: 12,
          metadataJson: { commandSource: "github_actions" }
        }
      ])
    );
  });
});
