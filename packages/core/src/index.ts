import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";

import remarkParse from "remark-parse";
import { unified } from "unified";

export type Severity = "high" | "medium" | "low" | "info";
export type FailThreshold = "none" | Severity;
export type OutputFormat = "text" | "markdown" | "json";
export type DocumentKind =
  | "readme"
  | "docs"
  | "changelog"
  | "contributing"
  | "workflow_docs"
  | "other";
export type Confidence = "high" | "medium" | "low";

export type ClaimKind =
  | "command"
  | "file_ref"
  | "env_var"
  | "route"
  | "package_script"
  | "image_ref"
  | "workflow_ref"
  | "config_ref"
  | "external_url";

export type CodeFactKind =
  | "file_exists"
  | "package_script"
  | "env_var_declared"
  | "route_exists"
  | "workflow_exists"
  | "image_exists"
  | "config_key"
  | "command_surface";

export type ScannerWarningKind =
  | "file_skipped"
  | "file_unreadable"
  | "file_too_large"
  | "unsupported_framework"
  | "rule_error";

export interface SourceSpan {
  lineNumber: number;
  columnNumber?: number;
  endLineNumber?: number;
  endColumnNumber?: number;
}

export interface ScanConfig {
  root: string;
  docsGlobs: string[];
  ignoreGlobs: string[];
  changedOnly: boolean;
  failOn: FailThreshold;
  outputFormat: OutputFormat;
  maxFileSizeBytes: number;
}

export interface DocumentHeading extends SourceSpan {
  text: string;
  anchor: string;
}

export interface DocumentLink extends SourceSpan {
  label: string;
  target: string;
  isImage: boolean;
}

export interface DocumentCodeBlock extends SourceSpan {
  language: string | null;
  text: string;
}

export interface DocumentInlineCode extends SourceSpan {
  text: string;
}

export interface DocumentFile {
  id: string;
  path: string;
  kind: DocumentKind;
  text: string;
  headings: DocumentHeading[];
  links: DocumentLink[];
  codeBlocks: DocumentCodeBlock[];
  inlineCode: DocumentInlineCode[];
}

export interface Claim {
  id: string;
  documentPath: string;
  lineNumber: number;
  kind: ClaimKind;
  rawText: string;
  normalizedValue: string;
  context: string;
  confidence: Confidence;
}

export interface CodeFact {
  id: string;
  kind: CodeFactKind;
  value: string;
  sourcePath: string;
  lineNumber: number;
  metadataJson: Record<string, unknown>;
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: Severity;
  title: string;
  body: string;
  documentPath: string;
  documentLine: number;
  claimId: string;
  relatedFactIds: string[];
  suggestedEdit: string;
  falsePositiveNote: string;
}

export interface ScannerWarning {
  id: string;
  kind: ScannerWarningKind;
  message: string;
  path?: string;
  lineNumber?: number;
}

export interface ScanSummary {
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  warningCount: number;
  scannedDocumentCount: number;
  claimCount: number;
  factCount: number;
}

export interface ScanReport {
  id: string;
  repoRoot: string;
  scannedAt: string;
  scannerVersion: string;
  config: ScanConfig;
  summaryJson: ScanSummary;
  documentsJson: DocumentFile[];
  claimsJson: Claim[];
  factsJson: CodeFact[];
  findingsJson: Finding[];
  warningsJson: ScannerWarning[];
  markdown: string;
}

export interface CreateClaimInput {
  documentPath: string;
  lineNumber: number;
  kind: ClaimKind;
  rawText: string;
  normalizedValue: string;
  context: string;
  confidence: Confidence;
}

export interface CreateCodeFactInput {
  kind: CodeFactKind;
  value: string;
  sourcePath: string;
  lineNumber: number;
  metadata?: Record<string, unknown>;
}

export interface CreateFindingInput {
  ruleId: string;
  severity: Severity;
  title: string;
  body: string;
  documentPath: string;
  documentLine: number;
  claimId: string;
  relatedFactIds: string[];
  suggestedEdit: string;
  falsePositiveNote: string;
}

export interface CreateScannerWarningInput {
  kind: ScannerWarningKind;
  message: string;
  path?: string;
  lineNumber?: number;
}

export interface CreateScanReportInput {
  repoRoot: string;
  scannedAt: string;
  scannerVersion: string;
  config: ScanConfig;
  documents: DocumentFile[];
  claims: Claim[];
  facts: CodeFact[];
  findings: Finding[];
  warnings: ScannerWarning[];
  markdown: string;
}

export interface ParseMarkdownDocumentInput {
  path: string;
  text: string;
}

export interface ScanMarkdownClaimsInput {
  root: string;
  documents?: DocumentFile[];
}

export interface ScanMarkdownClaimsResult {
  documents: DocumentFile[];
  claims: Claim[];
  warnings: ScannerWarning[];
}

export interface ScanRepositoryFactsInput {
  root: string;
}

export interface ScanRepositoryFactsResult {
  facts: CodeFact[];
  warnings: ScannerWarning[];
}

export interface ScanDocsDebtInput {
  root: string;
  scannerVersion?: string;
  scannedAt?: string;
}

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  lang?: string | null;
  children?: MarkdownNode[];
  position?: {
    start: {
      line: number;
      column?: number;
    };
    end?: {
      line: number;
      column?: number;
    };
  };
}

const severityOrder: Severity[] = ["high", "medium", "low", "info"];
const shellLanguages = new Set(["bash", "shell", "sh", "zsh", "console"]);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage"]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);

export function createStableId(namespace: string, parts: readonly string[]): string {
  const input = `${namespace}:${parts.join("\u001f")}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${namespace}_${(hash >>> 0).toString(36)}`;
}

