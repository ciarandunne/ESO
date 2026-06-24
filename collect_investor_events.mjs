import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = process.cwd();
const corpusRoot = path.join(workspace, "Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const tempDir = path.join(workspace, ".collection_temp");
const collectedDate = "2026-06-12";
const eventsSource = "https://www.merck.com/investor-relations/events-and-presentations/";
const years = [2024, 2025, 2026];

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

fs.mkdirSync(tempDir, { recursive: true });
for (const folder of [
  "02_investor_events/conference_presentations",
  "02_investor_events/investor_events",
  "02_investor_events/shareholder_meetings",
  "02_investor_events/transcripts",
]) {
  fs.mkdirSync(path.join(corpusRoot, ...folder.split("/")), { recursive: true });
}

function csvField(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvLine(row) {
  return columns.map((key) => csvField(row[key])).join(",");
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
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripExistingInvestorRows() {
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return;
  const kept = [lines[0], ...lines.slice(1).filter((line) => !line.includes('"02_investor_events"'))];
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

stripExistingInvestorRows();
const ids = existingIds();
let counter = 1;
while (ids.has(`inv-${String(counter).padStart(4, "0")}`)) counter += 1;

function nextId() {
  let id;
  do {
    id = `inv-${String(counter).padStart(4, "0")}`;
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

function slugify(text) {
  return decodeHtml(text)
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

function extensionFromUrl(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return ext || ".html";
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function eventDate(event) {
  const value = event?.acf_fields?.event_sort_date || event?.date || "";
  return String(value).slice(0, 10);
}

function eventYear(event) {
  return eventDate(event).slice(0, 4);
}

function isEarningsEvent(event) {
  const title = decodeHtml(event.post_title).toLowerCase();
  const tags = (event.tags || []).map((tag) => String(tag.slug || tag.name || "").toLowerCase());
  return tags.includes("earnings") || /\bq[1-4]\s+20\d{2}\s+earnings\b|earnings call/.test(title);
}

function classifyEvent(eventTitle) {
  const lower = eventTitle.toLowerCase();
  if (/annual meeting|shareholder/.test(lower)) return "shareholder_meetings";
  if (/acquire|acquisition|asco|aha|hiv|analyst call|sell-side|clesrovimab|investor event/.test(lower)) {
    return "investor_events";
  }
  return "conference_presentations";
}

function classifyDocument(eventTitle, docTitle) {
  const doc = docTitle.toLowerCase();
  if (/vote result/.test(doc)) {
    return {
      documentType: "vote_results",
      folder: "02_investor_events/shareholder_meetings",
      status: "metadata_only",
      notes: "Metadata-only. Excluded from core investor-event document set.",
    };
  }
  if (/transcript/.test(doc)) {
    return {
      documentType: "event_transcript",
      folder: "02_investor_events/transcripts",
      status: "downloaded",
      notes: "",
    };
  }
  if (/presentation|deck|slides/.test(doc)) {
    return {
      documentType: "event_presentation",
      folder: `02_investor_events/${classifyEvent(eventTitle)}`,
      status: "downloaded",
      notes: "",
    };
  }
  return {
    documentType: "investor_event_document",
    folder: `02_investor_events/${classifyEvent(eventTitle)}`,
    status: "downloaded",
    notes: "",
  };
}

function addManifestRows(rows) {
  fs.appendFileSync(manifestPath, `${rows.map(csvLine).join("\n")}\n`, "utf8");
}

function apiUrlForYear(year) {
  const before =
    year === 2026
      ? "2026-06-13 00:00:00"
      : `${year + 1}-01-01 00:00:00`;
  const params = new URLSearchParams({
    per_page: "100",
    page: "1",
    before,
    after: `${year}-01-01 00:00:00`,
  });
  return `https://www.merck.com/wp-json/mco-api/v1/events/range/?${params.toString()}`;
}

function collectDocs(event) {
  const acf = event.acf_fields || {};
  const docs = [];

  if (acf.event_document_path) {
    docs.push({ title: "Presentation", url: acf.event_document_path });
  }

  if (Array.isArray(acf.event_attachments)) {
    for (const item of acf.event_attachments) {
      const url = item?.url || item?.file?.url || "";
      if (url) docs.push({ title: item?.title || "Attachment", url });
    }
  }

  if (Array.isArray(acf.event_presentation)) {
    for (const item of acf.event_presentation) {
      const url = item?.document_path || item?.url || item?.file?.url || "";
      if (url) docs.push({ title: item?.title || "Presentation", url });
    }
  }

  return docs.filter((doc, index, all) => {
    const key = `${decodeHtml(doc.title).toLowerCase()}|${doc.url}`;
    return all.findIndex((other) => `${decodeHtml(other.title).toLowerCase()}|${other.url}` === key) === index;
  });
}

const rows = [];
const majorRows = [];
const supportingRows = [];
const seenUrls = new Set();

for (const year of years) {
  const apiUrl = apiUrlForYear(year);
  const events = readJsonViaCurl(apiUrl, `investor-events-${year}.json`);
  for (const event of events) {
    const title = decodeHtml(event.post_title);
    if (!title || isEarningsEvent(event)) continue;

    const docs = collectDocs(event);
    const publicationDate = eventDate(event);
    const yearValue = eventYear(event) || String(year);
    const sourceUrl = event.link || eventsSource;
    const webcast = event?.acf_fields?.event_webcast_link || "";

    if (webcast) {
      const row = {
        id: nextId(),
        repository: "02_investor_events",
        subfolder: `02_investor_events/${classifyEvent(title)}`,
        title: `${title} - Webcast`,
        document_type: "webcast_link",
        year: yearValue,
        quarter: "",
        publication_date: publicationDate,
        source_url: sourceUrl,
        download_url: webcast,
        local_path: "",
        file_type: "link",
        source_domain: domainFromUrl(webcast),
        collected_date: collectedDate,
        notes: "Metadata-only webcast link from official Merck event page.",
        status: "metadata_only",
      };
      rows.push(row);
      supportingRows.push(row);
    }

    for (const doc of docs) {
      const docTitle = decodeHtml(doc.title);
      const url = doc.url;
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);

      const classification = classifyDocument(title, docTitle);
      const ext = extensionFromUrl(url);
      const rowBase = {
        id: nextId(),
        repository: "02_investor_events",
        subfolder: classification.folder,
        title: `${title} - ${docTitle}`,
        document_type: classification.documentType,
        year: yearValue,
        quarter: "",
        publication_date: publicationDate,
        source_url: sourceUrl,
        download_url: url,
        local_path: "",
        file_type: ext.replace(".", ""),
        source_domain: domainFromUrl(url),
        collected_date: collectedDate,
        notes: classification.notes || `Event page: ${sourceUrl}`,
        status: classification.status,
      };

      if (classification.status === "metadata_only") {
        rows.push(rowBase);
        supportingRows.push(rowBase);
        continue;
      }

      const fileName = `${publicationDate || yearValue}_${slugify(title)}_${slugify(docTitle)}${ext}`;
      const relPath = `${classification.folder}/${fileName}`;
      const outputPath = path.join(corpusRoot, ...relPath.split("/"));
      try {
        runCurl(url, outputPath);
        const row = { ...rowBase, local_path: relPath, status: "downloaded" };
        rows.push(row);
        majorRows.push(row);
      } catch (error) {
        rows.push({
          ...rowBase,
          notes: `Download failed: ${String(error.message || error).slice(0, 240)}`,
          status: "failed",
        });
      }
    }
  }
}

addManifestRows(rows);

function writeIndex(filePath, indexRows) {
  fs.writeFileSync(filePath, `${columns.join(",")}\n${indexRows.map(csvLine).join("\n")}\n`, "utf8");
}

writeIndex(path.join(corpusRoot, "02_investor_events", "major_documents.csv"), majorRows);
writeIndex(path.join(corpusRoot, "02_investor_events", "supporting_documents.csv"), supportingRows);

const downloadedCount = rows.filter((row) => row.status === "downloaded").length;
const metadataCount = rows.filter((row) => row.status === "metadata_only").length;
const failedCount = rows.filter((row) => row.status === "failed").length;
const byType = rows.reduce((acc, row) => {
  acc[row.document_type] = (acc[row.document_type] || 0) + 1;
  return acc;
}, {});

const readme = `# Merck Investor Events and Presentations

Official Merck investor event materials collected from Merck's Events & presentations page.

## Scope

- Years covered: 2024, 2025 and 2026 year-to-date through ${collectedDate}
- Included: investor-event presentations, conference transcripts, acquisition/event decks, annual meeting presentations and transcripts
- Excluded from downloads: routine earnings-call materials already captured in \`01_financial_reports\`
- Retained as metadata-only: webcast links and annual meeting vote-result links

## Contents

- \`conference_presentations/\`: presentation PDFs from recurring investor/healthcare conferences
- \`investor_events/\`: product, business-development, scientific-conference and strategic investor-event decks
- \`shareholder_meetings/\`: annual meeting presentation materials
- \`transcripts/\`: investor-event and conference transcript PDFs
- \`major_documents.csv\`: downloaded presentation/transcript set for hackathon use
- \`supporting_documents.csv\`: webcast and vote-result metadata retained for reference

## Collection Summary

- Manifest rows added: ${rows.length}
- Downloaded files: ${downloadedCount}
- Metadata-only links: ${metadataCount}
- Failed downloads: ${failedCount}
- Document types: ${Object.entries(byType)
  .map(([key, count]) => `${key}=${count}`)
  .join(", ")}

Source: ${eventsSource}
`;

fs.writeFileSync(path.join(corpusRoot, "02_investor_events", "README.md"), readme, "utf8");

console.log(
  JSON.stringify(
    {
      years,
      rows: rows.length,
      downloaded: downloadedCount,
      metadata_only: metadataCount,
      failed: failedCount,
      byType,
    },
    null,
    2,
  ),
);
