import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = process.cwd();
const corpusRoot = path.join(workspace, "Merck Official Hackathon Corpus");
const manifestPath = path.join(corpusRoot, "manifest.csv");
const tempDir = path.join(workspace, ".collection_temp");
const collectedDate = "2026-06-12";
const repository = "04_press_releases";
const sourcePage = "https://www.merck.com/media/news/";
const years = ["2025", "2026"];

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

const categories = [
  { slug: "animal-health", label: "Animal Health News", folder: "animal_health" },
  { slug: "corporate-news", label: "Corporate News", folder: "corporate" },
  { slug: "corporate-responsibility-news", label: "Corporate Responsibility News", folder: "corporate_responsibility" },
  { slug: "financial-news", label: "Financial News", folder: "financial" },
  { slug: "prescription-medicine-news", label: "Prescription Medicine News", folder: "prescription_medicine" },
  { slug: "research-and-development-news", label: "Research and Development News", folder: "research_and_development" },
  { slug: "vaccine-news", label: "Vaccine News", folder: "vaccine" },
];

fs.mkdirSync(tempDir, { recursive: true });
for (const category of categories) {
  fs.mkdirSync(path.join(corpusRoot, repository, category.folder), { recursive: true });
}
fs.mkdirSync(path.join(corpusRoot, repository, "uncategorized"), { recursive: true });

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
    .replaceAll("&rsquo;", "'")
    .replaceAll("&reg;", "(R)")
    .replaceAll("&trade;", "(TM)")
    .replaceAll("&quot;", '"')
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text) {
  return decodeHtml(text)
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110)
    .replace(/-+$/g, "");
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

function readJsonViaCurl(url, filename) {
  const outputPath = path.join(tempDir, filename);
  runCurl(url, outputPath);
  return JSON.parse(fs.readFileSync(outputPath, "utf8"));
}

function apiUrlForYear(tagId, year, page = 1) {
  const nextYear = String(Number(year) + 1);
  const params = new URLSearchParams({
    per_page: "100",
    page: String(page),
    before: `${nextYear}-01-01T05:00:00.000Z`,
    after: `${year}-01-01T05:00:00.000Z`,
    tags: String(tagId),
  });
  return `https://www.merck.com/wp-json/wp/v2/news_item/?${params.toString()}`;
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function publicationDate(item) {
  return String(item.date || item.date_gmt || "").slice(0, 10);
}

function quarterFromDate(date) {
  const month = Number(date.slice(5, 7));
  if (!month) return "";
  return `Q${Math.ceil(month / 3)}`;
}

function nextIdFactory(ids) {
  let counter = 1;
  while (ids.has(`pr-${String(counter).padStart(4, "0")}`)) counter += 1;
  return () => {
    let id;
    do {
      id = `pr-${String(counter).padStart(4, "0")}`;
      counter += 1;
    } while (ids.has(id));
    ids.add(id);
    return id;
  };
}

function inferCategory(title) {
  const lower = title.toLowerCase();
  if (/animal health|livestock|veterinary|targan/.test(lower)) return categories.find((item) => item.slug === "animal-health");
  if (/dividend|earnings|sales|revenue|investor conference|goldman sachs|jefferies|j\.p\. morgan/.test(lower)) {
    return categories.find((item) => item.slug === "financial-news");
  }
  if (/gardasil|vaccine|vaccination|capvaxive|enflonsia|rsv|hpv/.test(lower)) return categories.find((item) => item.slug === "vaccine-news");
  if (/phase|study|trial|asco|data|fda|keytruda|welireg|lenvima|lynparza|clinical|calderasib|islatravir/.test(lower)) {
    return categories.find((item) => item.slug === "prescription-medicine-news");
  }
  return categories.find((item) => item.slug === "corporate-news");
}

stripExistingRows();
const ids = existingIds();
const nextId = nextIdFactory(ids);

const tagSlugs = ["press-release", ...categories.map((category) => category.slug)].join(",");
const tags = readJsonViaCurl(
  `https://www.merck.com/wp-json/wp/v2/tags?slug=${tagSlugs}`,
  "press-release-tags.json",
);
const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag]));
const categoryById = new Map(categories.map((category) => [tagBySlug.get(category.slug)?.id, category]).filter(([id]) => id));
const pressReleaseTagId = tagBySlug.get("press-release")?.id;
if (!pressReleaseTagId) throw new Error("Unable to find Merck press-release tag ID.");

const categoryMapById = new Map();

