import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type Severity = "info" | "low" | "medium" | "high";

interface FixtureManifestEntry {
  id: string;
  description: string;
  projectTypes: string[];
  expectedReport: string;
  coversFailingRules: string[];
  coversPassingRules: string[];
}

interface FixtureManifest {
  fixtures: FixtureManifestEntry[];
}

interface ExpectedFinding {
  ruleId: string;
  severity: Severity;
  documentPath: string;
  documentLine: number;
  title: string;
  evidence: {
    claim: string;
    currentFact: string;
  };
  suggestedAction: string;
}

interface ExpectedReport {
  fixtureId: string;
  summary: {
    totalFindings: number;
    bySeverity: Record<Severity, number>;
  };
  findings: ExpectedFinding[];
}

const repoRoot = join(__dirname, "../../..");
const fixturesRoot = join(repoRoot, "tests", "fixtures");
const manifestPath = join(fixturesRoot, "fixture-manifest.json");

const v1Rules = [
  "missing-referenced-file",
  "missing-package-script",
  "env-var-not-documented",
  "documented-env-var-not-used",
  "stale-route-mention",
  "broken-markdown-anchor",
  "missing-screenshot",
  "workflow-references-missing-script"
];

const requiredProjectTypes = [
  "node",
  "nextjs",
  "fastapi",
  "flask",
  "django",
  "express",
  "nestjs",
  "hono",
  "github-actions",
  "docs-assets-env"
];

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("fixture contract", () => {
  it("defines fixtures for every first-supported project type and V1 rule", () => {
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = readJson<FixtureManifest>(manifestPath);
    const projectTypes = new Set(manifest.fixtures.flatMap((fixture) => fixture.projectTypes));
    const failingRules = new Set(
      manifest.fixtures.flatMap((fixture) => fixture.coversFailingRules)
    );
    const passingRules = new Set(
      manifest.fixtures.flatMap((fixture) => fixture.coversPassingRules)
    );

    expect(manifest.fixtures.map((fixture) => fixture.id).sort()).toEqual([
      "basic-node-drift",
      "docs-assets-env-drift",
      "express-route-drift",
      "github-actions-drift",
      "hono-route-drift",
      "nestjs-route-drift",
      "nextjs-route-drift",
      "python-django-drift",
      "python-fastapi-drift",
      "python-flask-drift"
    ]);

    for (const projectType of requiredProjectTypes) {
      expect(projectTypes.has(projectType), `missing project type ${projectType}`).toBe(true);
    }

    for (const rule of v1Rules) {
      expect(failingRules.has(rule), `missing failing coverage for ${rule}`).toBe(true);
      expect(passingRules.has(rule), `missing passing coverage for ${rule}`).toBe(true);
    }
  });

  it("keeps expected reports internally consistent and evidence-backed", () => {
    const manifest = readJson<FixtureManifest>(manifestPath);

    for (const fixture of manifest.fixtures) {
      const fixtureRoot = join(fixturesRoot, fixture.id);
      const reportPath = join(fixtureRoot, fixture.expectedReport);
      const report = readJson<ExpectedReport>(reportPath);

      expect(existsSync(join(fixtureRoot, "README.md")), `${fixture.id} needs README.md`).toBe(
        true
      );
      expect(report.fixtureId).toBe(fixture.id);
      expect(report.summary.totalFindings).toBe(report.findings.length);

      const actualCounts: Record<Severity, number> = {
        info: 0,
        low: 0,
        medium: 0,
        high: 0
      };

      for (const finding of report.findings) {
        actualCounts[finding.severity] += 1;
        expect(finding.title.trim()).not.toHaveLength(0);
        expect(finding.documentPath.trim()).not.toHaveLength(0);
        expect(finding.documentLine).toBeGreaterThan(0);
        expect(finding.evidence.claim.trim()).not.toHaveLength(0);
        expect(finding.evidence.currentFact.trim()).not.toHaveLength(0);
        expect(finding.suggestedAction.trim()).not.toHaveLength(0);
      }

      expect(report.summary.bySeverity).toEqual(actualCounts);
    }
  });
});
