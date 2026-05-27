import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, sep } from "node:path";

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
  | "invalid_suppression"
  | "rule_error";
export type SuppressionSource = "inline" | "config";

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
  changedSince?: string;
  checkExternalLinks: boolean;
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

export type SuggestedFixConfidence = "high" | "medium" | "low";

export interface SuggestedFix {
  id: string;
  findingId: string;
  ruleId: string;
  documentPath: string;
  documentLine: number;
  confidence: SuggestedFixConfidence;
  description: string;
  unifiedDiff: string;
}

export interface ScannerWarning {
  id: string;
  kind: ScannerWarningKind;
  message: string;
  path?: string;
  lineNumber?: number;
}

export interface AppliedSuppression {
  id: string;
  findingId: string;
  ruleId: string;
  documentPath: string;
  documentLine: number;
  reason: string;
  source: SuppressionSource;
  suppressionPath: string;
  suppressionLine?: number;
}

export interface ScanSummary {
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  suppressedFindingCount: number;
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
  suggestedFixesJson: SuggestedFix[];
  suppressionsJson: AppliedSuppression[];
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
  suggestedFixes?: SuggestedFix[];
  suppressions?: AppliedSuppression[];
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
  docsPaths?: string[];
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

export interface ExternalLinkCheckResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export type ExternalLinkChecker = (url: string) => Promise<ExternalLinkCheckResult>;

export interface ScanDocsDebtInput {
  root: string;
  scannerVersion?: string;
  scannedAt?: string;
  docsPaths?: string[];
  changedOnly?: boolean;
  changedSince?: string;
  changedPaths?: string[];
  checkExternalLinks?: boolean;
  externalLinkChecker?: ExternalLinkChecker;
}

export interface RuleMetadata {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  falsePositiveNote: string;
}

interface SuppressionDirective {
  ruleId: string;
  reason: string;
  source: SuppressionSource;
  suppressionPath: string;
  suppressionLine?: number;
  documentPath?: string;
  targetLine?: number;
  pathPattern?: string;
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

export const V1_RULES: readonly RuleMetadata[] = [
  {
    id: "missing-referenced-file",
    title: "Documented relative file path does not exist",
    severity: "medium",
    description: "Flags relative Markdown file links when the referenced file is absent.",
    falsePositiveNote: "The referenced path may be generated or supplied outside the repository."
  },
  {
    id: "missing-package-script",
    title: "Documented package script does not exist",
    severity: "high",
    description: "Flags documented npm, pnpm, or yarn scripts that are missing from package.json.",
    falsePositiveNote:
      "A script may exist in another workspace package that is outside the scan scope."
  },
  {
    id: "env-var-not-documented",
    title: "Source env var is not documented",
    severity: "high",
    description: "Flags source-referenced env vars missing from Markdown docs and env examples.",
    falsePositiveNote: "The env var may be documented outside Markdown or env example files."
  },
  {
    id: "documented-env-var-not-used",
    title: "Documented env var is not referenced by source",
    severity: "low",
    description: "Flags documented env vars that are not referenced by scanned source files.",
    falsePositiveNote:
      "The env var may be consumed by runtime infrastructure outside the scanned source."
  },
  {
    id: "stale-route-mention",
    title: "Documented route was not found",
    severity: "medium",
    description: "Flags documented routes not found in supported framework conventions.",
    falsePositiveNote:
      "The route may be created dynamically or by middleware outside supported conventions."
  },
  {
    id: "broken-markdown-anchor",
    title: "Markdown link points to a missing heading anchor",
    severity: "medium",
    description: "Flags Markdown links to existing files when the target heading anchor is absent.",
    falsePositiveNote: "Anchor generation can vary across Markdown renderers."
  },
  {
    id: "missing-screenshot",
    title: "Documented image path does not exist",
    severity: "medium",
    description: "Flags Markdown image references when the image file is absent.",
    falsePositiveNote: "The image may be generated by a build step outside the scanner."
  },
  {
    id: "external-link-unreachable",
    title: "External link could not be reached",
    severity: "low",
    description: "Flags external Markdown links that return an unsuccessful status when checked.",
    falsePositiveNote:
      "External sites may block automated checks, require authentication, or fail temporarily."
  },
  {
    id: "workflow-references-missing-script",
    title: "Workflow references a package script or file that does not exist",
    severity: "high",
    description:
      "Flags GitHub Actions run commands that call package scripts or local files missing from the repository.",
    falsePositiveNote:
      "The workflow may run in a subdirectory, generate the file earlier, or use files outside the scan scope."
  }
];

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
    ...(input.changedSince === undefined ? {} : { changedSince: input.changedSince }),
    checkExternalLinks: input.checkExternalLinks,
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
  warnings: readonly ScannerWarning[],
  suppressions: readonly AppliedSuppression[] = []
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
    suppressedFindingCount: suppressions.length,
    warningCount: warnings.length,
    scannedDocumentCount: documents.length,
    claimCount: claims.length,
    factCount: facts.length
  };
}

