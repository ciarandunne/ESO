import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tempDir = path.join(process.cwd(), ".collection_temp");
fs.mkdirSync(tempDir, { recursive: true });

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

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(tempDir, file), "utf8"));
}

function decodeHtml(text) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&#038;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#8217;", "'")
    .replaceAll("&quot;", '"');
}

const sourceFiles = [
  "wp_search_corporate_responsibility.json",
  "wp_search_purpose_progress.json",
  "wp_search_esg_report.json",
  "wp_search_2023_2024_impact.json",
];

const relevant = new Map();
for (const file of sourceFiles) {
  if (!fs.existsSync(path.join(tempDir, file))) continue;
  for (const item of readJson(file)) {
    const title = decodeHtml(item.title || "");
    if (/responsibility report|impact report|ESG|sustainable value|access to health|operating responsibly/i.test(title)) {
      relevant.set(item.url, { title, url: item.url, type: item.subtype });
    }
  }
}

const candidates = [];
for (const item of relevant.values()) {
  const filename = `${item.url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 120)}.html`;
  const htmlPath = path.join(tempDir, filename);
  try {
    runCurl(item.url, htmlPath);
  } catch (error) {
    candidates.push({ source_title: item.title, source_url: item.url, title: "FETCH_FAILED", url: "", note: error.message });
    continue;
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const hrefRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  let foundAny = false;
  while ((match = hrefRegex.exec(html))) {
    const href = decodeHtml(match[1]);
    const label = decodeHtml(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (
      /\.pdf($|[?#])/i.test(href) ||
      /\.xlsx?($|[?#])/i.test(href) ||
      /responsibility|impact|ESG|sustainability|progress|report/i.test(label)
    ) {
      foundAny = true;
      candidates.push({
        source_title: item.title,
        source_url: item.url,
        title: label || path.basename(new URL(href, item.url).pathname),
        url: new URL(href, item.url).href,
        note: "",
      });
    }
  }
  if (!foundAny) {
    candidates.push({ source_title: item.title, source_url: item.url, title: "NO_LINKS_FOUND", url: "", note: "" });
  }
}

const outPath = path.join(tempDir, "esg_discovered_links.json");
fs.writeFileSync(outPath, JSON.stringify(candidates, null, 2), "utf8");

for (const row of candidates) {
  console.log(`${row.source_title}\t${row.title}\t${row.url}\t${row.note}`);
}