export function createScanConfig(input: ScanConfig): ScanConfig {
  return {
    root: input.root,
    docsGlobs: [...input.docsGlobs],
    ignoreGlobs: [...input.ignoreGlobs],
    changedOnly: input.changedOnly,
    failOn: input.failOn,
    outputFormat: input.outputFormat,
    maxFileSizeBytes: input.maxFileSizeBytes
  };
}

export function createDocumentFile(input: Omit<DocumentFile, "id">): DocumentFile {
  return {
    id: createStableId("document", [input.path]),
    path: input.path,
    kind: input.kind,
    text: input.text,
    headings: input.headings.map((heading) => ({ ...heading })),
    links: input.links.map((link) => ({ ...link })),
    codeBlocks: input.codeBlocks.map((codeBlock) => ({ ...codeBlock })),
    inlineCode: input.inlineCode.map((inlineCode) => ({ ...inlineCode }))
  };
}

export function createClaim(input: CreateClaimInput): Claim {
  return {
    id: createStableId("claim", [
      input.documentPath,
      input.lineNumber.toString(),
      input.kind,
      input.normalizedValue
    ]),
    documentPath: input.documentPath,
    lineNumber: input.lineNumber,
    kind: input.kind,
    rawText: input.rawText,
    normalizedValue: input.normalizedValue,
    context: input.context,
    confidence: input.confidence
  };
}

export function createCodeFact(input: CreateCodeFactInput): CodeFact {
  return {
    id: createStableId("fact", [
      input.kind,
      input.value,
      input.sourcePath,
      input.lineNumber.toString()
    ]),
    kind: input.kind,
    value: input.value,
    sourcePath: input.sourcePath,
    lineNumber: input.lineNumber,
    metadataJson: input.metadata ? { ...input.metadata } : {}
  };
}

export function createFinding(input: CreateFindingInput): Finding {
  return {
    id: createStableId("finding", [input.ruleId, input.claimId, ...input.relatedFactIds]),
    ruleId: input.ruleId,
    severity: input.severity,
    title: input.title,
    body: input.body,
    documentPath: input.documentPath,
    documentLine: input.documentLine,
    claimId: input.claimId,
    relatedFactIds: [...input.relatedFactIds],
    suggestedEdit: input.suggestedEdit,
    falsePositiveNote: input.falsePositiveNote
  };
}

export function createScannerWarning(input: CreateScannerWarningInput): ScannerWarning {
  return {
    id: createStableId("warning", [
      input.kind,
      input.path ?? "",
      input.lineNumber?.toString() ?? "",
      input.message
    ]),
    kind: input.kind,
    message: input.message,
    ...(input.path === undefined ? {} : { path: input.path }),
    ...(input.lineNumber === undefined ? {} : { lineNumber: input.lineNumber })
  };
}

export function summarizeFindings(
  findings: readonly Finding[],
  documents: readonly DocumentFile[],
  claims: readonly Claim[],
  facts: readonly CodeFact[],
  warnings: readonly ScannerWarning[]
): ScanSummary {
  const bySeverity: Record<Severity, number> = {
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };

  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
  }

  return {
    totalFindings: findings.length,
    bySeverity,
    warningCount: warnings.length,
    scannedDocumentCount: documents.length,
    claimCount: claims.length,
    factCount: facts.length
  };
}

export function createScanReport(input: CreateScanReportInput): ScanReport {
  const findings = [...input.findings].sort(compareFindings);

  return {
    id: createStableId("scan", [input.repoRoot, input.scannedAt, input.scannerVersion]),
    repoRoot: input.repoRoot,
    scannedAt: input.scannedAt,
    scannerVersion: input.scannerVersion,
    config: createScanConfig(input.config),
    summaryJson: summarizeFindings(
      findings,
      input.documents,
      input.claims,
      input.facts,
      input.warnings
    ),
    documentsJson: input.documents.map((document) => ({ ...document })),
    claimsJson: input.claims.map((claim) => ({ ...claim })),
    factsJson: input.facts.map((fact) => ({ ...fact, metadataJson: { ...fact.metadataJson } })),
    findingsJson: findings.map((finding) => ({
      ...finding,
      relatedFactIds: [...finding.relatedFactIds]
    })),
    warningsJson: input.warnings.map((warning) => ({ ...warning })),
    markdown: input.markdown
  };
}

export function createEmptyScanReport(input: {
  repoRoot: string;
  scannerVersion: string;
  scannedAt: string;
}): ScanReport {
  const config = createScanConfig({
    root: input.repoRoot,
    docsGlobs: ["README.md", "docs/**/*.md"],
    ignoreGlobs: ["node_modules/**", "dist/**"],
    changedOnly: false,
    failOn: "none",
    outputFormat: "json",
    maxFileSizeBytes: 1000000
  });

  return createScanReport({
    repoRoot: input.repoRoot,
    scannedAt: input.scannedAt,
    scannerVersion: input.scannerVersion,
    config,
    documents: [],
    claims: [],
    facts: [],
    findings: [],
    warnings: [],
    markdown: ""
  });
}

export function parseMarkdownDocument(input: ParseMarkdownDocumentInput): DocumentFile {
  const tree = unified().use(remarkParse).parse(input.text) as MarkdownNode;
  const headings: DocumentHeading[] = [];
  const links: DocumentLink[] = [];
  const codeBlocks: DocumentCodeBlock[] = [];
  const inlineCode: DocumentInlineCode[] = [];

  walkMarkdown(tree, (node) => {
    const lineNumber = node.position?.start.line ?? 1;

    if (node.type === "heading") {
      const text = markdownText(node);
      headings.push({
        text,
        anchor: slugifyHeading(text),
        lineNumber
      });
      return;
    }

    if (node.type === "link" && node.url) {
      links.push({
        label: markdownText(node),
        target: node.url,
        isImage: false,
        lineNumber
      });
      return;
    }

    if (node.type === "image" && node.url) {
      links.push({
        label: node.alt ?? "",
        target: node.url,
        isImage: true,
        lineNumber
      });
      return;
    }

    if (node.type === "inlineCode" && node.value !== undefined) {
      inlineCode.push({
        text: node.value,
        lineNumber
      });
      return;
    }

    if (node.type === "code" && node.value !== undefined) {
      codeBlocks.push({
        language: node.lang ?? null,
        text: node.value,
        lineNumber
      });
    }
  });

  return createDocumentFile({
    path: input.path,
    kind: inferDocumentKind(input.path),
    text: input.text,
    headings,
    links,
    codeBlocks,
    inlineCode
  });
}