export function createScanReport(input: CreateScanReportInput): ScanReport {
  const findings = [...input.findings].sort(compareFindings);
  const suggestedFixes = [...(input.suggestedFixes ?? [])].sort(compareSuggestedFixes);
  const suppressions = [...(input.suppressions ?? [])].sort(compareSuppressions);

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
      input.warnings,
      suppressions
    ),
    documentsJson: input.documents.map((document) => ({ ...document })),
    claimsJson: input.claims.map((claim) => ({ ...claim })),
    factsJson: input.facts.map((fact) => ({ ...fact, metadataJson: { ...fact.metadataJson } })),
    findingsJson: findings.map((finding) => ({
      ...finding,
      relatedFactIds: [...finding.relatedFactIds]
    })),
    suggestedFixesJson: suggestedFixes.map((suggestedFix) => ({ ...suggestedFix })),
    suppressionsJson: suppressions.map((suppression) => ({ ...suppression })),
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
    checkExternalLinks: false,
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
    suggestedFixes: [],
    suppressions: [],
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
    (await readMarkdownDocuments(input.root, warnings, input.docsPaths)).sort((left, right) =>
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
  const docsPaths = resolveScanDocsPaths(input);
  const claimsResult = await scanMarkdownClaims({ root: input.root, docsPaths });
  const factsResult = await scanRepositoryFacts({ root: input.root });
  const warnings = [...claimsResult.warnings, ...factsResult.warnings];
  const findings = normalizeHistoricalFindings([
    ...runRules(claimsResult.claims, factsResult.facts),
    ...(input.checkExternalLinks
      ? await findUnreachableExternalLinks(
          claimsResult.claims,
          input.externalLinkChecker ?? checkExternalLink
        )
      : [])
  ]);
  const suppressionDirectives = await readSuppressionDirectives(
    input.root,
    claimsResult.documents,
    warnings
  );
  const suppressionResult = applySuppressions(findings, suppressionDirectives);
  const scannedAt = input.scannedAt ?? new Date().toISOString();
  const scannerVersion = input.scannerVersion ?? "0.0.0";
  const config = createScanConfig({
    root: input.root,
    docsGlobs: docsPaths ?? ["README.md", "docs/**/*.md"],
    ignoreGlobs: ["node_modules/**", "dist/**", "coverage/**"],
    changedOnly: input.changedOnly ?? false,
    ...(input.changedSince === undefined ? {} : { changedSince: input.changedSince }),
    checkExternalLinks: input.checkExternalLinks ?? false,
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
    findings: suppressionResult.findings,
    suggestedFixes: generateSuggestedFixes(claimsResult.documents, suppressionResult.findings),
    suppressions: suppressionResult.suppressions,
    warnings,
    markdown: renderMarkdownFindings(suppressionResult.findings, suppressionResult.suppressions)
  });
}

function resolveScanDocsPaths(input: ScanDocsDebtInput): string[] | undefined {
  if (!input.changedOnly) {
    return input.docsPaths;
  }

  const changedMarkdownPaths = new Set(normalizeChangedMarkdownPaths(input.changedPaths ?? []));

  if (input.docsPaths === undefined) {
    return [...changedMarkdownPaths].sort();
  }

  const requestedPaths = new Set(input.docsPaths.map((path) => normalizePath(path)));

  return [...changedMarkdownPaths]
    .filter(
      (path) =>
        requestedPaths.has(path) ||
        [...requestedPaths].some((prefix) => path.startsWith(`${prefix.replace(/\/$/, "")}/`))
    )
    .sort();
}

