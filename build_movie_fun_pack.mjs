import fs from "node:fs";
import path from "node:path";

const root = path.resolve("Fun LLM Hackathon Packs", "01_movies_tv");
const sourceDir = path.join(root, "source_files", "ml-latest-small");
const cleanedDir = path.join(root, "cleaned_data");
const collectedDate = "2026-06-12";
const sourceUrl = "https://grouplens.org/datasets/movielens/";
const downloadUrl = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip";

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
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTitle(title) {
  const match = title.match(/\((\d{4})\)\s*$/);
  return {
    displayTitle: title,
    titleWithoutYear: match ? title.replace(/\s*\(\d{4}\)\s*$/, "") : title,
    year: match ? match[1] : "",
  };
}

function topEntries(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function makeVibe(genres, tags) {
  const g = new Set(genres.map((x) => x.toLowerCase()));
  const tagText = tags.join(" ").toLowerCase();
  const moods = [];

  if (g.has("comedy")) moods.push("funny");
  if (g.has("drama")) moods.push("character-driven");
  if (g.has("thriller") || g.has("crime") || tagText.includes("suspense")) moods.push("tense");
  if (g.has("romance")) moods.push("romantic");
  if (g.has("animation") || g.has("children")) moods.push("family-friendly");
  if (g.has("sci-fi") || tagText.includes("time travel") || tagText.includes("space")) moods.push("imaginative");
  if (g.has("fantasy")) moods.push("fantastical");
  if (g.has("horror")) moods.push("dark");
  if (g.has("documentary")) moods.push("real-world");
  if (tagText.includes("twist") || tagText.includes("mind")) moods.push("mind-bending");
  if (tagText.includes("classic") || tagText.includes("oscar")) moods.push("well-regarded");
  if (tagText.includes("quirky")) moods.push("quirky");
  if (tagText.includes("pixar")) moods.push("warm");
  if (moods.length === 0) moods.push("general audience");

  return [...new Set(moods)].slice(0, 5).join("; ");
}

fs.mkdirSync(cleanedDir, { recursive: true });

const movies = readCsv(path.join(sourceDir, "movies.csv"));
const ratings = readCsv(path.join(sourceDir, "ratings.csv"));
const tags = readCsv(path.join(sourceDir, "tags.csv"));

const ratingStats = new Map();
for (const r of ratings) {
  const movieId = r.movieId;
  const rating = Number(r.rating);
  const timestamp = Number(r.timestamp);
  const stats = ratingStats.get(movieId) ?? { count: 0, sum: 0, minTs: timestamp, maxTs: timestamp };
  stats.count += 1;
  stats.sum += rating;
  stats.minTs = Math.min(stats.minTs, timestamp);
  stats.maxTs = Math.max(stats.maxTs, timestamp);
  ratingStats.set(movieId, stats);
}

const tagStats = new Map();
for (const t of tags) {
  const movieId = t.movieId;
  const tag = t.tag.trim();
  if (!tag) continue;
  const normalized = tag.toLowerCase();
  const stats = tagStats.get(movieId) ?? new Map();
  stats.set(normalized, (stats.get(normalized) ?? 0) + 1);
  tagStats.set(movieId, stats);
}

const cards = movies.map((movie) => {
  const parsed = parseTitle(movie.title);
  const genres = movie.genres === "(no genres listed)" ? [] : movie.genres.split("|");
  const stats = ratingStats.get(movie.movieId) ?? { count: 0, sum: 0, minTs: 0, maxTs: 0 };
  const topTags = topEntries(tagStats.get(movie.movieId) ?? new Map(), 8).map(([tag]) => tag);
  const avg = stats.count ? stats.sum / stats.count : 0;
  return {
    movieId: movie.movieId,
    title: parsed.displayTitle,
    title_without_year: parsed.titleWithoutYear,
    release_year: parsed.year,
    genres: genres.join("; "),
    average_rating: stats.count ? avg.toFixed(2) : "",
    rating_count: stats.count,
    tag_count: [...(tagStats.get(movie.movieId) ?? new Map()).values()].reduce((a, b) => a + b, 0),
    top_tags: topTags.join("; "),
    vibe_summary: makeVibe(genres, topTags),
    movielens_url: `https://movielens.org/movies/${movie.movieId}`,
  };
});

const cardHeaders = [
  "movieId",
  "title",
  "title_without_year",
  "release_year",
  "genres",
  "average_rating",
  "rating_count",
  "tag_count",
  "top_tags",
  "vibe_summary",
  "movielens_url",
];

writeCsv(path.join(cleanedDir, "movie_cards.csv"), cards, cardHeaders);

const shortlist = cards
  .filter((c) => Number(c.rating_count) >= 50)
  .sort((a, b) => Number(b.average_rating) - Number(a.average_rating) || Number(b.rating_count) - Number(a.rating_count))
  .slice(0, 300);
writeCsv(path.join(cleanedDir, "team_movie_night_shortlist.csv"), shortlist, cardHeaders);

const topForMarkdown = cards
  .filter((c) => Number(c.rating_count) >= 20)
  .sort((a, b) => Number(b.rating_count) - Number(a.rating_count))
  .slice(0, 500);

const mdLines = [
  "# Movie Cards Top 500",
  "",
  "A compact, LLM-friendly view of the most-rated movies in MovieLens latest-small.",
  "",
];
for (const card of topForMarkdown) {
  mdLines.push(`## ${card.title}`);
  mdLines.push(`- Genres: ${card.genres || "not listed"}`);
  mdLines.push(`- Average rating: ${card.average_rating} from ${card.rating_count} ratings`);
  mdLines.push(`- Common tags: ${card.top_tags || "none in sample"}`);
  mdLines.push(`- Vibe: ${card.vibe_summary}`);
  mdLines.push("");
}
fs.writeFileSync(path.join(cleanedDir, "movie_cards_top_500.md"), `${mdLines.join("\n")}\n`, "utf8");

const manifestRows = [
  {
    id: "movie-0001",
    pack: "01_movies_tv",
    subfolder: "source_archives",
    title: "MovieLens latest-small zip archive",
    document_type: "source_archive",
    source_url: sourceUrl,
    download_url: downloadUrl,
    local_path: "source_archives/ml-latest-small.zip",
    file_type: "zip",
    source_domain: "grouplens.org",
    collected_date: collectedDate,
    notes: "Official MovieLens latest-small archive from GroupLens.",
    status: "downloaded",
  },
  ...["movies.csv", "ratings.csv", "tags.csv", "links.csv", "README.txt"].map((name, index) => ({
    id: `movie-${String(index + 2).padStart(4, "0")}`,
    pack: "01_movies_tv",
    subfolder: "source_files",
    title: `MovieLens latest-small ${name}`,
    document_type: name === "README.txt" ? "source_readme" : "source_csv",
    source_url: sourceUrl,
    download_url: downloadUrl,
    local_path: `source_files/ml-latest-small/${name}`,
    file_type: path.extname(name).slice(1),
    source_domain: "grouplens.org",
    collected_date: collectedDate,
    notes: "Extracted from official MovieLens latest-small archive.",
    status: "downloaded",
  })),
  ...["movie_cards.csv", "movie_cards_top_500.md", "team_movie_night_shortlist.csv"].map((name, index) => ({
    id: `movie-${String(index + 7).padStart(4, "0")}`,
    pack: "01_movies_tv",
    subfolder: "cleaned_data",
    title: name.replace(/_/g, " "),
    document_type: "derived_llm_friendly_file",
    source_url: sourceUrl,
    download_url: downloadUrl,
    local_path: `cleaned_data/${name}`,
    file_type: path.extname(name).slice(1),
    source_domain: "grouplens.org",
    collected_date: collectedDate,
    notes: "Derived from MovieLens latest-small for hackathon usability.",
    status: "generated",
  })),
];

writeCsv(path.join(root, "manifest.csv"), manifestRows, [
  "id",
  "pack",
  "subfolder",
  "title",
  "document_type",
  "source_url",
  "download_url",
  "local_path",
  "file_type",
  "source_domain",
  "collected_date",
  "notes",
  "status",
]);

const readme = `# Movie / TV Fun Pack

Collection date: ${collectedDate}

This pack is a lightweight movie recommendation sandbox for a 2-hour Gen AI / agents hackathon. It uses MovieLens latest-small from GroupLens and adds LLM-friendly summary files so users can work in Excel, Microsoft 365 Copilot, Gemini Enterprise, or similar tools without doing much data prep.

## Source

- Source: MovieLens latest-small from GroupLens
- Source page: ${sourceUrl}
- Download URL: ${downloadUrl}
- Source contents: 9,742 movies, 100,836 ratings, and 3,683 tag applications from 610 anonymized users

## License And Use Note

The bundled MovieLens README states that the data may be used for research purposes under its listed conditions, may be redistributed with those same conditions, and may not be used for commercial or revenue-bearing purposes without permission from GroupLens. Treat this as a fun learning dataset, not a production or commercial asset.

## Folder Guide

- \`source_archives/\`: original downloaded MovieLens zip.
- \`source_files/ml-latest-small/\`: original extracted CSVs and README.
- \`cleaned_data/movie_cards.csv\`: one row per movie, with genres, average rating, rating count, top tags, and a simple vibe summary.
- \`cleaned_data/movie_cards_top_500.md\`: LLM-friendly Markdown cards for the 500 most-rated movies.
- \`cleaned_data/team_movie_night_shortlist.csv\`: 300 higher-rated movies with at least 50 ratings.
- \`manifest.csv\`: source and generated file index.
- \`starter_prompts.md\`: copy/paste challenge prompts.

## Recommended Starting Files

For Excel or Copilot analysis, start with:

- \`cleaned_data/movie_cards.csv\`
- \`cleaned_data/team_movie_night_shortlist.csv\`

For Gemini or document-chat style prompting, start with:

- \`cleaned_data/movie_cards_top_500.md\`
- \`starter_prompts.md\`

## Caveats

- Ratings are from a historical MovieLens sample generated in 2018.
- Tags are user-generated and sparse; many movies have no tags.
- The \`vibe_summary\` field is a lightweight heuristic derived from genres and tags, not an expert label.
- The data does not include streaming availability, posters, trailers, full plots, cast lists, or demographics.
`;
fs.writeFileSync(path.join(root, "README.md"), readme, "utf8");

const prompts = `# Movie / TV Fun Pack Starter Prompts

## Movie Concierge

\`\`\`text
Act as a movie recommendation assistant. Use the uploaded movie pack files only. Ask me five short questions about my mood, constraints, and taste. Then recommend five movies, explaining the tradeoffs using genres, ratings, rating counts, tags, and vibe summaries.
\`\`\`

## Team Movie Night Picker

\`\`\`text
We are choosing a team movie night film. Person A wants comedy or animation, Person B likes thrillers, Person C dislikes horror, and Person D wants something with strong ratings. Use the movie cards and shortlist to propose 10 compromise picks. Explain why each works and who might object.
\`\`\`

## Weird Category Builder

\`\`\`text
Analyze the genres, tags, ratings, and vibe summaries. Create 12 unusual movie-night categories, such as smart but comforting, chaotic weekend energy, or gentle nostalgia. For each category, list 8 movies and explain the pattern.
\`\`\`

## Taste Profile

\`\`\`text
Ask me to name 8 movies I like and 3 movies I dislike. Infer my taste profile, then use the movie_cards file to recommend 10 movies. Separate safe bets from adventurous picks.
\`\`\`

## Recommendation Product Pitch

\`\`\`text
Create a short PowerPoint outline for a smarter movie recommendation experience. Use examples from this dataset. Include the user problem, product concept, demo flow, data limitations, and three future improvements.
\`\`\`

## Excel-Friendly Analysis

\`\`\`text
Using movie_cards.csv, identify the strongest genres by average rating, but avoid misleading conclusions from movies with very few ratings. Explain what threshold you used and why.
\`\`\`

## Quiz Generator

\`\`\`text
Use the movie_cards_top_500 file to create a 20-question movie quiz. Mix easy, medium, and hard questions. Include an answer key and short explanations.
\`\`\`
`;
fs.writeFileSync(path.join(root, "starter_prompts.md"), prompts, "utf8");

const summary = {
  source_movies: movies.length,
  source_ratings: ratings.length,
  source_tags: tags.length,
  movie_cards: cards.length,
  markdown_cards: topForMarkdown.length,
  shortlist_movies: shortlist.length,
  manifest_rows: manifestRows.length,
};

console.log(JSON.stringify(summary, null, 2));