export async function scanMarkdownClaims(
  input: ScanMarkdownClaimsInput
): Promise<ScanMarkdownClaimsResult> {
  const warnings: ScannerWarning[] = [];
  const documents =
    input.documents ??
    (await readMarkdownDocuments(input.root, warnings)).sort((left, right) =>
      left.path.localeCompare(right.path)
    );

  return {
    documents,
    claims: documents.flatMap(extractClaimsFromDocument),
    warnings
  };
}

export async function scanRepositoryFacts(
  input: ScanRepositoryFactsInput
): Promise<ScanRepositoryFactsResult> {
  const warnings: ScannerWarning[] = [];
  const entries = await listRepositoryEntries(input.root, input.root);
  const files = entries.filter((entry) => entry.entryType === "file");
  const facts: CodeFact[] = [];

  facts.push(...extractFileTreeFacts(entries));
  facts.push(...(await extractMarkdownAnchorFacts(input.root, files, warnings)));
  facts.push(...(await extractPackageScriptFacts(input.root, files, warnings)));
  facts.push(...(await extractEnvFacts(input.root, files, warnings)));
  facts.push(...(await extractRouteFacts(input.root, files, warnings)));
  facts.push(...(await extractWorkflowFacts(input.root, files, warnings)));

  return {
    facts: facts.sort(compareFacts),
    warnings
  };
}

export async function scanDocsDebt(input: ScanDocsDebtInput): Promise<ScanReport> {
  const claimsResult = await scanMarkdownClaims({ root: input.root });
  const factsResult = await scanRepositoryFacts({ root: input.root });
  const findings = runRules(claimsResult.claims, factsResult.facts);
  const scannedAt = input.scannedAt ?? new Date().toISOString();
  const scannerVersion = input.scannerVersion ?? "0.0.0";
  const config = createScanConfig({
    root: input.root,
    docsGlobs: ["README.md", "docs/**/*.md"],
    ignoreGlobs: ["node_modules/**", "dist/**", "coverage/**"],
    changedOnly: false,
    failOn: "none",
    outputFormat: "json",
    maxFileSizeBytes: 1000000
  });

  return createScanReport({
    repoRoot: input.root,
    scannedAt,
    scannerVersion,
    config,
    documents: claimsResult.documents,
    claims: claimsResult.claims,
    facts: factsResult.facts,
    findings,
    warnings: [...claimsResult.warnings, ...factsResult.warnings],
    markdown: renderMarkdownFindings(findings)
  });
}

function compareFindings(left: Finding, right: Finding): number {
  return (
    severityOrder.indexOf(left.severity) - severityOrder.indexOf(right.severity) ||
    left.documentPath.localeCompare(right.documentPath) ||
    left.documentLine - right.documentLine ||
    left.ruleId.localeCompare(right.ruleId)
  );
}

function runRules(claims: readonly Claim[], facts: readonly CodeFact[]): Finding[] {
  return [
    ...findMissingReferencedFiles(claims, facts),
    ...findMissingPackageScripts(claims, facts),
    ...findEnvVarsNotDocumented(claims, facts),
    ...findDocumentedEnvVarsNotUsed(claims, facts),
    ...findStaleRoutes(claims, facts),
    ...findBrokenMarkdownAnchors(claims, facts),
    ...findMissingScreenshots(claims, facts),
    ...findWorkflowMissingScripts(facts)
  ];
}

function findMissingReferencedFiles(
  claims: readonly Claim[],
  facts: readonly CodeFact[]
): Finding[] {
  const existingPaths = new Set(
    facts.filter((fact) => fact.kind === "file_exists").map((fact) => fact.value)
  );

  return claims
    .filter((claim) => claim.kind === "file_ref")
    .filter((claim) => !existingPaths.has(stripAnchor(claim.normalizedValue)))
    .map((claim) =>
      createFinding({
        ruleId: "missing-referenced-file",
        severity: claim.documentPath.toLowerCase() === "readme.md" ? "medium" : "low",
        title: "Documented relative file path does not exist",
        body: evidenceBody(
          `${claim.documentPath} links to \`${claim.normalizedValue}\`.`,
          `\`${stripAnchor(claim.normalizedValue)}\` is not present in the fixture file tree.`
        ),
        documentPath: claim.documentPath,
        documentLine: claim.lineNumber,
        claimId: claim.id,
        relatedFactIds: [],
        suggestedEdit: `Create ${stripAnchor(claim.normalizedValue)} or remove the stale link from ${claim.documentPath}.`,
        falsePositiveNote:
          "The referenced path may be generated or supplied outside the repository."
      })
    );
}

function findMissingPackageScripts(
  claims: readonly Claim[],
  facts: readonly CodeFact[]
): Finding[] {
  const scriptFacts = facts.filter((fact) => fact.kind === "package_script");
  const scriptNames = new Set(scriptFacts.map((fact) => fact.value));
  const definedScripts = formatList([...scriptNames].sort());

  return claims
    .filter((claim) => claim.kind === "package_script")
    .filter((claim) => !scriptNames.has(claim.normalizedValue))
    .map((claim) =>
      createFinding({
        ruleId: "missing-package-script",
        severity: ["dev", "build", "test", "test:e2e"].includes(claim.normalizedValue)
          ? "high"
          : "medium",
        title: "Documented package script does not exist",
        body: evidenceBody(
          `${claim.documentPath} says to run \`${claim.rawText}\`.`,
          `package.json defines scripts ${definedScripts}, but not \`${claim.normalizedValue}\`.`
        ),
        documentPath: claim.documentPath,
        documentLine: claim.lineNumber,
        claimId: claim.id,
        relatedFactIds: scriptFacts.map((fact) => fact.id),
        suggestedEdit: `Update the README command or add a \`${claim.normalizedValue}\` script to package.json.`,
        falsePositiveNote:
          "A script may exist in another workspace package that is outside the scan scope."
      })
    );
}