function normalizeChangedMarkdownPaths(paths: readonly string[]): string[] {
  return [
    ...new Set(
      paths
        .map((path) => normalizePath(path).replace(/^\.\//, ""))
        .filter((path) => extname(path).toLowerCase() === ".md")
    )
  ].sort();
}

function compareFindings(left: Finding, right: Finding): number {
  return (
    severityOrder.indexOf(left.severity) - severityOrder.indexOf(right.severity) ||
    left.documentPath.localeCompare(right.documentPath) ||
    left.documentLine - right.documentLine ||
    left.ruleId.localeCompare(right.ruleId)
  );
}

function compareSuggestedFixes(left: SuggestedFix, right: SuggestedFix): number {
  return (
    left.documentPath.localeCompare(right.documentPath) ||
    left.documentLine - right.documentLine ||
    left.ruleId.localeCompare(right.ruleId)
  );
}

function compareSuppressions(left: AppliedSuppression, right: AppliedSuppression): number {
  return (
    left.documentPath.localeCompare(right.documentPath) ||
    left.documentLine - right.documentLine ||
    left.ruleId.localeCompare(right.ruleId) ||
    left.source.localeCompare(right.source)
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

function normalizeHistoricalFindings(findings: readonly Finding[]): Finding[] {
  return findings.map((finding) => {
    if (!isHistoricalDocumentPath(finding.documentPath)) {
      return finding;
    }

    return {
      ...finding,
      severity: "info",
      falsePositiveNote: `${finding.falsePositiveNote} Archived or historical docs may intentionally preserve old claims.`
    };
  });
}

function isHistoricalDocumentPath(path: string): boolean {
  const normalizedPath = normalizePath(path).toLowerCase();
  return (
    normalizedPath === "changelog.md" ||
    normalizedPath.endsWith("/changelog.md") ||
    normalizedPath.startsWith("docs/archive/") ||
    normalizedPath.startsWith("docs/archives/")
  );
}

async function findUnreachableExternalLinks(
  claims: readonly Claim[],
  checker: ExternalLinkChecker
): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const claim of claims.filter((candidate) => candidate.kind === "external_url")) {
    const result = await checker(claim.normalizedValue);
    if (result.ok) {
      continue;
    }

    findings.push(
      createFinding({
        ruleId: "external-link-unreachable",
        severity: "low",
        title: "External link could not be reached",
        body: evidenceBody(
          `${claim.documentPath} links to ${claim.normalizedValue}.`,
          externalLinkFailureText(claim.normalizedValue, result)
        ),
        documentPath: claim.documentPath,
        documentLine: claim.lineNumber,
        claimId: claim.id,
        relatedFactIds: [],
        suggestedEdit: `Update or remove the external link to ${claim.normalizedValue}.`,
        falsePositiveNote:
          "External sites may block automated checks, require authentication, or fail temporarily."
      })
    );
  }

  return findings;
}

async function checkExternalLink(url: string): Promise<ExternalLinkCheckResult> {
  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000)
    });

    if (headResponse.status === 405) {
      const getResponse = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(5000)
      });

      return { ok: getResponse.ok, status: getResponse.status };
    }

    return { ok: headResponse.ok, status: headResponse.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown external link check error"
    };
  }
}

function externalLinkFailureText(url: string, result: ExternalLinkCheckResult): string {
  if (result.status !== undefined) {
    return `${url} returned HTTP ${result.status}.`;
  }

  return `${url} could not be checked: ${result.error ?? "unknown error"}.`;
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
  const isFlask = routeFacts.some((fact) => fact.metadataJson.framework === "flask");
  const isDjango = routeFacts.some((fact) => fact.metadataJson.framework === "django");
  const isExpress = routeFacts.some((fact) => fact.metadataJson.framework === "express");

  return claims
    .filter((claim) => claim.kind === "route")
    .filter((claim) => !routeValues.has(claim.normalizedValue))
    .map((claim) => {
      const sourceFile = routeFacts[0]?.sourcePath ?? "source files";
      return createFinding({
        ruleId: "stale-route-mention",
        severity: "medium",
        title: routeMissingTitle({ isFastApi, isFlask, isDjango, isExpress }),
        body: evidenceBody(
          isFastApi
            ? `${claim.documentPath} documents endpoint \`${claim.normalizedValue}\`.`
            : `${claim.documentPath} tells users to open \`${claim.normalizedValue}\`.`,
          isFastApi || isFlask || isDjango || isExpress
            ? `${sourceFile} defines ${routeList}, but not \`${claim.normalizedValue}\`.`
            : `The fixture defines ${routeList}, but not \`${claim.normalizedValue}\`.`
        ),
        documentPath: claim.documentPath,
        documentLine: claim.lineNumber,
        claimId: claim.id,
        relatedFactIds: routeFacts.map((fact) => fact.id),
        suggestedEdit: routeMissingSuggestion({
          route: claim.normalizedValue,
          isFastApi,
          isFlask,
          isDjango,
          isExpress
        }),
        falsePositiveNote:
          "The route may be created dynamically or by middleware outside supported conventions."
      });
    });
}

