import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = process.cwd();
const corpusRoot = path.join(workspace, "Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const collectedDate = "2026-06-12";

const columns = [
  "id",
  "repository",
  "subfolder",
  "title",
  "document_type",
  "year",
  "quarter",
  "publication_date",
  "source_url",
  "download_url",
  "local_path",
  "file_type",
  "source_domain",
  "collected_date",
  "notes",
  "status",
];

const items = [
  {
    idPrefix: "pipe",
    repository: "05_pipeline",
    folder: "05_pipeline/pipeline_pdfs",
    title: "Merck Pipeline 2Q2026 PDF",
    documentType: "pipeline_pdf",
    year: "2026",
    quarter: "Q2",
    publicationDate: "2026-04-30",
    sourceUrl: "https://www.merck.com/research/product-pipeline/",
    downloadUrl: "https://www.merck.com/wp-content/uploads/sites/124/2026/05/Public-Pipeline-2Q2026-Merck.pdf",
    fileName: "2026_Q2_merck_pipeline_reflecting-30-apr-2026.pdf",
    status: "downloaded",
    notes: "Current official Merck pipeline PDF. Pipeline page states it is updated quarterly and updated April 30, 2026.",
  },
  {
    idPrefix: "pipe",
    repository: "05_pipeline",
    folder: "05_pipeline/pipeline_snapshots",
    title: "Merck Product Pipeline Page Snapshot",
    documentType: "pipeline_page_snapshot",
    year: "2026",
    quarter: "Q2",
    publicationDate: "2026-04-30",
    sourceUrl: "https://www.merck.com/research/product-pipeline/",
    downloadUrl: "https://www.merck.com/research/product-pipeline/",
    fileName: "2026-06-12_merck_product-pipeline-page.html",
    status: "snapshot_saved",
    notes: "HTML snapshot of the official pipeline page collected for table/detail context.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/fact_sheets",
    title: "Merck Company Fact Sheet",
    documentType: "company_fact_sheet_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/media/company-fact-sheet/",
    downloadUrl: "https://www.merck.com/media/company-fact-sheet/",
    fileName: "2026-06-12_merck_company-fact-sheet.html",
    status: "snapshot_saved",
    notes: "Official fact sheet snapshot. Page includes 2025 revenue, R&D expense, employee count and company description.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/company_overview",
    title: "Merck Who We Are Page Snapshot",
    documentType: "company_overview_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/company-overview/",
    downloadUrl: "https://www.merck.com/company-overview/",
    fileName: "2026-06-12_merck_who-we-are.html",
    status: "snapshot_saved",
    notes: "Official company overview snapshot.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/company_overview",
    title: "Merck What We Do Page Snapshot",
    documentType: "company_business_overview_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/what-we-do/",
    downloadUrl: "https://www.merck.com/what-we-do/",
    fileName: "2026-06-12_merck_what-we-do.html",
    status: "snapshot_saved",
    notes: "Official snapshot of Merck business/research/partnership/manufacturing overview.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/company_overview",
    title: "Merck Research Overview Page Snapshot",
    documentType: "research_overview_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/research/",
    downloadUrl: "https://www.merck.com/research/",
    fileName: "2026-06-12_merck_research-overview.html",
    status: "snapshot_saved",
    notes: "Official research overview snapshot with areas of focus and R&D context.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/company_overview",
    title: "Merck Business Development and Licensing Page Snapshot",
    documentType: "business_development_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/research/business-development-and-licensing/",
    downloadUrl: "https://www.merck.com/research/business-development-and-licensing/",
    fileName: "2026-06-12_merck_business-development-and-licensing.html",
    status: "snapshot_saved",
    notes: "Official BD&L snapshot for external innovation and partnership context.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/leadership",
    title: "Merck Leadership Overview Page Snapshot",
    documentType: "leadership_overview_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/company-overview/leadership/",
    downloadUrl: "https://www.merck.com/company-overview/leadership/",
    fileName: "2026-06-12_merck_leadership-overview.html",
    status: "snapshot_saved",
    notes: "Official leadership overview snapshot.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/leadership",
    title: "Merck Executive Team Page Snapshot",
    documentType: "executive_team_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/company-overview/leadership/executive-team/",
    downloadUrl: "https://www.merck.com/company-overview/leadership/executive-team/",
    fileName: "2026-06-12_merck_executive-team.html",
    status: "snapshot_saved",
    notes: "Official executive team snapshot.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/culture_values",
    title: "Merck Culture and Values Page Snapshot",
    documentType: "culture_values_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/company-overview/culture-and-values/",
    downloadUrl: "https://www.merck.com/company-overview/culture-and-values/",
    fileName: "2026-06-12_merck_culture-and-values.html",
    status: "snapshot_saved",
    notes: "Official culture and values snapshot.",
  },
  {
    idPrefix: "ctx",
    repository: "06_company_context",
    folder: "06_company_context/products_overview",
    title: "Merck Products List Page Snapshot",
    documentType: "products_list_snapshot",
    year: "2026",
    publicationDate: "2026-06-12",
    sourceUrl: "https://www.merck.com/products/",
    downloadUrl: "https://www.merck.com/products/",
    fileName: "2026-06-12_merck_products-list.html",
    status: "snapshot_saved",
    notes: "Official U.S. product list page snapshot. Individual prescribing information PDFs were not collected in this round.",
  },
];

function csvField(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvLine(row) {
  return columns.map((key) => csvField(row[key])).join(",");
}

function stripExistingRows() {
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return;
  const kept = [
    lines[0],
    ...lines
      .slice(1)
      .filter((line) => !line.includes('"05_pipeline"') && !line.includes('"06_company_context"')),
  ];
  fs.writeFileSync(manifestPath, `${kept.join("\n")}\n`, "utf8");
}

function existingIds() {
  const ids = new Set();
  if (!fs.existsSync(manifestPath)) return ids;
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).slice(1);
  for (const line of lines) {
    const id = line.match(/^"([^"]+)"/)?.[1] ?? "";
    if (id) ids.add(id);
  }
  return ids;
}