function findEnvVarsNotDocumented(claims: readonly Claim[], facts: readonly CodeFact[]): Finding[] {
  const documentedEnvVars = new Set([
    ...claims.filter((claim) => claim.kind === "env_var").map((claim) => claim.normalizedValue),
    ...facts
      .filter(
        (fact) => fact.kind === "env_var_declared" && fact.metadataJson.envSource === "example"
      )
      .map((fact) => fact.value)
  ]);

  return facts
    .filter(
      (fact) =>
        fact.kind === "env_var_declared" && fact.metadataJson.envSource === "source_reference"
    )
    .filter((fact) => !documentedEnvVars.has(fact.value))
    .map((fact) =>
      createFinding({
        ruleId: "env-var-not-documented",
        severity: envVarLooksSensitive(fact.value) ? "high" : "medium",
        title: "Source env var is not documented",
        body: evidenceBody(
          `Source code reads \`${fact.value}\`.`,
          `${documentationSurfaceForEnv(claims, facts)} document ${formatEnvList(documentedEnvVars)}, but not \`${fact.value}\`.`
        ),
        documentPath: fact.sourcePath,
        documentLine: fact.lineNumber,
        claimId: fact.id,
        relatedFactIds: [fact.id],
        suggestedEdit: `Document ${fact.value} in setup docs or .env.example, or remove the unused source reference.`,
        falsePositiveNote: "The env var may be documented outside Markdown or env example files."
      })
    );
}

function findDocumentedEnvVarsNotUsed(
  claims: readonly Claim[],
  facts: readonly CodeFact[]
): Finding[] {
  const sourceEnvVars = new Set(
    facts
      .filter(
        (fact) =>
          fact.kind === "env_var_declared" && fact.metadataJson.envSource === "source_reference"
      )
      .map((fact) => fact.value)
  );
  const documentedClaims = claims.filter((claim) => claim.kind === "env_var");

  return documentedClaims
    .filter((claim) => !sourceEnvVars.has(claim.normalizedValue))
    .map((claim) =>
      createFinding({
        ruleId: "documented-env-var-not-used",
        severity: "low",
        title: "Documented env var is not referenced by source",
        body: evidenceBody(
          `${claim.documentPath} tells users to set \`${claim.normalizedValue}\`.`,
          `The fixture source and .env.example reference ${formatEnvList(sourceEnvVars)}, but not \`${claim.normalizedValue}\`.`
        ),
        documentPath: claim.documentPath,
        documentLine: claim.lineNumber,
        claimId: claim.id,
        relatedFactIds: facts
          .filter((fact) => fact.kind === "env_var_declared" && sourceEnvVars.has(fact.value))
          .map((fact) => fact.id),
        suggestedEdit: `Remove ${claim.normalizedValue} from setup docs or add the source/config reference that uses it.`,
        falsePositiveNote:
          "The env var may be consumed by runtime infrastructure outside the scanned source."
      })
    );
}

function findStaleRoutes(claims: readonly Claim[], facts: readonly CodeFact[]): Finding[] {
  const routeFacts = facts.filter((fact) => fact.kind === "route_exists");
  const routeValues = new Set(routeFacts.map((fact) => fact.value));
  const routeList = formatList([...routeValues].sort(compareRouteDisplayValues));
  const isFastApi = routeFacts.some((fact) => fact.metadataJson.framework === "fastapi");

  return claims
    .filter((claim) => claim.kind === "route")
    .filter((claim) => !routeValues.has(claim.normalizedValue))
    .map((claim) => {
      const sourceFile = routeFacts[0]?.sourcePath ?? "source files";
      return createFinding({
        ruleId: "stale-route-mention",
        severity: "medium",
        title: isFastApi
          ? "Documented FastAPI route was not found"
          : "Documented route was not found in the app router",
        body: evidenceBody(
          isFastApi
            ? `${claim.documentPath} documents endpoint \`${claim.normalizedValue}\`.`
            : `${claim.documentPath} tells users to open \`${claim.normalizedValue}\`.`,
          isFastApi
            ? `${sourceFile} defines ${routeList}, but not \`${claim.normalizedValue}\`.`
            : `The fixture defines ${routeList}, but not \`${claim.normalizedValue}\`.`
        ),
        documentPath: claim.documentPath,
        documentLine: claim.lineNumber,
        claimId: claim.id,
        relatedFactIds: routeFacts.map((fact) => fact.id),
        suggestedEdit: isFastApi
          ? "Update the API docs or add the missing FastAPI route."
          : `Update the route mention or add an app${claim.normalizedValue}/page.tsx route.`,
        falsePositiveNote:
          "The route may be created dynamically or by middleware outside supported conventions."
      });
    });
}

