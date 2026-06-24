import fs from "node:fs";
import path from "node:path";

const root = path.resolve("Fun LLM Hackathon Packs", "03_rahway_team_outings");
const sourcePath = path.join(root, "source_files", "openstreetmap_rahway_35km_restaurants_activities.json");
const cleanedDir = path.join(root, "cleaned_data");
const collectedDate = "2026-06-12";
const rahway = { lat: 40.6082, lon: -74.2776 };
const sourceUrl = "https://www.openstreetmap.org/";
const overpassUrl = "https://overpass-api.de/api/interpreter";

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

function haversineMiles(lat1, lon1, lat2, lon2) {
  const radius = 3958.8;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function getLatLon(element) {
  if (element.lat && element.lon) return { lat: element.lat, lon: element.lon };
  if (element.center?.lat && element.center?.lon) return { lat: element.center.lat, lon: element.center.lon };
  return { lat: null, lon: null };
}

function cleanTag(tags, key) {
  return tags?.[key] ?? "";
}

function address(tags) {
  const parts = [
    cleanTag(tags, "addr:housenumber"),
    cleanTag(tags, "addr:street"),
    cleanTag(tags, "addr:city"),
    cleanTag(tags, "addr:state"),
    cleanTag(tags, "addr:postcode"),
  ].filter(Boolean);
  return parts.join(", ");
}

function mainCategory(tags) {
  const amenity = tags.amenity ?? "";
  const tourism = tags.tourism ?? "";
  const leisure = tags.leisure ?? "";
  const shop = tags.shop ?? "";
  const cuisine = tags.cuisine ?? "";

  if (["restaurant", "cafe", "bar", "pub", "biergarten", "ice_cream", "food_court"].includes(amenity)) {
    if (amenity === "restaurant") return cuisine ? `restaurant: ${cuisine.replaceAll(";", ", ")}` : "restaurant";
    return amenity.replaceAll("_", " ");
  }
  if (amenity) return amenity.replaceAll("_", " ");
  if (tourism) return tourism.replaceAll("_", " ");
  if (leisure) return leisure.replaceAll("_", " ");
  if (shop) return shop.replaceAll("_", " ");
  return "place";
}

function packType(tags) {
  const amenity = tags.amenity ?? "";
  const tourism = tags.tourism ?? "";
  const leisure = tags.leisure ?? "";
  const shop = tags.shop ?? "";
  if (["restaurant", "cafe", "bar", "pub", "biergarten", "ice_cream", "food_court"].includes(amenity)) return "food_drink";
  if (["cinema", "theatre", "arts_centre", "music_venue", "planetarium"].includes(amenity)) return "culture_entertainment";
  if (["community_centre", "conference_centre", "events_venue", "library"].includes(amenity)) return "venue_community";
  if (["museum", "gallery", "attraction", "theme_park", "zoo", "aquarium", "viewpoint"].includes(tourism)) return "activity_attraction";
  if (["sports_centre", "fitness_centre", "golf_course", "miniature_golf", "bowling_alley", "escape_game", "trampoline_park", "ice_rink", "stadium", "marina"].includes(leisure)) return "active_fun";
  if (["park", "nature_reserve"].includes(leisure)) return "outdoor";
  if (["mall", "department_store"].includes(shop)) return "shopping_walkaround";
  return "other";
}

function teamUse(tags, category, type) {
  const text = `${category} ${tags.cuisine ?? ""} ${tags.name ?? ""}`.toLowerCase();
  if (type === "food_drink") {
    if (/bar|pub|brew|beer|wine/.test(text)) return "after-work drinks or informal team social";
    if (/cafe|coffee|bakery|ice/.test(text)) return "low-key coffee, dessert, or small-group catch-up";
    if (/pizza|burger|bbq|taco|mexican|diner|american/.test(text)) return "casual team meal";
    if (/sushi|thai|indian|korean|japanese|chinese|italian|mediterranean/.test(text)) return "team meal with a specific cuisine angle";
    return "team lunch or dinner";
  }
  if (type === "culture_entertainment") return "structured entertainment or evening activity";
  if (type === "active_fun") return "active team-building or playful outing";
  if (type === "activity_attraction") return "local exploration or culture outing";
  if (type === "outdoor") return "walk-and-talk, picnic, or outdoor decompression";
  if (type === "shopping_walkaround") return "easy indoor walkaround with food options nearby";
  if (type === "venue_community") return "possible hosted event or group gathering";
  return "general team outing candidate";
}

function confidence(tags, miles) {
  let score = 0;
  if (tags.name) score += 2;
  if (tags.website || tags["contact:website"]) score += 2;
  if (tags.phone || tags["contact:phone"]) score += 1;
  if (tags.opening_hours) score += 1;
  if (tags.cuisine) score += 1;
  if (miles <= 20) score += 1;
  if (score >= 6) return "higher";
  if (score >= 3) return "medium";
  return "basic";
}

function recommendationScore(row) {
  let score = 100;
  score -= Number(row.distance_miles_from_rahway) * 2.5;
  if (row.within_45_min_model === "yes") score += 20;
  if (row.data_confidence === "higher") score += 20;
  if (row.data_confidence === "medium") score += 10;
  if (row.website) score += 8;
  if (row.phone) score += 4;
  if (row.opening_hours) score += 4;
  if (row.address) score += 4;
  if (row.cuisine) score += 3;
  if (row.pack_type === "food_drink" && /fast_food/.test(row.category)) score -= 20;
  if (row.pack_type === "outdoor" && Number(row.distance_miles_from_rahway) > 18) score -= 8;
  return Math.round(score);
}

function maybeWebsite(tags) {
  return tags.website || tags["contact:website"] || "";
}

function maybePhone(tags) {
  return tags.phone || tags["contact:phone"] || "";
}

fs.mkdirSync(cleanedDir, { recursive: true });
const osm = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const seen = new Set();
const rows = [];

for (const element of osm.elements ?? []) {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  if (!name) continue;
  const { lat, lon } = getLatLon(element);
  if (lat == null || lon == null) continue;
  const miles = haversineMiles(rahway.lat, rahway.lon, lat, lon);
  if (miles > 28) continue;
  const type = packType(tags);
  if (type === "other") continue;
  const dedupeKey = `${name.toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);
  const category = mainCategory(tags);
  const driveMinutes = Math.max(8, Math.round(miles * 2.0 + 8));
  const row = {
    osm_id: `${element.type}/${element.id}`,
    name,
    pack_type: type,
    category,
    cuisine: tags.cuisine ?? "",
    distance_miles_from_rahway: miles.toFixed(1),
    rough_drive_minutes_from_rahway: driveMinutes,
    within_45_min_model: driveMinutes <= 45 ? "yes" : "maybe_check_traffic",
    team_use_case: teamUse(tags, category, type),
    address: address(tags),
    city: tags["addr:city"] ?? "",
    website: maybeWebsite(tags),
    phone: maybePhone(tags),
    opening_hours: tags.opening_hours ?? "",
    lat,
    lon,
    osm_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    data_confidence: confidence(tags, miles),
    verify_before_booking: "yes",
  };
  row.recommendation_score = recommendationScore(row);
  rows.push(row);
}

rows.sort((a, b) => {
  const typeOrder = a.pack_type.localeCompare(b.pack_type);
  if (typeOrder !== 0) return typeOrder;
  return Number(a.distance_miles_from_rahway) - Number(b.distance_miles_from_rahway) || a.name.localeCompare(b.name);
});

const headers = [
  "osm_id",
  "name",
  "pack_type",
  "category",
  "cuisine",
  "distance_miles_from_rahway",
  "rough_drive_minutes_from_rahway",
  "within_45_min_model",
  "team_use_case",
  "address",
  "city",
  "website",
  "phone",
  "opening_hours",
  "lat",
  "lon",
  "osm_url",
  "data_confidence",
  "recommendation_score",
  "verify_before_booking",
];

writeCsv(path.join(cleanedDir, "rahway_outing_places.csv"), rows, headers);
writeCsv(path.join(cleanedDir, "rahway_restaurants_food_drink.csv"), rows.filter((r) => r.pack_type === "food_drink"), headers);
writeCsv(path.join(cleanedDir, "rahway_activities.csv"), rows.filter((r) => r.pack_type !== "food_drink"), headers);

const shortlistQuotas = {
  food_drink: 190,
  active_fun: 90,
  culture_entertainment: 60,
  activity_attraction: 55,
  outdoor: 55,
  venue_community: 30,
  shopping_walkaround: 20,
};

const highSignal = [];
for (const [type, quota] of Object.entries(shortlistQuotas)) {
  const candidates = rows
    .filter((r) => r.pack_type === type)
    .filter((r) => r.within_45_min_model === "yes")
    .filter((r) => r.data_confidence !== "basic" || Number(r.distance_miles_from_rahway) <= 10 || r.pack_type === "outdoor")
    .sort((a, b) => Number(b.recommendation_score) - Number(a.recommendation_score) || Number(a.distance_miles_from_rahway) - Number(b.distance_miles_from_rahway));
  highSignal.push(...candidates.slice(0, quota));
}
highSignal.sort((a, b) => Number(b.recommendation_score) - Number(a.recommendation_score) || Number(a.distance_miles_from_rahway) - Number(b.distance_miles_from_rahway));
writeCsv(path.join(cleanedDir, "rahway_team_outing_shortlist.csv"), highSignal, headers);

const mdRows = highSignal.slice(0, 250);
const mdLines = [
  "# Rahway Team Outing Cards",
  "",
  "A compact, LLM-friendly set of restaurants and activities around Rahway, NJ. Distances and drive times are rough estimates from central Rahway and should be verified before booking.",
  "",
];
for (const row of mdRows) {
  mdLines.push(`## ${row.name}`);
  mdLines.push(`- Type: ${row.pack_type}; ${row.category}`);
  if (row.cuisine) mdLines.push(`- Cuisine/tags: ${row.cuisine}`);
  mdLines.push(`- Approx distance from Rahway: ${row.distance_miles_from_rahway} miles; rough drive model: ${row.rough_drive_minutes_from_rahway} minutes`);
  mdLines.push(`- Team use case: ${row.team_use_case}`);
  if (row.address) mdLines.push(`- Address: ${row.address}`);
  if (row.website) mdLines.push(`- Website: ${row.website}`);
  mdLines.push(`- Verify before booking: ${row.verify_before_booking}`);
  mdLines.push("");
}
fs.writeFileSync(path.join(cleanedDir, "rahway_team_outing_cards.md"), `${mdLines.join("\n")}\n`, "utf8");

const manifestRows = [
  {
    id: "rahway-0001",
    pack: "03_rahway_team_outings",
    subfolder: "source_files",
    title: "OpenStreetMap Overpass extract for Rahway restaurants and activities",
    document_type: "source_json",
    source_url: sourceUrl,
    download_url: overpassUrl,
    local_path: "source_files/openstreetmap_rahway_35km_restaurants_activities.json",
    file_type: "json",
    source_domain: "openstreetmap.org; overpass-api.de",
    collected_date: collectedDate,
    notes: "Public OpenStreetMap extract centered near Rahway, NJ; around 35km query, then filtered to roughly 28 miles.",
    status: "downloaded",
  },
  ...[
    "rahway_outing_places.csv",
    "rahway_restaurants_food_drink.csv",
    "rahway_activities.csv",
    "rahway_team_outing_shortlist.csv",
    "rahway_team_outing_cards.md",
  ].map((name, index) => ({
    id: `rahway-${String(index + 2).padStart(4, "0")}`,
    pack: "03_rahway_team_outings",
    subfolder: "cleaned_data",
    title: name.replace(/_/g, " "),
    document_type: "derived_llm_friendly_file",
    source_url: sourceUrl,
    download_url: overpassUrl,
    local_path: `cleaned_data/${name}`,
    file_type: path.extname(name).slice(1),
    source_domain: "openstreetmap.org; overpass-api.de",
    collected_date: collectedDate,
    notes: "Derived from OpenStreetMap tags for hackathon usability. Not a booking, ratings, hours, or live-traffic source.",
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

const counts = rows.reduce((acc, row) => {
  acc[row.pack_type] = (acc[row.pack_type] ?? 0) + 1;
  return acc;
}, {});

const readme = `# Rahway Team Outings Fun Pack

Collection date: ${collectedDate}

This pack is a lightweight public-data sandbox for building a restaurant/activity recommendation bot for team outings near Rahway, NJ. It is designed for Microsoft 365 Copilot, Gemini Enterprise, Excel, and document-chat style workflows.

## Source

- Source: OpenStreetMap data queried through Overpass API
- OpenStreetMap: ${sourceUrl}
- Overpass API: ${overpassUrl}
- Query center: Rahway, NJ, approximated at latitude ${rahway.lat}, longitude ${rahway.lon}
- Collection radius: 35 km query, then filtered to roughly 28 miles

## Attribution And License Note

This pack uses OpenStreetMap data. OpenStreetMap data is copyright OpenStreetMap contributors and is available under the Open Database License. Keep source attribution with any shared derivative pack.

## Important Caveat

This is not a live restaurant reservation or review dataset. It does not provide reliable ratings, pricing, current opening hours, menus, private-room availability, accessibility, or live travel times. Any bot or agent built from this pack should tell users to verify details before booking.

The 45-minute constraint is modeled with a rough drive-time estimate from central Rahway. Real travel time depends on office location, time of day, route, parking, and traffic.

## Folder Guide

- \`source_files/openstreetmap_rahway_35km_restaurants_activities.json\`: raw OpenStreetMap/Overpass extract.
- \`cleaned_data/rahway_outing_places.csv\`: all cleaned restaurants and activity places.
- \`cleaned_data/rahway_restaurants_food_drink.csv\`: food and drink subset.
- \`cleaned_data/rahway_activities.csv\`: non-restaurant activities and venues.
- \`cleaned_data/rahway_team_outing_shortlist.csv\`: compact shortlist for quick hackathon use.
- \`cleaned_data/rahway_team_outing_cards.md\`: LLM-friendly Markdown cards for chat-style tools.
- \`manifest.csv\`: source and generated file index.
- \`starter_prompts.md\`: copy/paste challenge prompts.

## Summary Counts

- Total cleaned places: ${rows.length}
- Shortlist places: ${highSignal.length}
- Food/drink places: ${counts.food_drink ?? 0}
- Activities/venues/outdoor/shopping places: ${rows.length - (counts.food_drink ?? 0)}

## Good Hackathon Ideas

- Team lunch recommender.
- After-work outing planner.
- Indoor rainy-day activity recommender.
- Budget/vibe-based team social assistant.
- Agent that asks follow-up questions, proposes options, and generates a booking checklist.
`;
fs.writeFileSync(path.join(root, "README.md"), readme, "utf8");

const prompts = `# Rahway Team Outings Starter Prompts

## Team Outing Concierge

\`\`\`text
Act as a team outing concierge for colleagues based near Rahway, NJ. Use the uploaded Rahway outing files only. Ask me five questions about group size, budget, food preferences, alcohol/no alcohol, indoor/outdoor preference, and desired vibe. Then recommend 8 options within the 45-minute model and explain what details I should verify before booking.
\`\`\`

## Lunch Finder

\`\`\`text
Use rahway_restaurants_food_drink.csv. Recommend 10 team lunch options for a group of 8-12 people. Prioritize places close to Rahway, avoid places that look like only dessert/coffee unless they are useful as add-ons, and include cuisine variety.
\`\`\`

## Rainy Day Plan

\`\`\`text
Use rahway_activities.csv and rahway_team_outing_cards.md. Create three rainy-day team outing plans near Rahway: low-effort, playful, and culture-oriented. Include one food/drink follow-up idea for each plan using the restaurants file.
\`\`\`

## After-Work Social

\`\`\`text
Find options for an after-work team social within the 45-minute model. Split recommendations into no-alcohol, casual drinks, active fun, and dinner-first. Explain why each option fits and what to verify.
\`\`\`

## Agent Workflow

\`\`\`text
Design a simple agent workflow for booking a team outing. The agent should ask clarifying questions, search the uploaded place data, shortlist options, produce a decision table, and create a verification checklist for phone/web follow-up.
\`\`\`

## Excel-Friendly Analysis

\`\`\`text
Using rahway_outing_places.csv, summarize the mix of food/drink vs activities, common categories, rough distance bands from Rahway, and where the data looks strongest or weakest.
\`\`\`

## Executive Assistant Draft

\`\`\`text
Draft a short email to a team asking them to vote among five outing options. Include a concise table with name, type, rough drive time, why it fits, and what remains to verify.
\`\`\`
`;
fs.writeFileSync(path.join(root, "starter_prompts.md"), prompts, "utf8");

console.log(JSON.stringify({
  raw_elements: osm.elements?.length ?? 0,
  cleaned_places: rows.length,
  shortlist_places: highSignal.length,
  counts,
  manifest_rows: manifestRows.length,
}, null, 2));
