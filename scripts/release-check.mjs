import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const metadataOnly = args.includes("--metadata-only");
const expectedVersion = readOption("--version") ?? readPackage("package.json").version;

if (!isSemver(expectedVersion)) {
  fail(`Release version must be semver, received: ${expectedVersion}`);
}

validateReleaseMetadata(expectedVersion);
console.log(`Release metadata OK for ${expectedVersion}`);

if (!metadataOnly) {
  validateTrackedWorktreeClean();

  for (const [command, commandArgs] of [
    ["pnpm", ["format"]],
    ["pnpm", ["lint"]],
    ["pnpm", ["typecheck"]],
    ["pnpm", ["test"]],
    ["pnpm", ["build"]],
    ["pnpm", ["smoke:action"]],
    ["pnpm", ["pack:dry-run"]],
    ["pnpm", ["smoke:packed"]]
  ]) {
    run(command, commandArgs);
  }

  console.log(`Release checks OK for ${expectedVersion}`);
}

function validateReleaseMetadata(version) {
  const rootPackage = readPackage("package.json");
  const corePackage = readPackage("packages/core/package.json");
  const cliPackage = readPackage("apps/cli/package.json");
  const actionPackage = readPackage("apps/action/package.json");
  const webPackage = readPackage("apps/web/package.json");

  for (const [name, packageJson] of [
    ["root", rootPackage],
    ["@docs-debt-radar/core", corePackage],
    ["@docs-debt-radar/cli", cliPackage],
    ["@docs-debt-radar/action", actionPackage],
    ["@docs-debt-radar/web", webPackage]
  ]) {
    if (packageJson.version !== version) {
      fail(`${name} version is ${packageJson.version}, expected ${version}`);
    }
  }

  if (cliPackage.dependencies?.["@docs-debt-radar/core"] !== `workspace:${version}`) {
    fail(`@docs-debt-radar/cli must depend on @docs-debt-radar/core as workspace:${version}`);
  }

  const changelog = readFileSync("CHANGELOG.md", "utf8");
  if (!changelog.includes(`## ${version}`)) {
    fail(`CHANGELOG.md is missing a ## ${version} section`);
  }
}

function validateTrackedWorktreeClean() {
  const status = run("git", ["status", "--porcelain", "--untracked-files=no"], {
    silent: true
  }).stdout.trim();

  if (status) {
    fail(`Tracked worktree changes must be committed before release:\n${status}`);
  }
}

function readPackage(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readOption(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function isSemver(version) {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version);
}

function run(command, commandArgs, options = {}) {
  const invocation = resolveInvocation(command, commandArgs);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.silent ? "pipe" : "inherit"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    fail(`${command} ${commandArgs.join(" ")} failed with exit ${result.status}\n${output}`);
  }

  return result;
}

function resolveInvocation(command, commandArgs) {
  if (process.platform !== "win32") {
    return { command, args: commandArgs };
  }

  if (command === "pnpm") {
    const pnpmPath =
      process.env.npm_execpath?.endsWith("pnpm.mjs") && process.env.npm_execpath
        ? process.env.npm_execpath
        : join(process.env.APPDATA ?? "", "npm", "node_modules", "pnpm", "bin", "pnpm.mjs");

    return { command: process.execPath, args: [pnpmPath, ...commandArgs] };
  }

  if (command === "git") {
    return { command: "git", args: commandArgs };
  }

  return { command, args: commandArgs };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