function findBrokenMarkdownAnchors(
  claims: readonly Claim[],
  facts: readonly CodeFact[]
): Finding[] {
  const existingPaths = new Set(
    facts.filter((fact) => fact.kind === "file_exists").map((fact) => fact.value)
  );
  const anchorFacts = facts.filter(
    (fact) => fact.kind === "config_key" && fact.metadataJson.configType === "markdown_anchor"
  );
  const anchors = new Set(anchorFacts.map((fact) => fact.value));

  return claims
    .filter((claim) => claim.kind === "file_ref" && claim.normalizedValue.includes("#"))
    .filter((claim) => existingPaths.has(stripAnchor(claim.normalizedValue)))
    .filter((claim) => !anchors.has(claim.normalizedValue))
    .map((claim) => {
      const fileAnchors = anchorFacts
        .filter((fact) => fact.sourcePath === stripAnchor(claim.normalizedValue))
        .map((fact) => `#${fact.value.split("#")[1]}`)
        .sort();

      return createFinding({
        ruleId: "broken-markdown-anchor",
        severity: "medium",
        title: "Markdown link points to a missing heading anchor",
        body: evidenceBody(
          `${claim.documentPath} links to \`${claim.normalizedValue}\`.`,
          `\`${stripAnchor(claim.normalizedValue)}\` exists, but it only defines the ${formatList(fileAnchors)} anchors.`
        ),
        documentPath: claim.documentPath,
        documentLine: claim.lineNumber,
        claimId: claim.id,
        relatedFactIds: anchorFacts.map((fact) => fact.id),
        suggestedEdit: `Change the link to an existing heading or add an \`${headingFromAnchor(claim.normalizedValue)}\` heading to ${stripAnchor(claim.normalizedValue)}.`,
        falsePositiveNote: "Anchor generation can vary across Markdown renderers."
      });
    });
}

function findMissingScreenshots(claims: readonly Claim[], facts: readonly CodeFact[]): Finding[] {
  const existingPaths = new Set(
    facts.filter((fact) => fact.kind === "file_exists").map((fact) => fact.value)
  );

  return claims
    .filter((claim) => claim.kind === "image_ref")
    .filter((claim) => !existingPaths.has(claim.normalizedValue))
    .map((claim) =>
      createFinding({
        ruleId: "missing-screenshot",
        severity: claim.documentPath.toLowerCase() === "readme.md" ? "medium" : "low",
        title: "Documented image path does not exist",
        body: evidenceBody(
          `${claim.documentPath} references \`${claim.normalizedValue}\`.`,
          `\`${claim.normalizedValue}\` is not present in the fixture file tree.`
        ),
        documentPath: claim.documentPath,
        documentLine: claim.lineNumber,
        claimId: claim.id,
        relatedFactIds: [],
        suggestedEdit: "Add the missing image or remove the stale screenshot reference.",
        falsePositiveNote: "The image may be generated by a build step outside the scanner."
      })
    );
}

function findWorkflowMissingScripts(facts: readonly CodeFact[]): Finding[] {
  const scriptFacts = facts.filter((fact) => fact.kind === "package_script");
  const scriptNames = new Set(scriptFacts.map((fact) => fact.value));
  const definedScripts = formatList([...scriptNames].sort());

  return facts
    .filter((fact) => fact.kind === "command_surface")
    .map((fact) => ({ fact, scriptName: parsePackageScriptCommand(fact.value) }))
    .filter(
      (entry): entry is { fact: CodeFact; scriptName: string } => entry.scriptName !== undefined
    )
    .filter((entry) => !scriptNames.has(entry.scriptName))
    .map(({ fact, scriptName }) =>
      createFinding({
        ruleId: "workflow-references-missing-script",
        severity: "high",
        title: "Workflow references a package script that does not exist",
        body: evidenceBody(
          `The CI workflow runs \`${fact.value}\`.`,
          `package.json defines scripts ${definedScripts}, but not \`${scriptName}\`.`
        ),
        documentPath: fact.sourcePath,
        documentLine: fact.lineNumber,
        claimId: fact.id,
        relatedFactIds: [fact.id, ...scriptFacts.map((scriptFact) => scriptFact.id)],
        suggestedEdit: `Change the workflow command or add a \`${scriptName}\` script to package.json.`,
        falsePositiveNote:
          "The workflow may run in a subdirectory with a separate package manifest."
      })
    );
}

function renderMarkdownFindings(findings: readonly Finding[]): string {
  if (findings.length === 0) {
    return "# Docs Debt Report\n\nNo findings.\n";
  }

  return [
    "# Docs Debt Report",
    "",
    ...[...findings]
      .sort(compareFindings)
      .map(
        (finding) =>
          `## ${finding.severity.toUpperCase()}: ${finding.title}\n\n${finding.documentPath}:${finding.documentLine}\n\n${finding.body}\n\nSuggested edit: ${finding.suggestedEdit}\n`
      )
  ].join("\n");
}

interface RepositoryEntry {
  path: string;
  entryType: "file" | "directory";
}

function extractFileTreeFacts(entries: readonly RepositoryEntry[]): CodeFact[] {
  return entries.map((entry) =>
    createCodeFact({
      kind: "file_exists",
      value: entry.path,
      sourcePath: entry.path,
      lineNumber: 1,
      metadata: { entryType: entry.entryType }
    })
  );
}

async function extractMarkdownAnchorFacts(
  root: string,
  files: readonly RepositoryEntry[],
  warnings: ScannerWarning[]
): Promise<CodeFact[]> {
  const facts: CodeFact[] = [];

  for (const file of files.filter((entry) => extname(entry.path).toLowerCase() === ".md")) {
    try {
      const text = await readFile(join(root, file.path), "utf8");
      const document = parseMarkdownDocument({ path: file.path, text });

      for (const heading of document.headings) {
        facts.push(
          createCodeFact({
            kind: "config_key",
            value: `${file.path}#${heading.anchor}`,
            sourcePath: file.path,
            lineNumber: heading.lineNumber,
            metadata: { configType: "markdown_anchor", heading: heading.text }
          })
        );
      }
    } catch (error) {
      warnings.push(
        createScannerWarning({
          kind: "file_unreadable",
          message: error instanceof Error ? error.message : "Unable to read Markdown file.",
          path: file.path
        })
      );
    }
  }

  return facts;
}

