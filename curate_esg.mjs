import fs from "node:fs";
import path from "node:path";

const corpusRoot = path.join(process.cwd(), "Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const esgRoot = path.join(corpusRoot, "03_sustainability_esg");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...data] = rows;
  return data.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function csvField(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  const headers = ["title", "document_type", "year", "status", "local_path", "source_url", "download_url", "notes"];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvField(row[header])).join(",")),
  ].join("\n") + "\n";
}

function isMajor(row) {
  if (row.repository !== "03_sustainability_esg") return false;
  if (row.document_type === "impact_report") return true;
  if (row.document_type === "performance_data") return true;
  if (row.document_type === "esg_report_announcement") return true;
  return false;
}

const rows = parseCsv(fs.readFileSync(manifestPath, "utf8"));
const esgRows = rows.filter((row) => row.repository === "03_sustainability_esg");
const majorRows = esgRows.filter(isMajor);
const supportingRows = esgRows.filter((row) => !isMajor(row));

fs.writeFileSync(path.join(esgRoot, "major_documents.csv"), toCsv(majorRows), "utf8");
fs.writeFileSync(path.join(esgRoot, "supporting_documents.csv"), toCsv(supportingRows), "utf8");

const majorBullets = majorRows
  .sort((a, b) => `${a.year} ${a.title}`.localeCompare(`${b.year} ${b.title}`))
  .map((row) => `- ${row.year || "Current"} | ${row.title} | ${row.status} | \`${row.local_path || "metadata only"}\``)
  .join("\n");

const supportingCounts = Object.entries(
  supportingRows.reduce((acc, row) => {
    acc[row.document_type] = (acc[row.document_type] || 0) + 1;
    return acc;
  }, {}),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([type, count]) => `- ${type}: ${count}`)
  .join("\n");

const readme = `# ESG / Sustainability Corpus

This folder contains Merck & Co. / MSD sustainability and ESG materials collected from official Merck sources.

## Recommended Starting Point

Use \`major_documents.csv\` first. It lists the high-signal ESG materials most useful for hackathon projects:

- Full impact / ESG reports where available
- Report summaries where available
- Performance data spreadsheet
- Official report announcement PDFs or HTML snapshots for older periods where the original report PDF is no longer exposed from Merck's current site

## Major Documents

${majorBullets}

## Supporting Documents

Supporting ESG files are retained rather than deleted. These include climate/CDP/TCFD/GHG materials, fact sheets, infographics, sustainability financing, well-being, and policy/resource documents.

Use \`supporting_documents.csv\` when a team wants to build a more specialized ESG, climate, workforce, access-to-health, or governance workflow.

Supporting document counts:

${supportingCounts}

## Notes

- Some older report years are represented by official announcement PDFs or HTML snapshots because legacy report microsites now redirect or direct PDF links are no longer available.
- The main corpus manifest remains the source of truth for source URLs, download URLs, local paths, and status.
`;

fs.writeFileSync(path.join(esgRoot, "README.md"), readme, "utf8");

console.log(`ESG curation complete. Major rows: ${majorRows.length}. Supporting rows retained: ${supportingRows.length}.`);
