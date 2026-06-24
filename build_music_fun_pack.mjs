import fs from "node:fs";
import path from "node:path";

const root = path.resolve("Fun LLM Hackathon Packs", "02_music");
const sourceDir = path.join(root, "source_files");
const cleanedDir = path.join(root, "cleaned_data");
const collectedDate = "2026-06-12";
const sourceUrl = "https://grouplens.org/datasets/hetrec-2011/";
const downloadUrl = "https://files.grouplens.org/datasets/hetrec2011/hetrec2011-lastfm-2k.zip";

function readTsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const headers = lines.shift().split("\t");
  return lines.map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function topEntries(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function makeVibe(tags) {
  const text = tags.join(" ").toLowerCase();
  const moods = [];
  if (/(rock|punk|metal|hardcore|grunge)/.test(text)) moods.push("high-energy");
  if (/(pop|dance|disco|electro|house|techno|trance)/.test(text)) moods.push("upbeat");
  if (/(folk|singer-songwriter|acoustic|country)/.test(text)) moods.push("story-driven");
  if (/(jazz|blues|soul|funk|rnb|r&b)/.test(text)) moods.push("groove-led");
  if (/(ambient|chill|downtempo|lounge|new age)/.test(text)) moods.push("chill");
  if (/(indie|alternative|shoegaze|post-rock)/.test(text)) moods.push("indie/alternative");
  if (/(classical|instrumental|soundtrack|composer)/.test(text)) moods.push("cinematic");
  if (/(goth|dark|doom|black metal|death metal)/.test(text)) moods.push("dark");
  if (/(hip hop|rap|trip-hop)/.test(text)) moods.push("beat-focused");
  if (/(female vocalists|male vocalists|vocal)/.test(text)) moods.push("vocal-forward");
  if (moods.length === 0) moods.push("eclectic");
  return [...new Set(moods)].slice(0, 5).join("; ");
}

function popularityTier(listenerCount, totalListens) {
  if (listenerCount >= 300 || totalListens >= 150000) return "broadly popular in sample";
  if (listenerCount >= 100 || totalListens >= 50000) return "well represented in sample";
  if (listenerCount >= 25 || totalListens >= 10000) return "specialist favorite in sample";
  return "niche in sample";
}

fs.mkdirSync(cleanedDir, { recursive: true });

const artists = readTsv(path.join(sourceDir, "artists.dat"));
const listens = readTsv(path.join(sourceDir, "user_artists.dat"));
const tags = readTsv(path.join(sourceDir, "tags.dat"));
const tagAssignments = readTsv(path.join(sourceDir, "user_taggedartists.dat"));
const friends = readTsv(path.join(sourceDir, "user_friends.dat"));

const artistById = new Map(artists.map((artist) => [artist.id, artist]));
const tagById = new Map(tags.map((tag) => [tag.tagID, tag.tagValue]));

const listenStats = new Map();
const users = new Set();
for (const row of listens) {
  users.add(row.userID);
  const artistId = row.artistID;
  const weight = Number(row.weight);
  const stats = listenStats.get(artistId) ?? { listeners: new Set(), totalListens: 0 };
  stats.listeners.add(row.userID);
  stats.totalListens += weight;
  listenStats.set(artistId, stats);
}

const artistTags = new Map();
const tagArtistCounts = new Map();
const tagAssignmentCounts = new Map();
for (const row of tagAssignments) {
  const tag = tagById.get(row.tagID);
  if (!tag) continue;
  const artistId = row.artistID;
  const perArtist = artistTags.get(artistId) ?? new Map();
  perArtist.set(tag, (perArtist.get(tag) ?? 0) + 1);
  artistTags.set(artistId, perArtist);
  tagAssignmentCounts.set(tag, (tagAssignmentCounts.get(tag) ?? 0) + 1);
}
for (const [artistId, tagMap] of artistTags.entries()) {
  if (!artistById.has(artistId)) continue;
  for (const tag of tagMap.keys()) {
    const artistsForTag = tagArtistCounts.get(tag) ?? new Set();
    artistsForTag.add(artistId);
    tagArtistCounts.set(tag, artistsForTag);
  }
}

const artistCards = artists.map((artist) => {
  const stats = listenStats.get(artist.id) ?? { listeners: new Set(), totalListens: 0 };
  const topTags = topEntries(artistTags.get(artist.id) ?? new Map(), 10).map(([tag]) => tag);
  const listenerCount = stats.listeners.size;
  const totalListens = stats.totalListens;
  return {
    artistID: artist.id,
    artist_name: artist.name,
    listener_count: listenerCount,
    total_listens: totalListens,
    average_listens_per_listener: listenerCount ? (totalListens / listenerCount).toFixed(1) : "",
    tag_assignment_count: [...(artistTags.get(artist.id) ?? new Map()).values()].reduce((a, b) => a + b, 0),
    top_tags: topTags.join("; "),
    vibe_summary: makeVibe(topTags),
    popularity_tier: popularityTier(listenerCount, totalListens),
    lastfm_url: artist.url,
  };
});

const cardHeaders = [
  "artistID",
  "artist_name",
  "listener_count",
  "total_listens",
  "average_listens_per_listener",
  "tag_assignment_count",
  "top_tags",
  "vibe_summary",
  "popularity_tier",
  "lastfm_url",
];
writeCsv(path.join(cleanedDir, "artist_cards.csv"), artistCards, cardHeaders);

const discoveryShortlist = artistCards
  .filter((artist) => Number(artist.listener_count) >= 15 && Number(artist.tag_assignment_count) >= 5)
  .sort((a, b) => Number(b.listener_count) - Number(a.listener_count) || Number(b.total_listens) - Number(a.total_listens))
  .slice(0, 400);
writeCsv(path.join(cleanedDir, "music_discovery_shortlist.csv"), discoveryShortlist, cardHeaders);

const tagIndex = [...tagAssignmentCounts.keys()].map((tag) => {
  const artistsForTag = [...(tagArtistCounts.get(tag) ?? new Set())];
  const sampleArtists = artistsForTag
    .map((artistId) => artistCards.find((artist) => artist.artistID === artistId))
    .filter(Boolean)
    .sort((a, b) => Number(b.listener_count) - Number(a.listener_count))
    .slice(0, 8)
    .map((artist) => artist.artist_name);
  return {
    tag,
    assignment_count: tagAssignmentCounts.get(tag) ?? 0,
    artist_count: artistsForTag.length,
    sample_artists: sampleArtists.join("; "),
  };
}).sort((a, b) => Number(b.assignment_count) - Number(a.assignment_count) || a.tag.localeCompare(b.tag));
writeCsv(path.join(cleanedDir, "tag_mood_index.csv"), tagIndex, ["tag", "assignment_count", "artist_count", "sample_artists"]);

const topForMarkdown = artistCards
  .filter((artist) => Number(artist.listener_count) >= 10)
  .sort((a, b) => Number(b.listener_count) - Number(a.listener_count) || Number(b.total_listens) - Number(a.total_listens))
  .slice(0, 500);

const mdLines = [
  "# Artist Cards Top 500",
  "",
  "A compact, LLM-friendly view of the most-listened artists in the HetRec 2011 Last.fm sample.",
  "",
];
for (const artist of topForMarkdown) {
  mdLines.push(`## ${artist.artist_name}`);
  mdLines.push(`- Listeners in sample: ${artist.listener_count}`);
  mdLines.push(`- Total listens in sample: ${artist.total_listens}`);
  mdLines.push(`- Common tags: ${artist.top_tags || "none in sample"}`);
  mdLines.push(`- Vibe: ${artist.vibe_summary}`);
  mdLines.push(`- Popularity tier: ${artist.popularity_tier}`);
  mdLines.push("");
}
fs.writeFileSync(path.join(cleanedDir, "artist_cards_top_500.md"), `${mdLines.join("\n")}\n`, "utf8");

const manifestRows = [
  {
    id: "music-0001",
    pack: "02_music",
    subfolder: "source_archives",
    title: "HetRec 2011 Last.fm 2K zip archive",
    document_type: "source_archive",
    source_url: sourceUrl,
    download_url: downloadUrl,
    local_path: "source_archives/hetrec2011-lastfm-2k.zip",
    file_type: "zip",
    source_domain: "grouplens.org",
    collected_date: collectedDate,
    notes: "Official GroupLens-hosted HetRec 2011 Last.fm dataset archive.",
    status: "downloaded",
  },
  ...["artists.dat", "user_artists.dat", "tags.dat", "user_taggedartists.dat", "user_taggedartists-timestamps.dat", "user_friends.dat", "readme.txt"].map((name, index) => ({
    id: `music-${String(index + 2).padStart(4, "0")}`,
    pack: "02_music",
    subfolder: "source_files",
    title: `HetRec 2011 Last.fm ${name}`,
    document_type: name === "readme.txt" ? "source_readme" : "source_tsv",
    source_url: sourceUrl,
    download_url: downloadUrl,
    local_path: `source_files/${name}`,
    file_type: path.extname(name).slice(1) || "dat",
    source_domain: "grouplens.org",
    collected_date: collectedDate,
    notes: "Extracted from official GroupLens-hosted HetRec 2011 Last.fm archive.",
    status: "downloaded",
  })),
  ...["artist_cards.csv", "artist_cards_top_500.md", "music_discovery_shortlist.csv", "tag_mood_index.csv"].map((name, index) => ({
    id: `music-${String(index + 9).padStart(4, "0")}`,
    pack: "02_music",
    subfolder: "cleaned_data",
    title: name.replace(/_/g, " "),
    document_type: "derived_llm_friendly_file",
    source_url: sourceUrl,
    download_url: downloadUrl,
    local_path: `cleaned_data/${name}`,
    file_type: path.extname(name).slice(1),
    source_domain: "grouplens.org",
    collected_date: collectedDate,
    notes: "Derived from HetRec 2011 Last.fm for hackathon usability.",
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

const readme = `# Music Fun Pack

Collection date: ${collectedDate}

This pack is a lightweight music discovery and taste-profile sandbox for a 2-hour Gen AI / agents hackathon. It uses the GroupLens-hosted HetRec 2011 Last.fm 2K dataset and adds LLM-friendly summary files so users can work in Excel, Microsoft 365 Copilot, Gemini Enterprise, or similar tools without doing much data prep.

## Source

- Source: HetRec 2011 Last.fm 2K dataset hosted by GroupLens
- Source page: ${sourceUrl}
- Download URL: ${downloadUrl}
- Source contents: 1,892 users, 17,632 artists, 92,834 user-artist listening records, 11,946 tags, and 186,479 tag assignments

## License And Use Note

The bundled source README states that the data is made available for non-commercial use. Treat this as a fun learning dataset, not a production or commercial asset.

## Folder Guide

- \`source_archives/\`: original downloaded dataset zip.
- \`source_files/\`: original extracted tab-separated source files and README.
- \`cleaned_data/artist_cards.csv\`: one row per artist, with listener counts, total listens, top tags, vibe summary, and popularity tier.
- \`cleaned_data/artist_cards_top_500.md\`: LLM-friendly Markdown cards for the 500 most-listened artists.
- \`cleaned_data/music_discovery_shortlist.csv\`: 400 artists with enough listeners and tags for recommendation exercises.
- \`cleaned_data/tag_mood_index.csv\`: tag index with sample artists for mood/genre exploration.
- \`manifest.csv\`: source and generated file index.
- \`starter_prompts.md\`: copy/paste challenge prompts.

## Recommended Starting Files

For Excel or Copilot analysis, start with:

- \`cleaned_data/artist_cards.csv\`
- \`cleaned_data/music_discovery_shortlist.csv\`
- \`cleaned_data/tag_mood_index.csv\`

For Gemini or document-chat style prompting, start with:

- \`cleaned_data/artist_cards_top_500.md\`
- \`starter_prompts.md\`

## Caveats

- This is a historical Last.fm sample from 2011, not a current music chart.
- It contains artists and tags, not lyrics, audio files, album metadata, streaming availability, or editorial reviews.
- User IDs are anonymized, but listening and tagging patterns are still behavioral data; use respectfully.
- Tags are user-generated and messy. That messiness is useful for LLM demos, but not authoritative genre classification.
- The \`vibe_summary\` and \`popularity_tier\` fields are lightweight heuristics derived from listening counts and tags.
`;
fs.writeFileSync(path.join(root, "README.md"), readme, "utf8");

const prompts = `# Music Fun Pack Starter Prompts

## Music Concierge

\`\`\`text
Act as a music discovery assistant. Use the uploaded music pack files only. Ask me five short questions about my mood, genres I like, artists I already enjoy, and whether I want safe or adventurous recommendations. Then recommend 10 artists and explain each recommendation using tags, listener counts, total listens, and vibe summaries.
\`\`\`

## Playlist Theme Builder

\`\`\`text
Use artist_cards_top_500.md and tag_mood_index.csv to create 10 playlist concepts, such as rainy day focus, gym but not aggressive, late-night coding, or nostalgic road trip. For each playlist, suggest 12 artists and explain the vibe.
\`\`\`

## Taste Profile

\`\`\`text
Ask me to name 8 artists I like and 3 artists I dislike. Infer my taste profile, then use the artist cards to recommend safe bets, adjacent discoveries, and wild cards. Explain the difference between the three groups.
\`\`\`

## Genre Map

\`\`\`text
Analyze the tag_mood_index file. Create a simple genre/mood map showing which tags cluster together conceptually. Then suggest how someone could navigate from mainstream pop to more niche alternatives in five steps.
\`\`\`

## Team Playlist Compromise

\`\`\`text
We are making a playlist for a mixed group. Person A likes pop and dance, Person B likes indie and alternative, Person C likes metal, and Person D wants chill background music. Use the music discovery shortlist to propose a compromise artist list and explain the tradeoffs.
\`\`\`

## Music Discovery Product Pitch

\`\`\`text
Create a short PowerPoint outline for a smarter music discovery feature. Use examples from this dataset. Include the user problem, proposed experience, demo flow, data limitations, and three future improvements.
\`\`\`

## Excel-Friendly Analysis

\`\`\`text
Using artist_cards.csv, identify the most common vibe summaries and tags among well-represented artists. Avoid misleading conclusions from artists with very few listeners. Explain your threshold and reasoning.
\`\`\`

## Quiz Generator

\`\`\`text
Use artist_cards_top_500.md to create a 20-question music quiz based on artist tags and genre clues. Include an answer key and short explanations.
\`\`\`
`;
fs.writeFileSync(path.join(root, "starter_prompts.md"), prompts, "utf8");

const summary = {
  source_artists: artists.length,
  source_listening_records: listens.length,
  source_tags: tags.length,
  source_tag_assignments: tagAssignments.length,
  source_friend_rows: friends.length,
  unique_users_with_listens: users.size,
  artist_cards: artistCards.length,
  markdown_cards: topForMarkdown.length,
  discovery_shortlist: discoveryShortlist.length,
  tag_index_rows: tagIndex.length,
  manifest_rows: manifestRows.length,
};

console.log(JSON.stringify(summary, null, 2));