async function extractPackageScriptFacts(
  root: string,
  files: readonly RepositoryEntry[],
  warnings: ScannerWarning[]
): Promise<CodeFact[]> {
  const facts: CodeFact[] = [];

  for (const file of files.filter((entry) => basename(entry.path) === "package.json")) {
    try {
      const text = await readFile(join(root, file.path), "utf8");
      const parsed = JSON.parse(text) as { name?: string; scripts?: Record<string, string> };

      for (const [scriptName, command] of Object.entries(parsed.scripts ?? {})) {
        facts.push(
          createCodeFact({
            kind: "package_script",
            value: scriptName,
            sourcePath: file.path,
            lineNumber: findLineNumber(text, `"${scriptName}"`),
            metadata: {
              packageName: parsed.name ?? null,
              command
            }
          })
        );
      }
    } catch (error) {
      warnings.push(
        createScannerWarning({
          kind: "file_unreadable",
          message: error instanceof Error ? error.message : "Unable to parse package.json.",
          path: file.path
        })
      );
    }
  }

  return facts;
}

async function extractEnvFacts(
  root: string,
  files: readonly RepositoryEntry[],
  warnings: ScannerWarning[]
): Promise<CodeFact[]> {
  const facts: CodeFact[] = [];

  for (const file of files) {
    if (basename(file.path).startsWith(".env") && basename(file.path).includes("example")) {
      const text = await readTextForFact(root, file.path, warnings);
      if (text === undefined) {
        continue;
      }

      for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
        const match = /^([A-Z][A-Z0-9_]*)\s*=/.exec(line.trim());
        if (!match?.[1]) {
          continue;
        }

        facts.push(
          createCodeFact({
            kind: "env_var_declared",
            value: match[1],
            sourcePath: file.path,
            lineNumber: lineIndex + 1,
            metadata: { envSource: "example" }
          })
        );
      }
    }

    if (!sourceExtensions.has(extname(file.path).toLowerCase())) {
      continue;
    }

    const text = await readTextForFact(root, file.path, warnings);
    if (text === undefined) {
      continue;
    }

    for (const reference of extractEnvReferences(text)) {
      facts.push(
        createCodeFact({
          kind: "env_var_declared",
          value: reference.name,
          sourcePath: file.path,
          lineNumber: reference.lineNumber,
          metadata: { envSource: "source_reference" }
        })
      );
    }
  }

  return facts;
}

async function extractRouteFacts(
  root: string,
  files: readonly RepositoryEntry[],
  warnings: ScannerWarning[]
): Promise<CodeFact[]> {
  const facts: CodeFact[] = [];

  for (const file of files) {
    const normalizedPath = normalizePath(file.path);

    if (/^app\/.+\/page\.(?:tsx|ts|jsx|js)$/.test(normalizedPath)) {
      facts.push(
        createCodeFact({
          kind: "route_exists",
          value: nextRouteFromAppPath(normalizedPath, "page"),
          sourcePath: file.path,
          lineNumber: 1,
          metadata: { framework: "nextjs", routeType: "page" }
        })
      );
      continue;
    }

    if (/^app\/.+\/route\.(?:tsx|ts|jsx|js)$/.test(normalizedPath)) {
      facts.push(
        createCodeFact({
          kind: "route_exists",
          value: nextRouteFromAppPath(normalizedPath, "route"),
          sourcePath: file.path,
          lineNumber: 1,
          metadata: {
            framework: "nextjs",
            routeType: normalizedPath.includes("/api/") ? "api" : "route"
          }
        })
      );
      continue;
    }

    if (extname(file.path).toLowerCase() === ".py") {
      const text = await readTextForFact(root, file.path, warnings);
      if (text === undefined) {
        continue;
      }

      for (const route of extractFastApiRoutes(text)) {
        facts.push(
          createCodeFact({
            kind: "route_exists",
            value: route.path,
            sourcePath: file.path,
            lineNumber: route.lineNumber,
            metadata: { framework: "fastapi", method: route.method }
          })
        );
      }
    }
  }

  return facts;
}

async function extractWorkflowFacts(
  root: string,
  files: readonly RepositoryEntry[],
  warnings: ScannerWarning[]
): Promise<CodeFact[]> {
  const facts: CodeFact[] = [];

  for (const file of files.filter((entry) =>
    /^\.github\/workflows\/.+\.ya?ml$/.test(normalizePath(entry.path))
  )) {
    const text = await readTextForFact(root, file.path, warnings);
    if (text === undefined) {
      continue;
    }

    const workflowName = /^name:\s*(.+)$/m.exec(text)?.[1]?.trim();
    if (workflowName) {
      facts.push(
        createCodeFact({
          kind: "workflow_exists",
          value: unquote(workflowName),
          sourcePath: file.path,
          lineNumber: findLineNumber(text, "name:"),
          metadata: { fileName: basename(file.path) }
        })
      );
    }

    for (const command of extractWorkflowRunCommands(text)) {
      facts.push(
        createCodeFact({
          kind: "command_surface",
          value: command.command,
          sourcePath: file.path,
          lineNumber: command.lineNumber,
          metadata: { commandSource: "github_actions" }
        })
      );
    }
  }

  return facts;
}

