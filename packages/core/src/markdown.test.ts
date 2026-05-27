import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseMarkdownDocument, scanMarkdownClaims } from "./index.js";

describe("parseMarkdownDocument", () => {
  it("parses headings, links, images, inline code, and fenced code with source lines", () => {
    const document = parseMarkdownDocument({
      path: "README.md",
      text: [
        "# Example",
        "",
        "See [Guide](docs/guide.md#usage).",
        "![Dashboard](docs/images/dashboard.png)",
        "",
        "Run `npm run test:e2e`.",
        "",
        "```bash",
        "pnpm build",
        "```"
      ].join("\n")
    });

    expect(document.kind).toBe("readme");
    expect(document.headings).toEqual([{ text: "Example", anchor: "example", lineNumber: 1 }]);
    expect(document.links).toEqual([
      {
        label: "Guide",
        target: "docs/guide.md#usage",
        isImage: false,
        lineNumber: 3
      },
      {
        label: "Dashboard",
        target: "docs/images/dashboard.png",
        isImage: true,
        lineNumber: 4
      }
    ]);
    expect(document.inlineCode).toEqual([{ text: "npm run test:e2e", lineNumber: 6 }]);
    expect(document.codeBlocks).toEqual([{ language: "bash", text: "pnpm build", lineNumber: 8 }]);
  });
});

describe("scanMarkdownClaims", () => {
  it("extracts high-confidence claims from fixture Markdown with document lines", async () => {
    const result = await scanMarkdownClaims({
      root: join(process.cwd(), "tests/fixtures/basic-node-drift")
    });

    expect(result.documents.map((document) => document.path).sort()).toEqual([
      "README.md",
      "docs/setup.md"
    ]);
    expect(
      result.claims.map((claim) => ({
        kind: claim.kind,
        documentPath: claim.documentPath,
        lineNumber: claim.lineNumber,
        normalizedValue: claim.normalizedValue,
        confidence: claim.confidence
      }))
    ).toEqual([
      {
        kind: "command",
        documentPath: "README.md",
        lineNumber: 5,
        normalizedValue: "npm install",
        confidence: "high"
      },
      {
        kind: "package_script",
        documentPath: "README.md",
        lineNumber: 6,
        normalizedValue: "dev",
        confidence: "high"
      },
      {
        kind: "package_script",
        documentPath: "README.md",
        lineNumber: 7,
        normalizedValue: "test:e2e",
        confidence: "high"
      },
      {
        kind: "file_ref",
        documentPath: "README.md",
        lineNumber: 9,
        normalizedValue: "docs/setup.md",
        confidence: "high"
      },
      {
        kind: "file_ref",
        documentPath: "README.md",
        lineNumber: 10,
        normalizedValue: "docs/cli.md",
        confidence: "high"
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("extracts env vars, routes, image refs, and fenced shell commands conservatively", async () => {
    const result = await scanMarkdownClaims({
      root: join(process.cwd(), "tests/fixtures/docs-assets-env-drift")
    });

    expect(
      result.claims.map((claim) => ({
        kind: claim.kind,
        lineNumber: claim.lineNumber,
        normalizedValue: claim.normalizedValue
      }))
    ).toEqual([
      { kind: "file_ref", lineNumber: 3, normalizedValue: "docs/guide.md#usage" },
      { kind: "file_ref", lineNumber: 4, normalizedValue: "docs/guide.md#install" },
      { kind: "image_ref", lineNumber: 6, normalizedValue: "docs/images/dashboard.png" },
      { kind: "image_ref", lineNumber: 7, normalizedValue: "docs/images/missing-flow.png" },
      { kind: "env_var", lineNumber: 9, normalizedValue: "PUBLIC_API_URL" }
    ]);

    const inlineDocument = parseMarkdownDocument({
      path: "docs/routes.md",
      text: [
        "# Routes",
        "",
        "Open `/settings` to manage the account.",
        "",
        "```shell",
        "pnpm test",
        "```"
      ].join("\n")
    });

    const inlineResult = await scanMarkdownClaims({
      root: process.cwd(),
      documents: [inlineDocument]
    });

    expect(
      inlineResult.claims.map((claim) => ({
        kind: claim.kind,
        lineNumber: claim.lineNumber,
        normalizedValue: claim.normalizedValue
      }))
    ).toEqual([
      { kind: "route", lineNumber: 3, normalizedValue: "/settings" },
      { kind: "command", lineNumber: 5, normalizedValue: "pnpm test" }
    ]);
  });
});
