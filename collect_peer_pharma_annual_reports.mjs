import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = process.cwd();
const corpusRoot = path.join(workspace, "Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const tempDir = path.join(workspace, ".collection_temp");
const collectedDate = "2026-06-12";
const repository = "07_peer_pharma_annual_reports";
const secUserAgent = "Merck hackathon corpus research ciara@example.com";

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

const rankingSource =
  "https://en.wikipedia.org/wiki/Pharmaceutical_industry#Global_sales";

const secPeers = [
  { rank: 1, company: "Johnson & Johnson", cik: "200406", forms: ["10-K"], revenue2024: "88.8B" },
  { rank: 4, company: "Pfizer", cik: "78003", forms: ["10-K"], revenue2024: "63.6B" },
  { rank: 5, company: "AbbVie", cik: "1551152", forms: ["10-K"], revenue2024: "56.3B" },
  { rank: 6, company: "AstraZeneca", cik: "901832", forms: ["20-F"], revenue2024: "54.1B" },
  { rank: 7, company: "Novartis", cik: "1114448", forms: ["20-F"], revenue2024: "50.3B" },
  { rank: 8, company: "Bristol Myers Squibb", cik: "14272", forms: ["10-K"], revenue2024: "48.3B" },
  { rank: 9, company: "Eli Lilly", cik: "59478", forms: ["10-K"], revenue2024: "45.0B" },
  { rank: 10, company: "Sanofi", cik: "1121404", forms: ["20-F"], revenue2024: "44.46B" },
  { rank: 11, company: "Novo Nordisk", cik: "353278", forms: ["20-F"], revenue2024: "42.1B" },
  { rank: 12, company: "GSK", cik: "1131399", forms: ["20-F"], revenue2024: "40.1B" },
  { rank: 13, company: "Amgen", cik: "318154", forms: ["10-K"], revenue2024: "33.4B" },
  { rank: 14, company: "Takeda", cik: "1395064", forms: ["20-F"], revenue2024: "30.9B" },
  { rank: 16, company: "Gilead Sciences", cik: "882095", forms: ["10-K"], revenue2024: "28.6B" },
  { rank: 19, company: "Teva Pharmaceutical", cik: "818686", forms: ["10-K", "20-F"], revenue2024: "16.5B" },
];

const directPeers = [
  {
    rank: 2,
    company: "Roche",
    revenue2024: "65.3B",
    title: "Roche Annual Report 2025",
    url: "https://www.roche.com/investors/annualreport25",
    folder: "official_snapshots",
    fileName: "rank02_roche_annual-report-2025.html",
    notes: "Official Roche Annual Report 2025 page snapshot.",
  },
  {
    rank: 18,
    company: "Merck KGaA / EMD Group",
    revenue2024: "19.1B",
    title: "Merck KGaA / EMD Group Annual Report 2025",
    url: "https://reports.emdgroup.com/en/annualreport/2025/",
    folder: "official_snapshots",
    fileName: "rank18_merck-kgaa-emd-group_annual-report-2025.html",
    notes: "Official Merck KGaA / EMD Group Annual Report 2025 page snapshot.",
  },
  {
    rank: 20,
    company: "CSL",
    revenue2024: "15.2B",
    title: "CSL Annual Report 2025",
    url: "https://www.csl.com/-/media/shared/documents/annual-report/csl-annual-report-2025.pdf",
    folder: "official_reports",
    fileName: "rank20_csl_annual-report-2025.pdf",
    notes: "Official CSL Annual Report 2025 PDF from CSL investor annual reports page.",
  },
];

const metadataOnlyPeers = [
  {
    rank: 15,
    company: "Boehringer Ingelheim",
    revenue2024: "29.0B",
    title: "Boehringer Ingelheim Annual Report 2025",
    url: "https://annualreport.boehringer-ingelheim.com/2025/",
    notes: "Official annual-report page identified, but automated download was blocked by site protection.",
  },
  {
    rank: 17,
    company: "Bayer",
    revenue2024: "26.0B",
    title: "Bayer Annual Reports Page",
    url: "https://www.bayer.com/en/investors/annual-reports",
    notes: "Official annual-report page identified, but automated download was blocked by site protection.",
  },
];

fs.mkdirSync(tempDir, { recursive: true });
for (const folder of ["sec_filings", "official_reports", "official_snapshots", "metadata_only"]) {
  fs.mkdirSync(path.join(corpusRoot, repository, folder), { recursive: true });
}

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
  while (ids.has(`peer-${String(counter).padStart(4, "0")}`)) counter += 1;
  return () => {
    let id;
    do {
      id = `peer-${String(counter).padStart(4, "0")}`;
      counter += 1;
    } while (ids.has(id));
    ids.add(id);
    return id;
  };
}