function routeMissingTitle(input: {
  isFastApi: boolean;
  isFlask: boolean;
  isDjango: boolean;
  isExpress: boolean;
}): string {
  if (input.isFastApi) {
    return "Documented FastAPI route was not found";
  }

  if (input.isFlask) {
    return "Documented Flask route was not found";
  }

  if (input.isDjango) {
    return "Documented Django route was not found";
  }

  if (input.isExpress) {
    return "Documented Express route was not found";
  }

  return "Documented route was not found in the app router";
}

function routeMissingSuggestion(input: {
  route: string;
  isFastApi: boolean;
  isFlask: boolean;
  isDjango: boolean;
  isExpress: boolean;
}): string {
  if (input.isFastApi) {
    return "Update the API docs or add the missing FastAPI route.";
  }

  if (input.isFlask) {
    return "Update the route mention or add the missing Flask route.";
  }

  if (input.isDjango) {
    return "Update the route mention or add the missing Django URL pattern.";
  }

  if (input.isExpress) {
    return "Update the route mention or add the missing Express route.";
  }

  return `Update the route mention or add an app${input.route}/page.tsx route.`;
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
  const existingPaths = new Set(
    facts.filter((fact) => fact.kind === "file_exists").map((fact) => fact.value)
  );
  const commandFacts = facts.filter((fact) => fact.kind === "command_surface");
  const missingPackageScripts = commandFacts
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
  const missingFiles = commandFacts
    .map((fact) => ({ fact, path: parseWorkflowLocalFileCommand(fact.value) }))
    .filter((entry): entry is { fact: CodeFact; path: string } => entry.path !== undefined)
    .filter((entry) => !existingPaths.has(entry.path))
    .map(({ fact, path }) =>
      createFinding({
        ruleId: "workflow-references-missing-script",
        severity: "high",
        title: "Workflow references a file that does not exist",
        body: evidenceBody(
          `The CI workflow runs \`${fact.value}\`.`,
          `\`${path}\` is not present in the repository file tree.`
        ),
        documentPath: fact.sourcePath,
        documentLine: fact.lineNumber,
        claimId: fact.id,
        relatedFactIds: [fact.id],
        suggestedEdit: `Change the workflow command or add ${path}.`,
        falsePositiveNote:
          "The workflow may generate the file earlier or run in a subdirectory outside the scan scope."
      })
    );

  return [...missingPackageScripts, ...missingFiles];
}

function applySuppressions(
  findings: readonly Finding[],
  directives: readonly SuppressionDirective[]
): { findings: Finding[]; suppressions: AppliedSuppression[] } {
  const visibleFindings: Finding[] = [];
  const suppressions: AppliedSuppression[] = [];

  for (const finding of findings) {
    const directive = directives.find((candidate) => suppressionMatchesFinding(candidate, finding));

    if (!directive) {
      visibleFindings.push(finding);
      continue;
    }

    suppressions.push({
      id: createStableId("suppression", [
        finding.id,
        directive.source,
        directive.suppressionPath,
        directive.suppressionLine?.toString() ?? "",
        directive.reason
      ]),
      findingId: finding.id,
      ruleId: finding.ruleId,
      documentPath: finding.documentPath,
      documentLine: finding.documentLine,
      reason: directive.reason,
      source: directive.source,
      suppressionPath: directive.suppressionPath,
      ...(directive.suppressionLine === undefined
        ? {}
        : { suppressionLine: directive.suppressionLine })
    });
  }

  return {
    findings: visibleFindings,
    suppressions
  };
}

