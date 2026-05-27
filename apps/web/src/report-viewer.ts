export type Severity = "high" | "medium" | "low" | "info";
export type SeverityFilter = Severity | "all";

export interface ViewerFinding {
  id?: string;
  ruleId: string;
  severity: Severity;
  title: string;
  body: string;
  documentPath: string;
  documentLine: number;
  suggestedEdit: string;
  falsePositiveNote: string;
}

export interface ViewerReport {
  summaryJson: {
    totalFindings: number;
    bySeverity: Record<Severity, number>;
    suppressedFindingCount: number;
    warningCount: number;
    scannedDocumentCount: number;
    claimCount: number;
    factCount: number;
  };
  findingsJson: ViewerFinding[];
  suppressionsJson?: unknown[];
  warningsJson?: unknown[];
  markdown: string;
}

export interface FindingFilter {
  severity: SeverityFilter;
  query: string;
}

const severityOrder: readonly Severity[] = ["high", "medium", "low", "info"];
const sampleReport: ViewerReport = {
  summaryJson: {
    totalFindings: 2,
    bySeverity: { high: 1, medium: 1, low: 0, info: 0 },
    suppressedFindingCount: 0,
    warningCount: 0,
    scannedDocumentCount: 2,
    claimCount: 5,
    factCount: 12
  },
  findingsJson: [
    {
      id: "sample_missing_package_script",
      ruleId: "missing-package-script",
      severity: "high",
      title: "Documented package script does not exist",
      body: "Claim: README.md says to run `npm run test:e2e`.\nCurrent fact: package.json defines scripts `dev` and `test`, but not `test:e2e`.",
      documentPath: "README.md",
      documentLine: 7,
      suggestedEdit: "Update the README command or add a `test:e2e` script to package.json.",
      falsePositiveNote: "A script may exist in another workspace package."
    },
    {
      id: "sample_missing_referenced_file",
      ruleId: "missing-referenced-file",
      severity: "medium",
      title: "Documented relative file path does not exist",
      body: "Claim: README.md links to `docs/cli.md`.\nCurrent fact: `docs/cli.md` is not present in the fixture file tree.",
      documentPath: "README.md",
      documentLine: 10,
      suggestedEdit: "Create docs/cli.md or remove the stale link from README.md.",
      falsePositiveNote: "The referenced path may be generated."
    }
  ],
  suppressionsJson: [],
  warningsJson: [],
  markdown:
    "# Docs Debt Report\n\nSee docs/demo/basic-node-drift-report.md for the full generated sample.\n"
};

export function parseReportJson(rawJson: string): ViewerReport {
  const parsed = JSON.parse(rawJson) as Partial<ViewerReport>;
  if (!parsed.summaryJson || !Array.isArray(parsed.findingsJson)) {
    throw new Error("Expected a Docs Debt Radar JSON report.");
  }

  return parsed as ViewerReport;
}