function runCurl(url, outputPath, extraArgs = []) {
  const result = spawnSync(
    "curl.exe",
    ["--noproxy", "*", "-L", "--fail", "--silent", "--show-error", ...extraArgs, url, "-o", outputPath],
    { stdio: "pipe", encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `curl exited ${result.status}`).trim());
  }
}

function readJsonViaCurl(url, filename, extraArgs = []) {
  const outputPath = path.join(tempDir, filename);
  runCurl(url, outputPath, extraArgs);
  return JSON.parse(fs.readFileSync(outputPath, "utf8"));
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

function latestAnnualFiling(peer) {
  const cikPadded = peer.cik.padStart(10, "0");
  const data = readJsonViaCurl(
    `https://data.sec.gov/submissions/CIK${cikPadded}.json`,
    `sec-submissions-${peer.cik}.json`,
    ["-A", secUserAgent],
  );
  const recent = data.filings?.recent || {};
  const forms = recent.form || [];
  for (let index = 0; index < forms.length; index += 1) {
    if (!peer.forms.includes(forms[index])) continue;
    const accession = recent.accessionNumber[index];
    const accessionNoDashes = accession.replaceAll("-", "");
    const cikNoLeading = String(Number(peer.cik));
    const primaryDocument = recent.primaryDocument[index];
    return {
      form: forms[index],
      accession,
      filingDate: recent.filingDate[index],
      reportDate: recent.reportDate[index],
      fiscalYear: String(recent.reportDate[index] || recent.filingDate[index] || "").slice(0, 4),
      url: `https://www.sec.gov/Archives/edgar/data/${cikNoLeading}/${accessionNoDashes}/${primaryDocument}`,
    };
  }
  return null;
}

stripExistingRows();
const nextId = nextIdFactory(existingIds());
const rows = [];
const peerIndex = [];

for (const peer of secPeers) {
  const filing = latestAnnualFiling(peer);
  if (!filing) {
    const row = {
      id: nextId(),
      repository,
      subfolder: `${repository}/metadata_only`,
      title: `${peer.company} annual report filing`,
      document_type: "peer_annual_report",
      year: "",
      quarter: "",
      publication_date: "",
      source_url: "https://www.sec.gov/",
      download_url: "",
      local_path: "",
      file_type: "html",
      source_domain: "sec.gov",
      collected_date: collectedDate,
      notes: `Rank ${peer.rank}; 2024 pharma revenue ${peer.revenue2024}. No ${peer.forms.join("/")} found in SEC recent filings.`,
      status: "failed",
    };
    rows.push(row);
    peerIndex.push({ ...peer, status: row.status, local_path: "", source_url: row.source_url, notes: row.notes });
    continue;
  }
  const fileName = `rank${String(peer.rank).padStart(2, "0")}_${slugify(peer.company)}_${filing.form.toLowerCase()}_${filing.fiscalYear}.html`;
  const relPath = `${repository}/sec_filings/${fileName}`;
  const outputPath = path.join(corpusRoot, ...relPath.split("/"));
  const row = {
    id: nextId(),
    repository,
    subfolder: `${repository}/sec_filings`,
    title: `${peer.company} ${filing.fiscalYear} ${filing.form} annual report`,
    document_type: "peer_annual_report_sec_filing",
    year: filing.fiscalYear,
    quarter: "",
    publication_date: filing.filingDate,
    source_url: `https://www.sec.gov/edgar/browse/?CIK=${peer.cik}`,
    download_url: filing.url,
    local_path: relPath,
    file_type: "html",
    source_domain: "sec.gov",
    collected_date: collectedDate,
    notes: `Top-20 pharma rank ${peer.rank}; 2024 pharma revenue ${peer.revenue2024}; SEC accession ${filing.accession}; report date ${filing.reportDate}. Ranking source: ${rankingSource}`,
    status: "downloaded",
  };
  try {
    runCurl(filing.url, outputPath, ["-A", secUserAgent]);
  } catch (error) {
    row.local_path = "";
    row.notes = `Download failed: ${String(error.message || error).slice(0, 240)} | ${row.notes}`;
    row.status = "failed";
  }
  rows.push(row);
  peerIndex.push({ ...peer, status: row.status, local_path: row.local_path, source_url: row.source_url, notes: row.notes });
}

for (const peer of directPeers) {
  const relPath = `${repository}/${peer.folder}/${peer.fileName}`;
  const outputPath = path.join(corpusRoot, ...relPath.split("/"));
  const row = {
    id: nextId(),
    repository,
    subfolder: `${repository}/${peer.folder}`,
    title: peer.title,
    document_type: path.extname(peer.fileName).toLowerCase() === ".pdf"
      ? "peer_annual_report_official_pdf"
      : "peer_annual_report_official_snapshot",
    year: "2025",
    quarter: "",
    publication_date: "2026-06-12",
    source_url: peer.url,
    download_url: peer.url,
    local_path: relPath,
    file_type: path.extname(peer.fileName).replace(".", ""),
    source_domain: domainFromUrl(peer.url),
    collected_date: collectedDate,
    notes: `Top-20 pharma rank ${peer.rank}; 2024 pharma revenue ${peer.revenue2024}. ${peer.notes} Ranking source: ${rankingSource}`,
    status: path.extname(peer.fileName).toLowerCase() === ".pdf" ? "downloaded" : "snapshot_saved",
  };
  try {
    runCurl(peer.url, outputPath);
  } catch (error) {
    row.local_path = "";
    row.notes = `Snapshot failed: ${String(error.message || error).slice(0, 240)} | ${row.notes}`;
    row.status = "failed";
  }
  rows.push(row);
  peerIndex.push({ ...peer, status: row.status, local_path: row.local_path, source_url: row.source_url, notes: row.notes });
}

for (const peer of metadataOnlyPeers) {
  const row = {
    id: nextId(),
    repository,
    subfolder: `${repository}/metadata_only`,
    title: peer.title,
    document_type: "peer_annual_report_metadata",
    year: "2025",
    quarter: "",
    publication_date: "2026-06-12",
    source_url: peer.url,
    download_url: peer.url,
    local_path: "",
    file_type: "link",
    source_domain: domainFromUrl(peer.url),
    collected_date: collectedDate,
    notes: `Top-20 pharma rank ${peer.rank}; 2024 pharma revenue ${peer.revenue2024}. ${peer.notes} Ranking source: ${rankingSource}`,
    status: "metadata_only",
  };
  rows.push(row);
  peerIndex.push({ ...peer, status: row.status, local_path: "", source_url: row.source_url, notes: row.notes });
}

rows.sort((a, b) => {
  const rankA = Number((a.notes.match(/rank (\d+)/i) || [0, 999])[1]);
  const rankB = Number((b.notes.match(/rank (\d+)/i) || [0, 999])[1]);
  return rankA - rankB;
});

fs.appendFileSync(manifestPath, `${rows.map(csvLine).join("\n")}\n`, "utf8");
fs.writeFileSync(path.join(corpusRoot, repository, "major_documents.csv"), `${columns.join(",")}\n${rows.map(csvLine).join("\n")}\n`, "utf8");

const peerColumns = ["rank", "company", "revenue2024", "status", "local_path", "source_url", "notes"];
peerIndex.sort((a, b) => a.rank - b.rank);
fs.writeFileSync(
  path.join(corpusRoot, repository, "peer_company_index.csv"),
  `${peerColumns.join(",")}\n${peerIndex.map((row) => peerColumns.map((key) => csvField(row[key])).join(",")).join("\n")}\n`,
  "utf8",
);

const statusCounts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

const readme = `# Peer Pharma Annual Reports

Annual-report benchmark pack for top pharmaceutical companies by 2024 pharma revenue, excluding Merck & Co. because Merck annual reports are already collected in \`01_financial_reports\`.

## Scope

- Ranking basis: top 20 drug companies by 2024 pharma revenue, as listed in the Pharmaceutical industry global sales table.
- Peer companies targeted: 19 non-Merck companies from that ranking.
- Preferred source: official SEC 10-K / 20-F filing where available.
- Additional official sources: company annual-report pages for Roche and Merck KGaA / EMD Group, plus CSL's official annual report PDF.
- Metadata-only: Bayer and Boehringer Ingelheim official pages were identified but blocked automated download.

## Contents

- \`sec_filings/\`: official SEC 10-K/20-F annual-report HTML filings.
- \`official_reports/\`: official company annual-report PDFs.
- \`official_snapshots/\`: official company annual-report page snapshots.
- \`major_documents.csv\`: manifest-style index for this peer pack.
- \`peer_company_index.csv\`: compact company/rank/source/status index.

## Collection Summary

- Manifest rows: ${rows.length}
- Status counts: ${Object.entries(statusCounts)
  .map(([key, count]) => `${key}=${count}`)
  .join(", ")}

Merck & Co. note: rank 3 in the same top-20 list, already covered by 10 years of annual reports in \`01_financial_reports/annual_reports\`.
`;

fs.writeFileSync(path.join(corpusRoot, repository, "README.md"), readme, "utf8");

console.log(JSON.stringify({ rows: rows.length, status_counts: statusCounts }, null, 2));