function suppressionMatchesFinding(directive: SuppressionDirective, finding: Finding): boolean {
  if (directive.ruleId !== "*" && directive.ruleId !== finding.ruleId) {
    return false;
  }

  if (directive.source === "inline") {
    return (
      directive.documentPath === finding.documentPath &&
      directive.targetLine === finding.documentLine
    );
  }

  return (
    directive.pathPattern === undefined || globMatches(directive.pathPattern, finding.documentPath)
  );
}

async function readSuppressionDirectives(
  root: string,
  documents: readonly DocumentFile[],
  warnings: ScannerWarning[]
): Promise<SuppressionDirective[]> {
  return [
    ...readInlineSuppressionDirectives(documents, warnings),
    ...(await readConfigSuppressionDirectives(root, warnings))
  ];
}

function readInlineSuppressionDirectives(
  documents: readonly DocumentFile[],
  warnings: ScannerWarning[]
): SuppressionDirective[] {
  const directives: SuppressionDirective[] = [];
  const marker = /<!--\s*docs-debt-disable-next-line\s+([a-z0-9-*]+)(?::\s*(.*?))?\s*-->/i;

  for (const document of documents) {
    const lines = document.text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const match = marker.exec(line);
      if (!match) {
        continue;
      }

      const lineNumber = index + 1;
      const ruleId = match[1] ?? "";
      const reason = match[2]?.trim() ?? "";

      if (!reason) {
        warnings.push(
          createScannerWarning({
            kind: "invalid_suppression",
            message: `Inline suppression for ${ruleId} requires a reason.`,
            path: document.path,
            lineNumber
          })
        );
        continue;
      }

      directives.push({
        ruleId,
        reason,
        source: "inline",
        suppressionPath: document.path,
        suppressionLine: lineNumber,
        documentPath: document.path,
        targetLine: lineNumber + 1
      });
    }
  }

  return directives;
}