function runCurl(url, outputPath) {
  const result = spawnSync(
    "curl.exe",
    ["--noproxy", "*", "-L", "--fail", "--silent", "--show-error", url, "-o", outputPath],
    { stdio: "pipe", encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `curl exited ${result.status}`).trim());
  }
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function nextIdFactory(ids, prefix) {
  let counter = 1;
  while (ids.has(`${prefix}-${String(counter).padStart(4, "0")}`)) counter += 1;
  return () => {
    let id;
    do {
      id = `${prefix}-${String(counter).padStart(4, "0")}`;
      counter += 1;
    } while (ids.has(id));
    ids.add(id);
    return id;
  };
}

stripExistingRows();
const ids = existingIds();
const nextPipeId = nextIdFactory(ids, "pipe");
const nextCtxId = nextIdFactory(ids, "ctx");
const rows = [];

for (const item of items) {
  fs.mkdirSync(path.join(corpusRoot, ...item.folder.split("/")), { recursive: true });
  const relPath = `${item.folder}/${item.fileName}`;
  const outputPath = path.join(corpusRoot, ...relPath.split("/"));
  const row = {
    id: item.idPrefix === "pipe" ? nextPipeId() : nextCtxId(),
    repository: item.repository,
    subfolder: item.folder,
    title: item.title,
    document_type: item.documentType,
    year: item.year,
    quarter: item.quarter || "",
    publication_date: item.publicationDate,
    source_url: item.sourceUrl,
    download_url: item.downloadUrl,
    local_path: relPath,
    file_type: path.extname(item.fileName).replace(".", ""),
    source_domain: domainFromUrl(item.downloadUrl),
    collected_date: collectedDate,
    notes: item.notes,
    status: item.status,
  };

  try {
    runCurl(item.downloadUrl, outputPath);
    rows.push(row);
  } catch (error) {
    rows.push({
      ...row,
      local_path: "",
      notes: `Download/snapshot failed: ${String(error.message || error).slice(0, 240)}`,
      status: "failed",
    });
  }
}

fs.appendFileSync(manifestPath, `${rows.map(csvLine).join("\n")}\n`, "utf8");

function writeIndex(repository, fileName, indexRows) {
  const filePath = path.join(corpusRoot, repository, fileName);
  fs.writeFileSync(filePath, `${columns.join(",")}\n${indexRows.map(csvLine).join("\n")}\n`, "utf8");
}

writeIndex("05_pipeline", "major_documents.csv", rows.filter((row) => row.repository === "05_pipeline"));
writeIndex("06_company_context", "major_documents.csv", rows.filter((row) => row.repository === "06_company_context"));

const pipelineRows = rows.filter((row) => row.repository === "05_pipeline");
const contextRows = rows.filter((row) => row.repository === "06_company_context");
const statusCounts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

fs.writeFileSync(
  path.join(corpusRoot, "05_pipeline", "README.md"),
  `# Merck Pipeline

Official Merck pipeline materials collected from Merck's product pipeline page.

## Scope

- Current pipeline PDF: 2Q2026, reflecting pipeline to April 30, 2026
- Pipeline page snapshot collected on ${collectedDate}
- The official pipeline page states that the table is updated quarterly.

## Contents

- \`pipeline_pdfs/\`: official pipeline PDF
- \`pipeline_snapshots/\`: HTML snapshot of the current product pipeline page
- \`major_documents.csv\`: index of collected pipeline items

Source: https://www.merck.com/research/product-pipeline/
`,
  "utf8",
);

fs.writeFileSync(
  path.join(corpusRoot, "06_company_context", "README.md"),
  `# Merck Company Context

Official Merck context pages collected as HTML snapshots for hackathon grounding.

## Scope

- Company fact sheet
- Company overview and business overview
- Research overview and BD&L overview
- Leadership overview and executive team
- Culture and values
- U.S. products list page

## Contents

- \`fact_sheets/\`: company fact sheet snapshot
- \`company_overview/\`: who-we-are, what-we-do, research and BD&L snapshots
- \`leadership/\`: leadership and executive team snapshots
- \`culture_values/\`: culture and values snapshot
- \`products_overview/\`: U.S. products list page snapshot
- \`major_documents.csv\`: index of collected company context snapshots

Notes:

- These are date-stamped snapshots, not a historical archive.
- Individual product prescribing-information PDFs were intentionally not collected in this round.
`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      rows: rows.length,
      pipeline_rows: pipelineRows.length,
      company_context_rows: contextRows.length,
      status_counts: statusCounts,
    },
    null,
    2,
  ),
);
