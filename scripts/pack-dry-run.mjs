import { spawnSync } from "node:child_process";
import { join } from "node:path";

const packages = ["@docs-debt-radar/core", "@docs-debt-radar/cli"];

run("pnpm", ["build"]);

for (const packageName of packages) {
  const result = run("pnpm", ["--filter", packageName, "pack", "--dry-run", "--json"], {
    silent: true
  });
  const manifest = JSON.parse(result.stdout);
  const paths = manifest.files.map((file) => file.path).sort();
  const unexpected = paths.filter((path) => !isAllowedPackPath(path));

  if (unexpected.length > 0) {
    throw new Error(
      `${packageName} dry-run pack includes unexpected files:\n${unexpected.join("\n")}`
    );
  }

  for (const requiredPath of ["package.json", "README.md", "LICENSE", "dist/index.js"]) {
    if (!paths.includes(requiredPath)) {
      throw new Error(`${packageName} dry-run pack is missing ${requiredPath}`);
    }
  }

  if (JSON.stringify(manifest).includes("workspace:")) {
    throw new Error(`${packageName} dry-run pack still contains a workspace dependency.`);
  }

  console.log(`${packageName} pack surface OK (${paths.length} files)`);
}

function isAllowedPackPath(path) {
  return (
    path === "package.json" ||
    path === "README.md" ||
    path === "LICENSE" ||
    path.startsWith("dist/")
  );
}

function run(command, args, options = {}) {
  const invocation = resolveInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
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
  if (process.platform !== "win32" || command !== "pnpm") {
    return { command, args };
  }

  const pnpmPath =
    process.env.npm_execpath?.endsWith("pnpm.mjs") && process.env.npm_execpath
      ? process.env.npm_execpath
      : join(process.env.APPDATA ?? "", "npm", "node_modules", "pnpm", "bin", "pnpm.mjs");

  return { command: process.execPath, args: [pnpmPath, ...args] };
}
