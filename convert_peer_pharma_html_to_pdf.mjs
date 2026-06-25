import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Import the local pnpm-installed Playwright package explicitly. The Codex runtime
// can otherwise resolve `playwright` from its own dependency cache without the
// matching `playwright-core` package.
const { chromium } = await import("./node_modules/.pnpm/playwright@1.61.0/node_modules/playwright/index.mjs");

const corpusRoot = path.resolve("Merck Official Hackathon Corpus");
const repo = "07_peer_pharma_annual_reports";
const repoRoot = path.join(corpusRoot, repo);
const majorDocumentsPath = path.join(repoRoot, "major_documents.csv");
const pdfDir = path.join(repoRoot, "pdf_exports");
const collectedDate = "2026-06-24";

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter((r) => r.some((v) => v !== ""));
  return dataRows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function stripExtension(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function relativeToCorpus(absPath) {
  return path.relative(corpusRoot, absPath).replaceAll(path.sep, "/");
}

fs.mkdirSync(pdfDir, { recursive: true });

const rows = readCsv(majorDocumentsPath);
const htmlRows = rows.filter((row) => {
  const localPath = row.local_path ?? "";
  return localPath.toLowerCase().endsWith(".html") && ["downloaded", "snapshot_saved"].includes(row.status);
});

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

// Keep conversion deterministic and fast: the local HTML is the source artifact.
await context.route(/^https?:\/\//, (route) => route.abort());

const pdfRows = [];
for (const [index, row] of htmlRows.entries()) {
  const sourceAbs = path.join(corpusRoot, row.local_path);
  if (!fs.existsSync(sourceAbs)) {
    console.warn(`Skipping missing source: ${row.local_path}`);
    continue;
  }

  const outputName = `${stripExtension(path.basename(sourceAbs))}.pdf`;
  const outputAbs = path.join(pdfDir, outputName);
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);

  await page.goto(pathToFileURL(sourceAbs).href, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({
    content: `
      html, body { background: #fff !important; color: #111 !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table { page-break-inside: auto; }
      tr, img, svg { break-inside: avoid; page-break-inside: avoid; }
      a { color: #0645ad !important; text-decoration: underline; }
    `,
  });
  await page.pdf({
    path: outputAbs,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: "0.4in", right: "0.35in", bottom: "0.4in", left: "0.35in" },
  });
  await page.close();

  pdfRows.push({
    id: `peerpdf-${String(index + 1).padStart(4, "0")}`,
    original_id: row.id,
    company: row.company ?? "",
    title: `${row.title} PDF export`,
    document_type: "peer_annual_report_pdf_export",
    year: row.year ?? "",
    source_url: row.source_url ?? "",
    source_html_path: row.local_path,
    local_path: relativeToCorpus(outputAbs),
    file_type: "pdf",
    collected_date: collectedDate,
    notes: "Generated from locally saved official HTML filing/snapshot for easier LLM upload and review.",
    status: "generated",
    bytes: fs.statSync(outputAbs).size,
  });
  console.log(`PDF ${pdfRows.length}/${htmlRows.length}: ${outputName}`);
}

await browser.close();

writeCsv(path.join(repoRoot, "pdf_exports.csv"), pdfRows, [
  "id",
  "original_id",
  "company",
  "title",
  "document_type",
  "year",
  "source_url",
  "source_html_path",
  "local_path",
  "file_type",
  "collected_date",
  "notes",
  "status",
  "bytes",
]);

console.log(JSON.stringify({
  html_sources: htmlRows.length,
  pdfs_generated: pdfRows.length,
  pdf_index: `${repo}/pdf_exports.csv`,
}, null, 2));