function readAllPages(tagId, year, filenamePrefix) {
  const all = [];
  for (let page = 1; ; page += 1) {
    const items = readJsonViaCurl(apiUrlForYear(tagId, year, page), `${filenamePrefix}-${year}-page${page}.json`);
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

const releaseItems = [];
for (const currentYear of years) {
  releaseItems.push(...readAllPages(pressReleaseTagId, currentYear, "press-releases"));
  for (const category of categories) {
    const tagId = tagBySlug.get(category.slug)?.id;
    if (!tagId) continue;
    const items = readAllPages(tagId, currentYear, `press-releases-${category.slug}`);
    for (const item of items) {
      const existing = categoryMapById.get(item.id) || [];
      if (!existing.some((value) => value.slug === category.slug)) existing.push(category);
      categoryMapById.set(item.id, existing);
    }
  }
}

const rows = [];
const timelineRows = [];

for (const item of releaseItems) {
  const title = decodeHtml(item.title?.rendered || item.slug);
  const date = publicationDate(item);
  const itemCategories = [
    ...(item.tags || []).map((tagId) => categoryById.get(tagId)).filter(Boolean),
    ...(categoryMapById.get(item.id) || []),
  ].filter((category, index, all) => category && all.findIndex((other) => other.slug === category.slug) === index);
  const primaryCategory = itemCategories[0] || inferCategory(title);
  const categoryFolder = primaryCategory?.folder || "uncategorized";
  const subfolder = `${repository}/${categoryFolder}`;
  const relPath = `${subfolder}/${date}_${slugify(title)}.html`;
  const outputPath = path.join(corpusRoot, ...relPath.split("/"));
  const pdfUrl = item.acf?.document_path || "";
  const notes = [
    `Categories: ${itemCategories.length ? itemCategories.map((category) => category.label).join("; ") : primaryCategory?.label || "Inferred"}`,
    pdfUrl ? `Official PDF URL: ${pdfUrl}` : "",
    `API item ID: ${item.id}`,
  ]
    .filter(Boolean)
    .join(" | ");

  const row = {
    id: nextId(),
    repository,
    subfolder,
    title,
    document_type: "press_release_snapshot",
    year: date.slice(0, 4),
    quarter: quarterFromDate(date),
    publication_date: date,
    source_url: item.link,
    download_url: item.link,
    local_path: relPath,
    file_type: "html",
    source_domain: domainFromUrl(item.link),
    collected_date: collectedDate,
    notes,
    status: "snapshot_saved",
  };

  try {
    runCurl(item.link, outputPath);
  } catch (error) {
    row.local_path = "";
    row.notes = `Snapshot failed: ${String(error.message || error).slice(0, 240)} | ${notes}`;
    row.status = "failed";
  }

  rows.push(row);
  timelineRows.push({
    ...row,
    primary_category: primaryCategory?.label || "Uncategorized",
    official_pdf_url: pdfUrl,
    api_id: item.id,
  });
}

rows.sort((a, b) => b.publication_date.localeCompare(a.publication_date) || a.title.localeCompare(b.title));
timelineRows.sort((a, b) => b.publication_date.localeCompare(a.publication_date) || a.title.localeCompare(b.title));

fs.appendFileSync(manifestPath, `${rows.map(csvLine).join("\n")}\n`, "utf8");

fs.writeFileSync(path.join(corpusRoot, repository, "major_documents.csv"), `${columns.join(",")}\n${rows.map(csvLine).join("\n")}\n`, "utf8");

const timelineColumns = [...columns, "primary_category", "official_pdf_url", "api_id"];
fs.writeFileSync(
  path.join(corpusRoot, repository, "timeline_index.csv"),
  `${timelineColumns.join(",")}\n${timelineRows.map((row) => timelineColumns.map((key) => csvField(row[key])).join(",")).join("\n")}\n`,
  "utf8",
);

const byFolder = rows.reduce((acc, row) => {
  const folder = row.subfolder.split("/").at(-1);
  acc[folder] = (acc[folder] || 0) + 1;
  return acc;
}, {});
const byStatus = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

const readme = `# Merck Press Releases

Official Merck news releases collected from Merck's News releases page.

## Scope

- Controlled collection: 2025 full-year and 2026 year-to-date press releases
- Source: ${sourcePage}
- Stored as HTML snapshots for retrieval, summarization and timeline analysis
- Official PDF URLs, where exposed by Merck's API, are preserved in the manifest notes and \`timeline_index.csv\`

## Contents

- \`animal_health/\`
- \`corporate/\`
- \`corporate_responsibility/\`
- \`financial/\`
- \`prescription_medicine/\`
- \`research_and_development/\`
- \`vaccine/\`
- \`major_documents.csv\`: manifest-style index for the 2025-2026 release snapshots
- \`timeline_index.csv\`: date/category index with official PDF URLs where available

## Collection Summary

- Releases indexed: ${rows.length}
- Status counts: ${Object.entries(byStatus)
  .map(([key, count]) => `${key}=${count}`)
  .join(", ")}
- Folder counts: ${Object.entries(byFolder)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, count]) => `${key}=${count}`)
  .join(", ")}

Notes:

- Merck states that each news release was factually accurate on the date issued and that readers should not rely on releases as current after their issuance dates.
- This batch covers 2025 and 2026 year-to-date. Review volume/usefulness before adding older years.
`;

fs.writeFileSync(path.join(corpusRoot, repository, "README.md"), readme, "utf8");

console.log(
  JSON.stringify(
    {
      years,
      rows: rows.length,
      status_counts: byStatus,
      folder_counts: byFolder,
    },
    null,
    2,
  ),
);
