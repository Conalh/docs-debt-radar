import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), "docs-debt-radar-action-smoke-"));
const workspace = join(tempRoot, "workspace");
const fixturePath = resolve(root, "tests/fixtures/basic-node-drift");
const outputPath = join(tempRoot, "github-output.txt");
const summaryPath = join(tempRoot, "github-summary.md");
const reportPath = join(workspace, "docs-debt-report.md");

try {
  run("pnpm", ["build"], { cwd: root });
  cpSync(fixturePath, workspace, { recursive: true });

  const action = run(process.execPath, [join(root, "apps/action/dist/index.js")], {
    cwd: workspace,
    env: {
      ...process.env,
      DOCS_DEBT_RADAR_CLI_PATH: join(root, "apps/cli/dist/index.js"),
      GITHUB_ACTION_PATH: root,
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      GITHUB_WORKSPACE: workspace,
      INPUT_FAIL_ON: "none",
      INPUT_PATH: ".",
      INPUT_REPORT_FORMAT: "markdown",
      INPUT_REPORT_PATH: "docs-debt-report.md"
    },
    silent: true
  });

  if (action.status !== 0) {
    throw new Error(`Action smoke expected exit 0, received ${action.status}`);
  }

  assertFileContains(reportPath, "## HIGH: Documented package script does not exist");
  assertFileContains(summaryPath, "| Total findings | 2 |");
  assertFileContains(outputPath, "exit-code=0");
  assertFileContains(outputPath, "total-findings=2");

  console.log(`GitHub Action smoke OK (${workspace} produced 2 report-only findings)`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function assertFileContains(path, expected) {
  if (!existsSync(path)) {
    throw new Error(`Expected ${path} to exist`);
  }

  const content = readFileSync(path, "utf8");
  if (!content.includes(expected)) {
    throw new Error(`Expected ${path} to contain ${expected}`);
  }
}

function run(command, args, options = {}) {
  const invocation = resolveInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    stdio: options.silent ? "pipe" : "inherit"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}\n${output}`);
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
