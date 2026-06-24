import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = process.cwd();
const corpusRoot = path.join(workspace, "Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const tempDir = path.join(workspace, ".collection_temp");
const sourceFinancial = "https://www.merck.com/investor-relations/financial-information/";
const collectedDate = "2026-06-12";

fs.mkdirSync(tempDir, { recursive: true });

function csvField(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function appendManifest(row) {
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
  fs.appendFileSync(manifestPath, `${columns.map((key) => csvField(row[key])).join(",")}\n`, "utf8");
}

function existingIds() {
  if (!fs.existsSync(manifestPath)) return new Set();
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).slice(1);
  const ids = new Set();
  for (const line of lines) {
    const id = line.match(/^"([^"]+)"/)?.[1] ?? line.split(",")[0];
    if (id) ids.add(id.replace(/^"|"$/g, ""));
  }
  return ids;
}

const ids = existingIds();
let counter = 1;
while (ids.has(`fin-${String(counter).padStart(4, "0")}`)) counter += 1;

function nextId() {
  let id;
  do {
    id = `fin-${String(counter).padStart(4, "0")}`;
    counter += 1;
  } while (ids.has(id));
  ids.add(id);
  return id;
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

function readJsonViaCurl(url, filename) {
  const outputPath = path.join(tempDir, filename);
  runCurl(url, outputPath);
  return JSON.parse(fs.readFileSync(outputPath, "utf8"));
}

function extensionFromUrl(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return ext || ".html";
}

function slugify(text) {
  return text
    .toLowerCase()
    .replaceAll("&amp;", "and")
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

function metadataForTitle(title) {
  const lower = title.toLowerCase();
  if (/annual report|10-k/.test(lower)) {
    return { type: "annual_report_form_10k", folder: "01_financial_reports/annual_reports" };
  }
  if (/proxy/.test(lower)) {
    return { type: "proxy_statement", folder: "01_financial_reports/annual_reports" };
  }
  if (/presentation/.test(lower)) {
    return { type: "earnings_presentation", folder: "01_financial_reports/earnings_presentations" };
  }
  if (/announcement|release/.test(lower)) {
    return { type: "earnings_announcement", folder: "01_financial_reports/quarterly_earnings" };
  }
  if (/other financial disclosures|financial disclosure/.test(lower)) {
    return { type: "financial_disclosure", folder: "01_financial_reports/financial_disclosures" };
  }
  if (/prepared remarks/.test(lower)) {
    return { type: "prepared_remarks", folder: "01_financial_reports/prepared_remarks" };
  }
  if (/transcript/.test(lower)) {
    return { type: "transcript", folder: "01_financial_reports/transcripts" };
  }
  if (/10-q/.test(lower)) {
    return { type: "form_10q", folder: "01_financial_reports/quarterly_earnings" };
  }
  return { type: "financial_document", folder: "01_financial_reports/quarterly_earnings" };
}

function publicationDate(report) {
  const sortDate = report?.extended_data?.acf_fields?.sort_date;
  if (sortDate) return String(sortDate).slice(0, 10);
  if (report?.date) return String(report.date).slice(0, 10);
  return "";
}

function addFailure({ title, year, quarter = "", documentType, apiUrl, notes }) {
  appendManifest({
    id: nextId(),
    repository: "01_financial_reports",
    subfolder: quarter ? "01_financial_reports/quarterly_earnings" : "01_financial_reports/annual_reports",
    title,
    document_type: documentType,
    year,
    quarter,
    publication_date: "",
    source_url: sourceFinancial,
    download_url: apiUrl,
    local_path: "",
    file_type: "json",
    source_domain: "merck.com",
    collected_date: collectedDate,
    notes,
    status: "failed",
  });
}

function processDocument({ report, doc, year, quarter = "" }) {
  const title = doc.document_title;
  const url = doc.document_path;
  if (!title || !url) return;

  if (/proxy voting results/i.test(title)) {
    appendManifest({
      id: nextId(),
      repository: "01_financial_reports",
      subfolder: "01_financial_reports/annual_reports",
      title,
      document_type: "proxy_voting_results",
      year,
      quarter,
      publication_date: publicationDate(report),
      source_url: report?.link || sourceFinancial,
      download_url: url,
      local_path: "",
      file_type: extensionFromUrl(url).replace(".", ""),
      source_domain: new URL(url).hostname,
      collected_date: collectedDate,
      notes: "Metadata-only. Excluded from core annual/proxy document set.",
      status: "metadata_only",
    });
    return;
  }

  if (/webcast/i.test(title)) {
    appendManifest({
      id: nextId(),
      repository: "01_financial_reports",
      subfolder: "01_financial_reports/quarterly_earnings",
      title,
      document_type: "webcast_link",
      year,
      quarter,
      publication_date: publicationDate(report),
      source_url: report?.link || sourceFinancial,
      download_url: url,
      local_path: "",
      file_type: "link",
      source_domain: new URL(url).hostname,
      collected_date: collectedDate,
      notes: report?.link ? `Report page: ${report.link}` : "",
      status: "metadata_only",
    });
    return;
  }

  const meta = metadataForTitle(title);

  if (quarter && meta.type === "annual_report_form_10k") {
    appendManifest({
      id: nextId(),
      repository: "01_financial_reports",
      subfolder: meta.folder,
      title,
      document_type: meta.type,
      year,
      quarter,
      publication_date: publicationDate(report),
      source_url: report?.link || sourceFinancial,
      download_url: url,
      local_path: "",
      file_type: extensionFromUrl(url).replace(".", ""),
      source_domain: new URL(url).hostname,
      collected_date: collectedDate,
      notes: "Duplicate of annual report file already captured in annual_reports.",
      status: "duplicate",
    });
    return;
  }

  const folderAbs = path.join(corpusRoot, ...meta.folder.split("/"));
  fs.mkdirSync(folderAbs, { recursive: true });

  const ext = extensionFromUrl(url);
  const slug = slugify(title);
  let filename;
  if (meta.type === "proxy_statement") {
    filename = `FY${year}_merck_proxy-statement${ext}`;
  } else if (meta.type === "annual_report_form_10k") {
    filename = `FY${year}_merck_annual-report-form-10-k${ext}`;
  } else if (quarter) {
    filename = `${year}_${quarter}_merck_${slug}${ext}`;
  } else {
    filename = `FY${year}_merck_${slug}${ext}`;
  }

  const outputPath = path.join(folderAbs, filename);
  const relativePath = `${meta.folder}/${filename}`;
  let status = "downloaded";
  let notes = report?.link ? `Report page: ${report.link}` : "";

  try {
    if (process.env.FORCE_DOWNLOAD !== "1" && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      notes = `${notes}${notes ? " | " : ""}Existing local file reused.`;
    } else {
      runCurl(url, outputPath);
    }
  } catch (error) {
    status = "failed";
    notes = error.message;
  }

  appendManifest({
    id: nextId(),
    repository: "01_financial_reports",
    subfolder: meta.folder,
    title,
    document_type: meta.type,
    year,
    quarter,
    publication_date: publicationDate(report),
    source_url: report?.link || sourceFinancial,
    download_url: url,
    local_path: relativePath,
    file_type: ext.replace(".", ""),
    source_domain: new URL(url).hostname,
    collected_date: collectedDate,
    notes,
    status,
  });
}

for (const year of [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
  const apiUrl = `https://www.merck.com/wp-json/wp/v2/report/?slug=${year}-annual-report`;
  let reports;
  try {
    reports = readJsonViaCurl(apiUrl, `annual_${year}.json`);
  } catch (error) {
    addFailure({
      title: `${year} annual report metadata`,
      year,
      documentType: "annual_report_metadata",
      apiUrl,
      notes: error.message,
    });
    continue;
  }

  for (const report of reports) {
    const docs = report?.extended_data?.acf_fields?.documents || [];
    for (const doc of docs) {
      processDocument({ report, doc, year });
    }
  }
}

const quarterMap = [
  ["Q1", "first-quarter"],
  ["Q2", "second-quarter"],
  ["Q3", "third-quarter"],
  ["Q4", "fourth-quarter"],
];

for (const year of [2024, 2025, 2026]) {
  for (const [quarter, slugPrefix] of quarterMap) {
    const slug = `${slugPrefix}-${year}`;
    const apiUrl = `https://www.merck.com/wp-json/wp/v2/report/?slug=${slug}`;
    let reports;
    try {
      reports = readJsonViaCurl(apiUrl, `quarterly_${year}_${quarter}.json`);
    } catch (error) {
      addFailure({
        title: `${year} ${quarter} quarterly earnings metadata`,
        year,
        quarter,
        documentType: "quarterly_earnings_metadata",
        apiUrl,
        notes: error.message,
      });
      continue;
    }

    for (const report of reports) {
      const docs = report?.extended_data?.acf_fields?.documents || [];
      for (const doc of docs) {
        if (doc.document_category === "Press Release1") continue;
        processDocument({ report, doc, year, quarter });
      }
    }
  }
}

console.log("Round 1 financial collection complete.");