async function readConfigSuppressionDirectives(
  root: string,
  warnings: ScannerWarning[]
): Promise<SuppressionDirective[]> {
  const configPath = ".docs-debt-radar.json";
  let rawConfig: string;

  try {
    rawConfig = await readFile(join(root, configPath), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    warnings.push(
      createScannerWarning({
        kind: "file_unreadable",
        message: error instanceof Error ? error.message : "Unable to read suppression config.",
        path: configPath
      })
    );
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripUtf8Bom(rawConfig)) as unknown;
  } catch (error) {
    warnings.push(
      createScannerWarning({
        kind: "invalid_suppression",
        message: error instanceof Error ? error.message : "Invalid suppression config JSON.",
        path: configPath
      })
    );
    return [];
  }

  const ignoreEntries =
    isRecord(parsed) && Array.isArray(parsed.ignore) ? (parsed.ignore as unknown[]) : [];
  const directives: SuppressionDirective[] = [];

  for (const [index, entry] of ignoreEntries.entries()) {
    if (!isRecord(entry)) {
      warnings.push(
        createScannerWarning({
          kind: "invalid_suppression",
          message: `Suppression config ignore entry ${index + 1} must be an object.`,
          path: configPath
        })
      );
      continue;
    }

    const ruleId = typeof entry.rule === "string" ? entry.rule.trim() : "";
    const pathPattern = typeof entry.path === "string" ? entry.path.trim() : "";
    const reason = typeof entry.reason === "string" ? entry.reason.trim() : "";

    if (!ruleId || !pathPattern || !reason) {
      warnings.push(
        createScannerWarning({
          kind: "invalid_suppression",
          message: `Suppression config ignore entry ${index + 1} requires rule, path, and reason.`,
          path: configPath
        })
      );
      continue;
    }

    directives.push({
      ruleId,
      reason,
      source: "config",
      suppressionPath: configPath,
      pathPattern: normalizePath(pathPattern).replace(/^\.\//, "")
    });
  }

  return directives;
}

function globMatches(pattern: string, path: string): boolean {
  const normalizedPattern = normalizePath(pattern).replace(/^\.\//, "");
  const normalizedPath = normalizePath(path).replace(/^\.\//, "");
  const doubleStarPlaceholder = "__DOCS_DEBT_DOUBLE_STAR__";
  const escaped = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, doubleStarPlaceholder)
    .replace(/\*/g, "[^/]*")
    .replaceAll(doubleStarPlaceholder, ".*");
  return new RegExp(`^${escaped}$`).test(normalizedPath);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function generateSuggestedFixes(
  documents: readonly DocumentFile[],
  findings: readonly Finding[]
): SuggestedFix[] {
  const documentsByPath = new Map(documents.map((document) => [document.path, document]));
  const fixes: SuggestedFix[] = [];

  for (const finding of findings) {
    const document = documentsByPath.get(finding.documentPath);
    const description = suggestedFixDescription(finding.ruleId);
    if (!document || !description) {
      continue;
    }

    const lineText = document.text.split(/\r?\n/)[finding.documentLine - 1];
    if (!lineText?.trim()) {
      continue;
    }

    const unifiedDiff = renderRemoveLineDiff(finding.documentPath, finding.documentLine, lineText);
    fixes.push({
      id: createStableId("fix", [finding.id, unifiedDiff]),
      findingId: finding.id,
      ruleId: finding.ruleId,
      documentPath: finding.documentPath,
      documentLine: finding.documentLine,
      confidence: "low",
      description,
      unifiedDiff
    });
  }

  return fixes.sort(compareSuggestedFixes);
}

function suggestedFixDescription(ruleId: string): string | undefined {
  if (ruleId === "missing-package-script") {
    return "Remove the stale documentation line or replace it with a current command.";
  }

  if (
    [
      "missing-referenced-file",
      "broken-markdown-anchor",
      "missing-screenshot",
      "external-link-unreachable"
    ].includes(ruleId)
  ) {
    return "Remove the stale documentation line or replace it with a current reference.";
  }

  if (ruleId === "stale-route-mention") {
    return "Remove the stale documentation line or replace it with a current route.";
  }

  if (ruleId === "documented-env-var-not-used") {
    return "Remove the stale documentation line or replace it with a current env var.";
  }

  return undefined;
}

function renderRemoveLineDiff(path: string, lineNumber: number, lineText: string): string {
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -${lineNumber},1 +${lineNumber},0 @@`,
    `-${lineText}`,
    ""
  ].join("\n");
}

function renderMarkdownFindings(
  findings: readonly Finding[],
  suppressions: readonly AppliedSuppression[] = []
): string {
  if (findings.length === 0) {
    return [
      "# Docs Debt Report",
      "",
      "No findings.",
      "",
      `Suppressed findings: ${suppressions.length}`,
      ""
    ].join("\n");
  }

  return [
    "# Docs Debt Report",
    "",
    `Suppressed findings: ${suppressions.length}`,
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
      const parsed = JSON.parse(stripUtf8Bom(text)) as {
        name?: string;
        scripts?: Record<string, string>;
      };

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

      if (looksLikeFlaskSource(text)) {
        for (const route of extractFlaskRoutes(text)) {
          facts.push(
            createCodeFact({
              kind: "route_exists",
              value: route.path,
              sourcePath: file.path,
              lineNumber: route.lineNumber,
              metadata: { framework: "flask", method: route.method }
            })
          );
        }
      }

      if (looksLikeDjangoUrlConf(text)) {
        for (const route of extractDjangoRoutes(text)) {
          facts.push(
            createCodeFact({
              kind: "route_exists",
              value: route.path,
              sourcePath: file.path,
              lineNumber: route.lineNumber,
              metadata: { framework: "django", routeType: "path" }
            })
          );
        }
      }
      continue;
    }

    if ([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(extname(file.path).toLowerCase())) {
      const text = await readTextForFact(root, file.path, warnings);
      if (text === undefined || !looksLikeExpressSource(text)) {
        continue;
      }

      for (const route of extractExpressRoutes(text)) {
        facts.push(
          createCodeFact({
            kind: "route_exists",
            value: route.path,
            sourcePath: file.path,
            lineNumber: route.lineNumber,
            metadata: { framework: "express", method: route.method }
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

function looksLikeFlaskSource(text: string): boolean {
  return /\bfrom\s+flask\s+import\b|\bimport\s+flask\b/.test(text);
}

function extractFlaskRoutes(
  text: string
): Array<{ method: string; path: string; lineNumber: number }> {
  const routes: Array<{ method: string; path: string; lineNumber: number }> = [];
  const routePattern = /@\w+\.route\(\s*["']([^"']+)["']/g;

  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    routePattern.lastIndex = 0;
    const match = routePattern.exec(line);
    if (match?.[1]) {
      routes.push({ method: "route", path: match[1], lineNumber: lineIndex + 1 });
    }
  }

  return routes;
}

function looksLikeDjangoUrlConf(text: string): boolean {
  return /\bfrom\s+django\.urls\s+import\b/.test(text) && /\burlpatterns\s*=/.test(text);
}

function extractDjangoRoutes(text: string): Array<{ path: string; lineNumber: number }> {
  const routes: Array<{ path: string; lineNumber: number }> = [];
  const routePattern = /\bpath\(\s*["']([^"']*)["']/g;

  for (const [lineIndex, line] of text.split(/\r?\n/).entries()) {
    routePattern.lastIndex = 0;
    const match = routePattern.exec(line);
    if (match?.[1] !== undefined) {
      routes.push({ path: normalizeDjangoRoute(match[1]), lineNumber: lineIndex + 1 });
    }
  }

  return routes;
}

function normalizeDjangoRoute(route: string): string {
  return `/${route}`.replace(/\/{2,}/g, "/") || "/";
}

function looksLikeExpressSource(text: string): boolean {
  return /\bfrom\s+["']express["']|\brequire\(\s*["']express["']\s*\)|\bexpress\.Router\(/.test(
    text
  );
}

function extractExpressRoutes(
  text: string
): Array<{ method: string; path: string; lineNumber: number }> {
  const routes: Array<{ method: string; path: string; lineNumber: number }> = [];
  const routePattern =
    /\b(?:app|router)\.(get|post|put|patch|delete|options|head|all|use)\(\s*["'`]([^"'`]+)["'`]/g;

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

function normalizeDocumentRelativeTarget(documentPath: string, target: string): string {
  const hashIndex = target.indexOf("#");
  const targetPath = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const targetAnchor = hashIndex === -1 ? "" : target.slice(hashIndex);

  if (!targetPath) {
    return `${documentPath}${targetAnchor}`;
  }

  if (targetPath.startsWith("/")) {
    return `${normalizePath(targetPath).replace(/^\/+/, "")}${targetAnchor}`;
  }

  const documentDirectory = normalizePath(dirname(documentPath));
  const baseDirectory = documentDirectory === "." ? "" : documentDirectory;
  return `${normalizePath(join(baseDirectory, targetPath)).replace(/^\.\//, "")}${targetAnchor}`;
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
        normalizedValue: normalizeDocumentRelativeTarget(document.path, link.target),
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
  warnings: ScannerWarning[],
  docsPaths?: readonly string[]
): Promise<DocumentFile[]> {
  const markdownPaths =
    docsPaths === undefined
      ? await listMarkdownFiles(root, root)
      : await listRequestedMarkdownFiles(root, docsPaths);
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

async function listRequestedMarkdownFiles(
  root: string,
  docsPaths: readonly string[]
): Promise<string[]> {
  const paths: string[] = [];

  for (const docsPath of docsPaths) {
    const normalizedPath = normalizePath(docsPath).replace(/^\.\//, "");

    if (extname(normalizedPath).toLowerCase() === ".md") {
      paths.push(normalizedPath);
      continue;
    }

    paths.push(...(await listMarkdownFiles(root, join(root, normalizedPath))));
  }

  return [...new Set(paths)].sort();
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

function parseWorkflowLocalFileCommand(command: string): string | undefined {
  const tokens = command.trim().split(/\s+/).map(unquote);
  const [runner, ...args] = tokens;

  if (!runner) {
    return undefined;
  }

  if (["python", "python3", "node", "bash", "sh"].includes(runner)) {
    return args.map(normalizeWorkflowCommandPath).find(isLocalWorkflowCommandPath);
  }

  const directPath = normalizeWorkflowCommandPath(runner);
  return isLocalWorkflowCommandPath(directPath) ? directPath : undefined;
}

function normalizeWorkflowCommandPath(value: string): string {
  return normalizePath(value).replace(/^\.\//, "");
}

function isLocalWorkflowCommandPath(value: string | undefined): value is string {
  return (
    value !== undefined &&
    !value.startsWith("-") &&
    !value.startsWith("../") &&
    /^[\w.-]+\/[\w./-]+\.[A-Za-z0-9]+$/.test(value)
  );
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
