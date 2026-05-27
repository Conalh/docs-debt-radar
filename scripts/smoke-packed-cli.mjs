import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), "docs-debt-radar-smoke-"));
const fixturePath = resolve(root, "tests/fixtures/basic-node-drift");

try {
  run("pnpm", ["build"], { cwd: root });

  const coreTarball = pack("@docs-debt-radar/core");
  const cliTarball = pack("@docs-debt-radar/cli");
  const packageJsonPath = join(tempRoot, "package.json");

  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(
      {
        private: true,
        type: "module",
        dependencies: {
          "@docs-debt-radar/core": pathToFileURL(coreTarball).href,
          "@docs-debt-radar/cli": pathToFileURL(cliTarball).href
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  run("npm", ["install", "--ignore-scripts"], { cwd: tempRoot });
  const smoke = run(
    "npm",
    ["exec", "--", "docs-debt-radar", "scan", fixturePath, "--format", "json"],
    { cwd: tempRoot, silent: true }
  );
  const report = JSON.parse(smoke.stdout);

  if (report.summaryJson.totalFindings !== 2) {
    throw new Error(
      `Packed CLI smoke expected 2 findings, received ${report.summaryJson.totalFindings}`
    );
  }

  console.log(
    `Packed CLI smoke OK (${basename(cliTarball)} scanned ${fixturePath} with ${report.summaryJson.totalFindings} findings)`
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function pack(packageName) {
  const result = run(
    "pnpm",
    ["--filter", packageName, "pack", "--pack-destination", tempRoot, "--json"],
    { cwd: root, silent: true }
  );
  const manifest = JSON.parse(result.stdout);
  return manifest.filename;
}

function run(command, args, options = {}) {
  const invocation = resolveInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}\n${output}`);
  }

  if (!options.silent && result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
}

function resolveInvocation(command, args) {
  if (process.platform !== "win32") {
    return { command, args };
  }

  if (command === "pnpm") {
    const pnpmPath =
      process.env.npm_execpath?.endsWith("pnpm.mjs") && process.env.npm_execpath
        ? process.env.npm_execpath
        : join(process.env.APPDATA ?? "", "npm", "node_modules", "pnpm", "bin", "pnpm.mjs");

    return { command: process.execPath, args: [pnpmPath, ...args] };
  }

  if (command === "npm") {
    return {
      command: process.execPath,
      args: [join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args]
    };
  }

  return { command, args };
}