export function filterFindings(
  findings: readonly ViewerFinding[],
  filter: FindingFilter
): ViewerFinding[] {
  const query = filter.query.trim().toLowerCase();

  return findings.filter((finding) => {
    const severityMatches = filter.severity === "all" || finding.severity === filter.severity;
    const queryMatches =
      query.length === 0 ||
      [
        finding.ruleId,
        finding.title,
        finding.body,
        finding.documentPath,
        finding.suggestedEdit,
        finding.falsePositiveNote
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return severityMatches && queryMatches;
  });
}

export function renderSummaryCards(report: ViewerReport): string {
  const summary = report.summaryJson;
  const cards: Array<[string, string | number, string]> = [
    ["Total Findings", summary.totalFindings, "visible issues"],
    ["High", summary.bySeverity.high, "must fix"],
    ["Medium", summary.bySeverity.medium, "needs review"],
    ["Suppressed", summary.suppressedFindingCount, "hidden with reasons"],
    ["Warnings", summary.warningCount, "scanner notices"],
    ["Docs Scanned", summary.scannedDocumentCount, "documents"]
  ];

  return cards
    .map(
      ([label, value, caption]) =>
        `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(caption)}</small></article>`
    )
    .join("");
}

export function renderFindingRows(findings: readonly ViewerFinding[]): string {
  if (findings.length === 0) {
    return `<li class="empty-state">No findings match the current filters.</li>`;
  }

  return findings
    .map(
      (finding, index) =>
        `<li><button class="finding-row" type="button" data-index="${index}"><span class="severity severity-${finding.severity}">${finding.severity.toUpperCase()}</span><span><strong>${escapeHtml(finding.title)}</strong><small>${escapeHtml(finding.documentPath)}:${finding.documentLine} · ${escapeHtml(finding.ruleId)}</small></span></button></li>`
    )
    .join("");
}

export function renderFindingDetail(finding: ViewerFinding | undefined): string {
  if (!finding) {
    return `<div class="empty-state">Select a finding to inspect its claim, current fact, and suggested edit.</div>`;
  }

  const [claim, currentFact] = splitEvidence(finding.body);

  return [
    `<div class="detail-header"><span class="severity severity-${finding.severity}">${finding.severity.toUpperCase()}</span><h2>${escapeHtml(finding.title)}</h2></div>`,
    `<p class="location">${escapeHtml(finding.documentPath)}:${finding.documentLine} · ${escapeHtml(finding.ruleId)}</p>`,
    `<section><h3>Claim</h3><p>${escapeHtml(claim)}</p></section>`,
    `<section><h3>Current fact</h3><p>${escapeHtml(currentFact)}</p></section>`,
    `<section><h3>Suggested edit</h3><p>${escapeHtml(finding.suggestedEdit)}</p></section>`,
    `<section><h3>False-positive note</h3><p>${escapeHtml(finding.falsePositiveNote)}</p></section>`
  ].join("");
}

function splitEvidence(body: string): [string, string] {
  const normalized = body.replace(/^Claim:\s*/, "");
  const [claim = body, currentFact = "No current fact was included."] =
    normalized.split(/\nCurrent fact:\s*/);
  return [claim, currentFact];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function initializeViewer(): void {
  const fileInput = document.querySelector<HTMLInputElement>("#report-file");
  const sampleButton = document.querySelector<HTMLButtonElement>("#load-sample");
  const severitySelect = document.querySelector<HTMLSelectElement>("#severity-filter");
  const queryInput = document.querySelector<HTMLInputElement>("#query-filter");
  const summary = document.querySelector<HTMLElement>("#summary");
  const findingList = document.querySelector<HTMLElement>("#finding-list");
  const detail = document.querySelector<HTMLElement>("#finding-detail");
  const exportMarkdown = document.querySelector<HTMLAnchorElement>("#export-markdown");
  const exportJson = document.querySelector<HTMLAnchorElement>("#export-json");
  const status = document.querySelector<HTMLElement>("#status");

  if (
    !fileInput ||
    !sampleButton ||
    !severitySelect ||
    !queryInput ||
    !summary ||
    !findingList ||
    !detail ||
    !exportMarkdown ||
    !exportJson ||
    !status
  ) {
    return;
  }

  let activeReport: ViewerReport | undefined;
  let activeFindings: ViewerFinding[] = [];
  let selectedIndex = 0;

  const render = () => {
    if (!activeReport) {
      return;
    }

    activeFindings = filterFindings(activeReport.findingsJson, {
      severity: severitySelect.value as SeverityFilter,
      query: queryInput.value
    }).sort(compareFindings);
    selectedIndex = Math.min(selectedIndex, Math.max(activeFindings.length - 1, 0));
    summary.innerHTML = renderSummaryCards(activeReport);
    findingList.innerHTML = renderFindingRows(activeFindings);
    detail.innerHTML = renderFindingDetail(activeFindings[selectedIndex]);
    status.textContent = `${activeFindings.length} visible findings`;
    document.body.dataset.reportLoaded = "true";
    setDownload(exportMarkdown, "docs-debt-report.md", activeReport.markdown, "text/markdown");
    setDownload(
      exportJson,
      "docs-debt-report.json",
      `${JSON.stringify(activeReport, null, 2)}\n`,
      "application/json"
    );
  };

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }

    try {
      activeReport = parseReportJson(await file.text());
      selectedIndex = 0;
      render();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Unable to load report.";
    }
  });

  sampleButton.addEventListener("click", async () => {
    activeReport = sampleReport;
    selectedIndex = 0;
    render();
  });

  severitySelect.addEventListener("change", render);
  queryInput.addEventListener("input", render);
  findingList.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-index]");
    if (!button) {
      return;
    }

    selectedIndex = Number(button.dataset.index ?? "0");
    detail.innerHTML = renderFindingDetail(activeFindings[selectedIndex]);
  });

  if (window.location.href.includes("sample=1")) {
    activeReport = sampleReport;
    render();
  }
}

function compareFindings(left: ViewerFinding, right: ViewerFinding): number {
  return (
    severityOrder.indexOf(left.severity) - severityOrder.indexOf(right.severity) ||
    left.documentPath.localeCompare(right.documentPath) ||
    left.documentLine - right.documentLine ||
    left.ruleId.localeCompare(right.ruleId)
  );
}

function setDownload(anchor: HTMLAnchorElement, name: string, content: string, type: string): void {
  if (anchor.href.startsWith("blob:")) {
    URL.revokeObjectURL(anchor.href);
  }

  anchor.download = name;
  anchor.href = URL.createObjectURL(new Blob([content], { type }));
}

if (typeof document !== "undefined") {
  initializeViewer();
}
