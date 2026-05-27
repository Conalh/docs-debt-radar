import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("public documentation", () => {
  it("explains the public product loop with before and after demo output", async () => {
    const readme = await readFile(join(root, "README.md"), "utf8");

    expect(readme).toContain("## Quick Start");
    expect(readme).toContain("## Demo");
    expect(readme).toContain("Before:");
    expect(readme).toContain("After:");
    expect(readme).toContain("docs-debt-radar scan . --format markdown");
    expect(readme).toContain("docs/demo/basic-node-drift-report.md");
  });

  it("ships sample reports and practical examples for supported project shapes", async () => {
    const requiredDocs = [
      "docs/demo/basic-node-drift-report.md",
      "docs/demo/basic-node-drift-report.json",
      "docs/product/configuration.md",
      "docs/product/rules.md",
      "docs/examples/node.md",
      "docs/examples/nextjs.md",
      "docs/examples/fastapi.md",
      "docs/examples/flask.md",
      "docs/examples/django.md",
      "docs/examples/express.md",
      "docs/examples/nestjs.md",
      "docs/examples/hono.md",
      "docs/examples/koa.md",
      "docs/examples/github-actions.md"
    ];

    await Promise.all(
      requiredDocs.map(async (path) => {
        await expect(readFile(join(root, path), "utf8")).resolves.toContain("#");
      })
    );

    const sampleReport = await readFile(join(root, "docs/demo/basic-node-drift-report.md"), "utf8");
    expect(sampleReport).toContain("Documented package script does not exist");
    expect(sampleReport).toContain("Documented relative file path does not exist");
  });
});
