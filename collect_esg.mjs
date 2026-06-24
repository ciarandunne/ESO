import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = process.cwd();
const corpusRoot = path.join(workspace, "Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const collectedDate = "2026-06-12";
const tempDir = path.join(workspace, ".collection_temp");

const sustainabilityOverview = "https://www.merck.com/company-overview/sustainability/";
const sustainabilityResources = "https://www.merck.com/company-overview/sustainability/sustainability-resources/";

fs.mkdirSync(tempDir, { recursive: true });

const extraFolders = [
  "03_sustainability_esg/report_announcements",
  "03_sustainability_esg/supporting_resources",
];
for (const folder of extraFolders) {
  fs.mkdirSync(path.join(corpusRoot, ...folder.split("/")), { recursive: true });
}

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

function stripExistingEsgRows() {
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return;
  const kept = [lines[0], ...lines.slice(1).filter((line) => !line.includes('"03_sustainability_esg"'))];
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

function decodeHtml(text) {
  return String(text || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#038;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#8211;", "-")
    .replaceAll("&#8212;", "-")
    .replaceAll("&#8217;", "'")
    .replaceAll("&quot;", '"')
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text) {
  return decodeHtml(text)
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

function extensionFromUrl(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return ext || ".html";
}

function yearFromText(text) {
  const value = decodeHtml(text);
  const range = value.match(/(20\d{2})\s*[/-]\s*(20\d{2}|[0-9]{2})/);
  if (range) {
    const second = range[2].length === 2 ? `20${range[2]}` : range[2];
    return `${range[1]}-${second}`;
  }
  const year = value.match(/\b(20\d{2}|201[0-9])\b/);
  return year ? year[1] : "";
}

function typeAndFolder(title, url) {
  const lower = `${title} ${url}`.toLowerCase();
  if (/announcement|publishes|issues|reports strong progress|sustainable value|doc_news/.test(lower)) {
    return { type: "esg_report_announcement", folder: "03_sustainability_esg/report_announcements" };
  }
  if (/impact report|esg progress report|corporate responsibility report|purpose for progress/.test(lower)) {
    return { type: "impact_report", folder: "03_sustainability_esg/impact_reports" };
  }
  if (/summary|fact sheet|infographic/.test(lower)) {
    return { type: "report_summary", folder: "03_sustainability_esg/report_summaries" };
  }
  if (/performance data|spreadsheet|xlsx/.test(lower)) {
    return { type: "performance_data", folder: "03_sustainability_esg/performance_data" };
  }
  if (/bond/.test(lower)) {
    return { type: "sustainability_financing", folder: "03_sustainability_esg/sustainability_financing" };
  }
  if (/well.?being|workforce|employee/.test(lower)) {
    return { type: "workforce_wellbeing", folder: "03_sustainability_esg/workforce_wellbeing" };
  }
  if (/cdp|tcfd|climate|ghg|carbon|sbti|environment|ehs|sharps|net-zero|renewable/.test(lower)) {
    return { type: "climate_environment", folder: "03_sustainability_esg/climate_cdp_tcfd" };
  }
  return { type: "supporting_resource", folder: "03_sustainability_esg/supporting_resources" };
}

function addDoc(docs, doc) {
  const key = doc.url;
  if (!key || docs.some((existing) => existing.url === key)) return;
  docs.push(doc);
}

function parseDownloadLinksFromHtml(html, sourceUrl) {
  const docs = [];
  const hrefRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = hrefRegex.exec(html))) {
    const href = decodeHtml(match[1]);
    if (!/\.(pdf|xlsx?)($|[?#])/i.test(href)) continue;
    const rawLabel = match[2].replace(/<img[^>]*>/gi, " ").replace(/<[^>]+>/g, " ");
    const title = decodeHtml(rawLabel) || path.basename(new URL(href, sourceUrl).pathname);
    addDoc(docs, { title, url: new URL(href, sourceUrl).href, source_url: sourceUrl });
  }
  return docs;
}

function addManualDocs(docs) {
  const manual = [
    {
      title: "Purpose for Progress Impact Report 2024/2025",
      url: "https://www.merck.com/wp-content/uploads/sites/124/2025/08/PurposeforProgressMerckImpactReport2024-2025.pdf",
      source_url: sustainabilityOverview,
    },
    {
      title: "Purpose for Progress Report Summary 2024/2025",
      url: "https://www.merck.com/wp-content/uploads/sites/124/2025/08/MerckPurposeforProgressReportSummary.pdf",
      source_url: sustainabilityOverview,
    },
    {
      title: "2023/2024 Impact Report",
      url: "https://www.merck.com/wp-content/uploads/sites/124/2024/08/Merck_ImpactReport_2023-2024.pdf",
      source_url: "https://www.merck.com/news/merck-reports-strong-momentum-in-expanding-and-enabling-access-to-health-care-driving-sustainability-and-operating-responsibly-in-2023-2024-impact-report/",
    },
    {
      title: "2023/2024 Impact Report Summary",
      url: "https://www.merck.com/wp-content/uploads/sites/124/2024/08/Merck_ImpactReport_Summary_2023-24.pdf",
      source_url: "https://www.merck.com/stories/merck-publishes-2023-2024-impact-report/",
    },
    {
      title: "Merck Impact Report 2022/2023 announcement snapshot",
      url: "https://www.merck.com/news/merck-reports-strong-progress-on-its-commitments-to-advancing-access-to-health-and-operating-responsibly/",
      source_url: "https://www.merck.com/news/merck-reports-strong-progress-on-its-commitments-to-advancing-access-to-health-and-operating-responsibly/",
      snapshot: true,
      document_type: "esg_report_announcement",
      folder: "03_sustainability_esg/report_announcements",
      notes: "HTML snapshot. The announcement references Merck's Impact Report 2022/2023, but the direct PDF linked from the page currently returns 404.",
    },
    {
      title: "Merck 2021/2022 ESG Progress Report",
      url: "https://www.merck.com/wp-content/uploads/sites/124/2022/08/MRK-ESG-report-21-22.pdf",
      source_url: "https://www.merck.com/news/merck-reports-strong-progress-in-esg-focus-areas/",
    },
    {
      title: "Merck 2020/2021 ESG Progress Report announcement snapshot",
      url: "https://www.merck.com/news/building-sustainable-value-for-our-business-and-society/",
      source_url: "https://www.merck.com/news/building-sustainable-value-for-our-business-and-society/",
      snapshot: true,
      document_type: "esg_report_announcement",
      folder: "03_sustainability_esg/report_announcements",
      notes: "HTML snapshot. The announcement references a 2020/2021 ESG Progress Report available online, but no direct report PDF was available from the current page.",
    },
    {
      title: "Merck Issues 2019/2020 Corporate Responsibility Report announcement",
      url: "https://s2.q4cdn.com/584635680/files/doc_news/Merck-Issues-20192020-Corporate-Responsibility-Report-2020.pdf",
      source_url: "https://www.merck.com/news/merck-issues-2019-2020-corporate-responsibility-report/",
    },
    {
      title: "Merck Issues 2018/2019 Corporate Responsibility Report announcement",
      url: "https://s2.q4cdn.com/584635680/files/doc_news/Merck-Issues-20182019-Corporate-Responsibility-Report-2019.pdf",
      source_url: "https://www.merck.com/news/merck-issues-2018-2019-corporate-responsibility-report/",
    },
    {
      title: "Merck Publishes 2017/2018 Corporate Responsibility Report announcement",
      url: "https://s2.q4cdn.com/584635680/files/doc_news/Merck-Publishes-Corporate-Responsibility-Report-2018.pdf",
      source_url: "https://www.merck.com/news/merck-publishes-corporate-responsibility-report/",
    },
    {
      title: "Merck Publishes 2016/2017 Corporate Responsibility Report announcement",
      url: "https://s2.q4cdn.com/584635680/files/doc_news/Merck-Publishes-Annual-Corporate-Responsibility-Report-2017.pdf",
      source_url: "https://www.merck.com/news/merck-publishes-annual-corporate-responsibility-report/",
    },
    {
      title: "Merck Publishes 2015/2016 Global Corporate Responsibility Report announcement",
      url: "https://s2.q4cdn.com/584635680/files/doc_news/Merck-Publishes-20152016-Global-Corporate-Responsibility-Report-2016.pdf",
      source_url: "https://www.merck.com/news/merck-publishes-2015-2016-global-corporate-responsibility-report/",
    },
    {
      title: "Merck Publishes 2014 Global Corporate Responsibility Report announcement",
      url: "https://s2.q4cdn.com/584635680/files/doc_news/Merck-Publishes-2014-Global-Corporate-Responsibility-Report-2015.pdf",
      source_url: "https://www.merck.com/news/merck-publishes-2014-global-corporate-responsibility-report/",
    },
  ];
  for (const doc of manual) addDoc(docs, doc);
}

stripExistingEsgRows();
const ids = existingIds();
let counter = 1;
while (ids.has(`esg-${String(counter).padStart(4, "0")}`)) counter += 1;
function nextId() {
  let id;
  do {
    id = `esg-${String(counter).padStart(4, "0")}`;
    counter += 1;
  } while (ids.has(id));
  ids.add(id);
  return id;
}

const docs = [];
for (const [file, sourceUrl] of [
  ["merck_sustainability_resources.html", sustainabilityResources],
  ["merck_sustainability_overview.html", sustainabilityOverview],
]) {
  const html = fs.readFileSync(path.join(workspace, file), "utf8");
  for (const doc of parseDownloadLinksFromHtml(html, sourceUrl)) addDoc(docs, doc);
}
addManualDocs(docs);

for (const doc of docs) {
  const meta = doc.folder && doc.document_type
    ? { folder: doc.folder, type: doc.document_type }
    : typeAndFolder(doc.title, doc.url);
  const folderAbs = path.join(corpusRoot, ...meta.folder.split("/"));
  fs.mkdirSync(folderAbs, { recursive: true });

  const ext = doc.snapshot ? ".html" : extensionFromUrl(doc.url);
  const year = yearFromText(`${doc.title} ${doc.url}`);
  const filenamePrefix = year ? `${year}_merck_` : "current_merck_";
  const filename = `${filenamePrefix}${slugify(doc.title)}${ext}`;
  const outputPath = path.join(folderAbs, filename);
  const localPath = `${meta.folder}/${filename}`;

  let status = doc.snapshot ? "snapshot_saved" : "downloaded";
  let notes = doc.notes || "";
  try {
    runCurl(doc.url, outputPath);
  } catch (error) {
    status = "failed";
    notes = error.message;
  }

  appendManifest({
    id: nextId(),
    repository: "03_sustainability_esg",
    subfolder: meta.folder,
    title: doc.title,
    document_type: meta.type,
    year,
    quarter: "",
    publication_date: "",
    source_url: doc.source_url || sustainabilityResources,
    download_url: doc.url,
    local_path: status === "failed" ? "" : localPath,
    file_type: ext.replace(".", ""),
    source_domain: new URL(doc.url).hostname,
    collected_date: collectedDate,
    notes,
    status,
  });
}

console.log(`ESG collection complete. Candidate rows: ${docs.length}`);
