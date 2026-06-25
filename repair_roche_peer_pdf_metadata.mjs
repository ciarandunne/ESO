import fs from "node:fs";
import path from "node:path";

const corpusRoot = path.resolve("Merck Official Hackathon Corpus");
const repoRoot = path.join(corpusRoot, "07_peer_pharma_annual_reports");
const officialPdf = "07_peer_pharma_annual_reports/official_reports/rank02_roche_annual-report-2025.pdf";
const exportPdf = "07_peer_pharma_annual_reports/pdf_exports/rank02_roche_annual-report-2025.pdf";
const snapshotHtml = "07_peer_pharma_annual_reports/official_snapshots/rank02_roche_annual-report-2025.html";
const sourcePage = "https://www.roche.com/investors/annualreport25";
const pdfUrl = "https://assets.roche.com/f/176343/x/fa3c863601/ar25e.pdf";
const collectedDate = "2026-06-24";
const officialBytes = fs.statSync(path.join(corpusRoot, officialPdf)).size;
const exportBytes = fs.statSync(path.join(corpusRoot, exportPdf)).size;

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
  return { headers, rows: dataRows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))) };
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function updateMajorDocuments() {
  const filePath = path.join(repoRoot, "major_documents.csv");
  const csv = readCsv(filePath);
  for (const row of csv.rows) {
    if (row.id !== "peer-0015") continue;
    row.subfolder = "07_peer_pharma_annual_reports/official_reports";
    row.document_type = "peer_annual_report_official_pdf";
    row.publication_date = "2025-01-29";
    row.download_url = pdfUrl;
    row.local_path = officialPdf;
    row.file_type = "pdf";
    row.source_domain = "assets.roche.com";
    row.collected_date = collectedDate;
    row.notes = `Top-20 pharma rank 2; 2024 pharma revenue 65.3B. Official Roche Annual Report 2025 English PDF downloaded from Roche assets. HTML landing-page snapshot retained at ${snapshotHtml}. Ranking source: https://en.wikipedia.org/wiki/Pharmaceutical_industry#Global_sales`;
    row.status = "downloaded";
  }
  writeCsv(filePath, csv.headers, csv.rows);
}

function updatePeerCompanyIndex() {
  const filePath = path.join(repoRoot, "peer_company_index.csv");
  const csv = readCsv(filePath);
  for (const row of csv.rows) {
    if (row.company !== "Roche") continue;
    row.status = "downloaded";
    row.local_path = officialPdf;
    row.source_url = sourcePage;
    row.notes = `Top-20 pharma rank 2; 2024 pharma revenue 65.3B. Official Roche Annual Report 2025 English PDF downloaded from Roche assets. HTML landing-page snapshot retained at ${snapshotHtml}. Ranking source: https://en.wikipedia.org/wiki/Pharmaceutical_industry#Global_sales`;
  }
  writeCsv(filePath, csv.headers, csv.rows);
}

function updatePdfExports() {
  const filePath = path.join(repoRoot, "pdf_exports.csv");
  const csv = readCsv(filePath);
  for (const row of csv.rows) {
    if (row.id !== "peerpdf-0002") continue;
    row.title = "Roche Annual Report 2025 English PDF";
    row.document_type = "peer_annual_report_official_pdf";
    row.source_url = pdfUrl;
    row.source_html_path = snapshotHtml;
    row.local_path = exportPdf;
    row.collected_date = collectedDate;
    row.notes = "Official Roche Annual Report 2025 English PDF copied into pdf_exports after the generated landing-page PDF was found to be incomplete.";
    row.status = "downloaded";
    row.bytes = exportBytes;
  }
  writeCsv(filePath, csv.headers, csv.rows);
}

function updateManifest() {
  const filePath = path.join(corpusRoot, "manifest.csv");
  const csv = readCsv(filePath);
  for (const row of csv.rows) {
    if (row.id === "peer-0015") {
      row.subfolder = "07_peer_pharma_annual_reports/official_reports";
      row.document_type = "peer_annual_report_official_pdf";
      row.publication_date = "2025-01-29";
      row.download_url = pdfUrl;
      row.local_path = officialPdf;
      row.file_type = "pdf";
      row.source_domain = "assets.roche.com";
      row.collected_date = collectedDate;
      row.notes = `Top-20 pharma rank 2; 2024 pharma revenue 65.3B. Official Roche Annual Report 2025 English PDF downloaded from Roche assets. HTML landing-page snapshot retained at ${snapshotHtml}.`;
      row.status = "downloaded";
    }
    if (row.id === "peerpdf-0002") {
      row.title = "Roche Annual Report 2025 English PDF";
      row.document_type = "peer_annual_report_official_pdf";
      row.source_url = pdfUrl;
      row.local_path = exportPdf;
      row.file_type = "pdf";
      row.source_domain = "assets.roche.com";
      row.collected_date = collectedDate;
      row.notes = "Official Roche Annual Report 2025 English PDF copied into pdf_exports after the generated landing-page PDF was found to be incomplete.";
      row.status = "downloaded";
    }
  }
  writeCsv(filePath, csv.headers, csv.rows);
}

updateMajorDocuments();
updatePeerCompanyIndex();
updatePdfExports();
updateManifest();

console.log(JSON.stringify({
  official_pdf: officialPdf,
  official_pdf_bytes: officialBytes,
  pdf_export: exportPdf,
  pdf_export_bytes: exportBytes,
}, null, 2));