async function listRepositoryEntries(root: string, current: string): Promise<RepositoryEntry[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const paths: RepositoryEntry[] = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = join(current, entry.name);
    const relativePath = normalizePath(relative(root, absolutePath));

    if (entry.isDirectory()) {
      paths.push({ path: relativePath, entryType: "directory" });
      paths.push(...(await listRepositoryEntries(root, absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      paths.push({ path: relativePath, entryType: "file" });
    }
  }

  return paths.sort((left, right) => left.path.localeCompare(right.path));
}

async function readTextForFact(
  root: string,
  path: string,
  warnings: ScannerWarning[]
): Promise<string | undefined> {
  try {
    return await readFile(join(root, path), "utf8");
  } catch (error) {
    warnings.push(
      createScannerWarning({
        kind: "file_unreadable",
        message: error instanceof Error ? error.message : "Unable to read file.",
        path
      })
    );
    return undefined;
  }
}

function extractEnvReferences(text: string): Array<{ name: string; lineNumber: number }> {
  const references: Array<{ name: string; lineNumber: number }> = [];
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g,
    /os\.environ\[['"]([A-Z][A-Z0-9_]*)['"]\]/g,
    /os\.getenv\(['"]([A-Z][A-Z0-9_]*)['"]\)/g
  ];

  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(line)) !== null) {
        if (match[1]) {
          references.push({ name: match[1], lineNumber: lineIndex + 1 });
        }
      }
    }
  }

  return references;
}

function extractFastApiRoutes(
  text: string
): Array<{ method: string; path: string; lineNumber: number }> {
  const routes: Array<{ method: string; path: string; lineNumber: number }> = [];
  const routePattern = /@app\.(get|post|put|patch|delete|options|head)\(\s*["']([^"']+)["']/g;

  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    routePattern.lastIndex = 0;
    const match = routePattern.exec(line);
    if (match?.[1] && match[2]) {
      routes.push({ method: match[1], path: match[2], lineNumber: lineIndex + 1 });
    }
  }

  return routes;
}

function extractWorkflowRunCommands(text: string): Array<{ command: string; lineNumber: number }> {
  const commands: Array<{ command: string; lineNumber: number }> = [];

  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    const match = /^\s*-\s+run:\s*(.+)$/.exec(line);
    if (match?.[1]) {
      commands.push({ command: unquote(match[1].trim()), lineNumber: lineIndex + 1 });
    }
  }

  return commands;
}

function nextRouteFromAppPath(path: string, terminalFile: "page" | "route"): string {
  const segments = path.split("/");
  const terminalIndex = segments.findIndex((segment) => segment.startsWith(`${terminalFile}.`));
  const routeSegments = segments
    .slice(1, terminalIndex)
    .filter((segment) => !segment.startsWith("(") && !segment.startsWith("@"));

  return `/${routeSegments.join("/")}`.replace(/\/$/, "") || "/";
}

function findLineNumber(text: string, needle: string): number {
  const index = text.split(/\r?\n/).findIndex((line) => line.includes(needle));
  return index === -1 ? 1 : index + 1;
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function compareFacts(left: CodeFact, right: CodeFact): number {
  return (
    left.kind.localeCompare(right.kind) ||
    left.sourcePath.localeCompare(right.sourcePath) ||
    left.lineNumber - right.lineNumber ||
    left.value.localeCompare(right.value)
  );
}

function evidenceBody(claim: string, currentFact: string): string {
  return `Claim: ${claim}\nCurrent fact: ${currentFact}`;
}

function stripAnchor(value: string): string {
  return value.split("#")[0] ?? value;
}

function headingFromAnchor(value: string): string {
  const anchor = value.split("#")[1] ?? value;
  return anchor
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function formatList(values: Iterable<string>): string {
  const list = [...values];

  if (list.length === 0) {
    return "nothing";
  }

  if (list.length === 1) {
    return `\`${list[0]}\``;
  }

  return `${list
    .slice(0, -1)
    .map((value) => `\`${value}\``)
    .join(", ")} and \`${list[list.length - 1]}\``;
}

function formatEnvList(values: Iterable<string>): string {
  return formatList([...values].sort());
}

function envVarLooksSensitive(value: string): boolean {
  return /(?:KEY|TOKEN|SECRET|DATABASE|AUTH|PASSWORD)/.test(value);
}

function documentationSurfaceForEnv(claims: readonly Claim[], facts: readonly CodeFact[]): string {
  const hasReadmeMention = claims.some((claim) => claim.kind === "env_var");
  const hasEnvExample = facts.some(
    (fact) => fact.kind === "env_var_declared" && fact.metadataJson.envSource === "example"
  );

  if (hasReadmeMention && hasEnvExample) {
    return "README.md and .env.example";
  }

  if (hasReadmeMention) {
    return "README.md";
  }

  if (hasEnvExample) {
    return ".env.example";
  }

  return "The scanned docs";
}

function compareRouteDisplayValues(left: string, right: string): number {
  const leftIsApi = left.startsWith("/api/");
  const rightIsApi = right.startsWith("/api/");

  if (leftIsApi !== rightIsApi) {
    return leftIsApi ? 1 : -1;
  }

  return left.localeCompare(right);
}

function extractClaimsFromDocument(document: DocumentFile): Claim[] {
  const claims: Claim[] = [];

  for (const link of document.links) {
    if (isExternalUrl(link.target)) {
      claims.push(
        createClaim({
          documentPath: document.path,
          lineNumber: link.lineNumber,
          kind: "external_url",
          rawText: link.target,
          normalizedValue: link.target,
          context: link.label,
          confidence: "high"
        })
      );
      continue;
    }

    claims.push(
      createClaim({
        documentPath: document.path,
        lineNumber: link.lineNumber,
        kind: link.isImage ? "image_ref" : "file_ref",
        rawText: link.target,
        normalizedValue: link.target,
        context: link.label,
        confidence: "high"
      })
    );
  }

  for (const inlineCode of document.inlineCode) {
    const claim = claimFromInlineCode(document, inlineCode);
    if (claim) {
      claims.push(claim);
    }
  }

  for (const codeBlock of document.codeBlocks) {
    if (!isShellCodeBlock(codeBlock)) {
      continue;
    }

    for (const line of codeBlock.text.split(/\r?\n/)) {
      const command = normalizeShellCommandLine(line);
      if (!command) {
        continue;
      }

      claims.push(
        createClaim({
          documentPath: document.path,
          lineNumber: codeBlock.lineNumber,
          kind: "command",
          rawText: line,
          normalizedValue: command,
          context: codeBlock.text,
          confidence: "high"
        })
      );
    }
  }

  return claims.sort(
    (left, right) =>
      left.documentPath.localeCompare(right.documentPath) ||
      left.lineNumber - right.lineNumber ||
      left.kind.localeCompare(right.kind) ||
      left.normalizedValue.localeCompare(right.normalizedValue)
  );
}

