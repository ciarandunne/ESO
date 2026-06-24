import fs from "node:fs";
import { spawnSync } from "node:child_process";

const candidates = [];
const years = [2023, 2024, 2025, 2026];
const quarters = ["1Q", "2Q", "3Q", "4Q"];
const monthByQuarter = {
  "1Q": ["02", "03", "04"],
  "2Q": ["05", "06", "07"],
  "3Q": ["08", "09", "10"],
  "4Q": ["11", "12", "01"],
};

const patterns = [
  "Public-Pipeline-{Q}{Y}-Merck.pdf",
  "Public-Pipeline-{Q}-{Y}-Merck.pdf",
  "Merck-Pipeline-{Q}{Y}.pdf",
  "Merck-Pipeline-{Q}-{Y}.pdf",
  "Public-Pipeline-{Y}-{Q}-Merck.pdf",
  "Pipeline-{Q}{Y}-Merck.pdf",
];

for (const year of years) {
  for (const quarter of quarters) {
    for (const month of monthByQuarter[quarter]) {
      const uploadYear = quarter === "4Q" && month === "01" ? year + 1 : year;
      for (const pattern of patterns) {
        const filename = pattern.replaceAll("{Q}", quarter).replaceAll("{Y}", String(year));
        candidates.push(`https://www.merck.com/wp-content/uploads/sites/124/${uploadYear}/${month}/${filename}`);
      }
    }
  }
}

const found = [];
for (const url of [...new Set(candidates)]) {
  const result = spawnSync(
    "curl.exe",
    ["--noproxy", "*", "-L", "--silent", "--show-error", "--head", url],
    { encoding: "utf8", stdio: "pipe" },
  );
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (/HTTP\/\S+\s+200\b/.test(output) && /content-type:\s*application\/pdf/i.test(output)) {
    found.push(url);
    console.log(url);
  }
}

fs.writeFileSync(".collection_temp/pipeline-candidates-found.txt", `${found.join("\n")}\n`, "utf8");
console.error(`Found ${found.length} valid PDF candidate(s).`);
