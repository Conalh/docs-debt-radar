import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

interface PackageJson {
  private?: boolean;
  version?: string;
  license?: string;
  description?: string;
  files?: string[];
  main?: string;
  types?: string;
  bin?: Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  engines?: Record<string, string>;
  publishConfig?: Record<string, string>;
}

describe("release readiness", () => {
  it("keeps publishable package metadata explicit and tarball surfaces narrow", async () => {
    const core = await readPackage("packages/core/package.json");
    const cli = await readPackage("apps/cli/package.json");

    for (const packageJson of [core, cli]) {
      expect(packageJson.private).toBe(false);
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(packageJson.license).toBe("MIT");
      expect(packageJson.description).toBeTruthy();
      expect(packageJson.files).toEqual(["dist", "README.md", "LICENSE"]);
      expect(packageJson.main).toBe("./dist/index.js");
      expect(packageJson.types).toBe("./dist/index.d.ts");
      expect(packageJson.engines).toEqual({ node: ">=22" });
      expect(packageJson.publishConfig).toEqual({ access: "public" });
    }

    expect(cli.bin).toEqual({ "docs-debt-radar": "./dist/index.js" });
    expect(cli.dependencies?.["@docs-debt-radar/core"]).toBe(`workspace:${cli.version}`);
  });

  it("documents release compatibility and exposes pack smoke scripts", async () => {
    const rootPackage = await readPackage("package.json");
    const releaseDocs = await readFile(join(root, "docs/product/release-readiness.md"), "utf8");

    expect(rootPackage.scripts).toMatchObject({
      "pack:dry-run": "node scripts/pack-dry-run.mjs",
      "smoke:packed": "node scripts/smoke-packed-cli.mjs"
    });
    expect(releaseDocs).toContain("Node.js 22");
    expect(releaseDocs).toContain("npm pack --dry-run");
    expect(releaseDocs).toContain("clean machine");
  });
});

async function readPackage(path: string): Promise<PackageJson> {
  return JSON.parse(await readFile(join(root, path), "utf8")) as PackageJson;
}
