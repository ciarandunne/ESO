import fs from "node:fs";
import path from "node:path";

const corpusRoot = path.resolve("Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const pdfIndexPath = path.join(corpusRoot, "07_peer_pharma_annual_reports", "pdf_exports.csv");
const repo = "07_peer_pharma_annual_reports";

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

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const manifest = readCsv(manifestPath);
const pdfIndex = readCsv(pdfIndexPath);

const existing = manifest.rows.filter((row) => {
  if (row.repository !== repo) return true;
  if (row.subfolder === "pdf_exports") return false;
  if ((row.id ?? "").startsWith("peerpdf-")) return false;
  return true;
});

const pdfRows = pdfIndex.rows.map((row) => ({
  id: row.id,
  repository: repo,
  subfolder: "pdf_exports",
  title: row.title,
  document_type: row.document_type,
  year: row.year,
  quarter: "",
  publication_date: "",
  source_url: row.source_url,
  download_url: "",
  local_path: row.local_path,
  file_type: "pdf",
  source_domain: domainFromUrl(row.source_url),
  collected_date: row.collected_date,
  notes: `${row.notes} Source HTML: ${row.source_html_path}`,
  status: "generated",
}));

writeCsv(manifestPath, manifest.headers, [...existing, ...pdfRows]);

console.log(JSON.stringify({
  removed_existing_pdf_rows: manifest.rows.length - existing.length,
  added_pdf_rows: pdfRows.length,
  total_manifest_rows: existing.length + pdfRows.length,
}, null, 2));