function claimFromInlineCode(
  document: DocumentFile,
  inlineCode: DocumentInlineCode
): Claim | undefined {
  const normalized = inlineCode.text.trim();

  if (!normalized) {
    return undefined;
  }

  const packageScript = parsePackageScriptCommand(normalized);
  if (packageScript) {
    return createClaim({
      documentPath: document.path,
      lineNumber: inlineCode.lineNumber,
      kind: "package_script",
      rawText: inlineCode.text,
      normalizedValue: packageScript,
      context: inlineCode.text,
      confidence: "high"
    });
  }

  if (looksLikeCommand(normalized)) {
    return createClaim({
      documentPath: document.path,
      lineNumber: inlineCode.lineNumber,
      kind: "command",
      rawText: inlineCode.text,
      normalizedValue: normalized,
      context: inlineCode.text,
      confidence: "high"
    });
  }

  if (looksLikeEnvVar(normalized)) {
    return createClaim({
      documentPath: document.path,
      lineNumber: inlineCode.lineNumber,
      kind: "env_var",
      rawText: inlineCode.text,
      normalizedValue: normalized,
      context: inlineCode.text,
      confidence: "high"
    });
  }

  if (looksLikeRoute(normalized)) {
    return createClaim({
      documentPath: document.path,
      lineNumber: inlineCode.lineNumber,
      kind: "route",
      rawText: inlineCode.text,
      normalizedValue: normalized,
      context: inlineCode.text,
      confidence: "high"
    });
  }

  if (looksLikeRelativeFileRef(normalized)) {
    return createClaim({
      documentPath: document.path,
      lineNumber: inlineCode.lineNumber,
      kind: "file_ref",
      rawText: inlineCode.text,
      normalizedValue: normalized,
      context: inlineCode.text,
      confidence: "medium"
    });
  }

  return undefined;
}

async function readMarkdownDocuments(
  root: string,
  warnings: ScannerWarning[]
): Promise<DocumentFile[]> {
  const markdownPaths = await listMarkdownFiles(root, root);
  const documents: DocumentFile[] = [];

  for (const markdownPath of markdownPaths) {
    const absolutePath = join(root, markdownPath);
    try {
      const text = await readFile(absolutePath, "utf8");
      documents.push(parseMarkdownDocument({ path: markdownPath, text }));
    } catch (error) {
      warnings.push(
        createScannerWarning({
          kind: "file_unreadable",
          message: error instanceof Error ? error.message : "Unable to read Markdown file.",
          path: markdownPath
        })
      );
    }
  }

  return documents;
}

async function listMarkdownFiles(root: string, current: string): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") {
      continue;
    }

    const absolutePath = join(current, entry.name);
    const relativePath = normalizePath(relative(root, absolutePath));

    if (entry.isDirectory()) {
      if (["node_modules", "dist", "coverage"].includes(entry.name)) {
        continue;
      }

      paths.push(...(await listMarkdownFiles(root, absolutePath)));
      continue;
    }

    if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") {
      paths.push(relativePath);
    }
  }

  return paths.sort();
}

function walkMarkdown(node: MarkdownNode, visitor: (node: MarkdownNode) => void): void {
  visitor(node);

  for (const child of node.children ?? []) {
    walkMarkdown(child, visitor);
  }
}

function markdownText(node: MarkdownNode): string {
  if (node.value !== undefined) {
    return node.value;
  }

  return (node.children ?? []).map(markdownText).join("");
}

function inferDocumentKind(path: string): DocumentKind {
  const fileName = basename(path).toLowerCase();
  const normalized = normalizePath(path).toLowerCase();

  if (fileName === "readme.md") {
    return "readme";
  }

  if (fileName === "changelog.md") {
    return "changelog";
  }

  if (fileName === "contributing.md") {
    return "contributing";
  }

  if (normalized.includes(".github/workflows") || normalized.includes("workflow")) {
    return "workflow_docs";
  }

  if (normalized.startsWith("docs/")) {
    return "docs";
  }

  return "other";
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function isExternalUrl(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(target);
}

function parsePackageScriptCommand(command: string): string | undefined {
  const match = /^(?:npm|pnpm|yarn)\s+run\s+([A-Za-z0-9:_-]+)(?:\s|$)/.exec(command);
  return match?.[1];
}

function looksLikeCommand(value: string): boolean {
  return /^(?:npm|pnpm|yarn|node|python|python3|uvicorn|cargo|dotnet)\b/.test(value);
}

function looksLikeEnvVar(value: string): boolean {
  return /^[A-Z][A-Z0-9_]{2,}$/.test(value);
}

function looksLikeRoute(value: string): boolean {
  return /^\/[A-Za-z0-9_./:[\]-]*$/.test(value) && !/\.[A-Za-z0-9]+$/.test(value);
}

function looksLikeRelativeFileRef(value: string): boolean {
  return (
    !isExternalUrl(value) &&
    !looksLikeRoute(value) &&
    (value.startsWith("./") || value.startsWith("../") || /^[\w.-]+\/[\w./#-]+$/.test(value))
  );
}

function isShellCodeBlock(codeBlock: DocumentCodeBlock): boolean {
  return codeBlock.language === null || shellLanguages.has(codeBlock.language.toLowerCase());
}

function normalizeShellCommandLine(line: string): string | undefined {
  const trimmed = line.trim().replace(/^\$\s*/, "");

  if (!trimmed || trimmed.startsWith("#")) {
    return undefined;
  }

  return trimmed;
}
