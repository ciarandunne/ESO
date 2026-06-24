import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = process.cwd();
const corpusRoot = path.join(workspace, "Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const collectedDate = "2026-06-12";
const repository = "05_pipeline";
const sourcePage = "https://www.merck.com/research/product-pipeline/";

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
    title: "Merck Pipeline 1Q2026 PDF",
    documentType: "pipeline_pdf",
    year: "2026",
    quarter: "Q1",
    publicationDate: "2026-01-31",
    folder: "05_pipeline/pipeline_pdfs",
    downloadUrl: "https://www.merck.com/wp-content/uploads/sites/124/2026/02/Public-Pipeline-1Q2026-Merck.pdf",
    fileName: "2026_Q1_merck_pipeline_reflecting-31-jan-2026.pdf",
    notes: "Verified official merck.com pipeline PDF upload. Added as historical comparator to 2Q2026.",
    status: "downloaded",
  },
  {
    title: "Merck Pipeline 2Q2026 PDF",
    documentType: "pipeline_pdf",
    year: "2026",
    quarter: "Q2",
    publicationDate: "2026-04-30",
    folder: "05_pipeline/pipeline_pdfs",
    downloadUrl: "https://www.merck.com/wp-content/uploads/sites/124/2026/05/Public-Pipeline-2Q2026-Merck.pdf",
    fileName: "2026_Q2_merck_pipeline_reflecting-30-apr-2026.pdf",
    notes: "Current official Merck pipeline PDF. Pipeline page states it is updated quarterly and updated April 30, 2026.",
    status: "downloaded",
  },
  {
    title: "Merck Product Pipeline Page Snapshot",
    documentType: "pipeline_page_snapshot",
    year: "2026",
    quarter: "Q2",
    publicationDate: "2026-04-30",
    folder: "05_pipeline/pipeline_snapshots",
    downloadUrl: sourcePage,
    fileName: "2026-06-12_merck_product-pipeline-page.html",
    notes: "HTML snapshot of the official pipeline page collected for table/detail context.",
    status: "snapshot_saved",
  },
];

function csvField(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvLine(row) {
  return columns.map((key) => csvField(row[key])).join(",");
}

function stripExistingPipelineRows() {
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return;
  const kept = [lines[0], ...lines.slice(1).filter((line) => !line.includes(`"${repository}"`))];
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

function nextIdFactory(ids) {
  let counter = 1;
  while (ids.has(`pipe-${String(counter).padStart(4, "0")}`)) counter += 1;
  return () => {
    let id;
    do {
      id = `pipe-${String(counter).padStart(4, "0")}`;
      counter += 1;
    } while (ids.has(id));
    ids.add(id);
    return id;
  };
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

stripExistingPipelineRows();
const nextId = nextIdFactory(existingIds());
const rows = [];

for (const item of items) {
  fs.mkdirSync(path.join(corpusRoot, ...item.folder.split("/")), { recursive: true });
  const relPath = `${item.folder}/${item.fileName}`;
  const outputPath = path.join(corpusRoot, ...relPath.split("/"));
  const row = {
    id: nextId(),
    repository,
    subfolder: item.folder,
    title: item.title,
    document_type: item.documentType,
    year: item.year,
    quarter: item.quarter,
    publication_date: item.publicationDate,
    source_url: sourcePage,
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
      notes: `Download/snapshot failed: ${String(error.message || error).slice(0, 240)} | ${item.notes}`,
      status: "failed",
    });
  }
}

fs.appendFileSync(manifestPath, `${rows.map(csvLine).join("\n")}\n`, "utf8");
fs.writeFileSync(
  path.join(corpusRoot, repository, "major_documents.csv"),
  `${columns.join(",")}\n${rows.map(csvLine).join("\n")}\n`,
  "utf8",
);

const readme = `# Merck Pipeline

Official Merck pipeline materials collected from Merck's product pipeline page and verified merck.com pipeline PDF uploads.

## Scope

- Current pipeline PDF: 2Q2026, reflecting pipeline to April 30, 2026
- Additional verified historical comparator: 1Q2026, reflecting pipeline to January 31, 2026
- Pipeline page snapshot collected on ${collectedDate}
- The official pipeline page states that the table is updated quarterly.

## Contents

- \`pipeline_pdfs/\`: official dated pipeline PDFs
- \`pipeline_snapshots/\`: HTML snapshot of the current product pipeline page
- \`major_documents.csv\`: index of collected pipeline items

## Discovery Note

I probed official merck.com upload paths for 2023-2026 quarterly pipeline PDFs and checked Merck's public search endpoints. Only 1Q2026 and 2Q2026 formal pipeline PDFs were verified as currently accessible official PDFs.

Source: ${sourcePage}
`;

fs.writeFileSync(path.join(corpusRoot, repository, "README.md"), readme, "utf8");

const statusCounts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ rows: rows.length, status_counts: statusCounts }, null, 2));
