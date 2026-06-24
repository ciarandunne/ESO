import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const corpusRoot = path.join(process.cwd(), "Merck Official Hackathon Corpus");
const csvPath = path.join(corpusRoot, "manifest.csv");
const xlsxPath = path.join(corpusRoot, "manifest.xlsx");

const csvText = await fs.readFile(csvPath, "utf8");
const workbook = await Workbook.fromCSV(csvText, { sheetName: "Manifest" });
const sheet = workbook.worksheets.getItem("Manifest");
sheet.showGridLines = false;
sheet.freezePanes.freezeRows(1);

const used = sheet.getUsedRange();
used.format = {
  font: { name: "Aptos", size: 10, color: "#1F2933" },
  wrapText: true,
  verticalAlignment: "top",
};

const header = sheet.getRange("A1:P1");
header.format = {
  fill: "#0B6F69",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  wrapText: true,
};
header.format.rowHeightPx = 42;

const widths = [
  80, 150, 210, 300, 150, 70, 75, 110,
  310, 310, 300, 80, 160, 110, 260, 110,
];

for (let i = 0; i < widths.length; i += 1) {
  sheet.getRangeByIndexes(0, i, 1, 1).format.columnWidthPx = widths[i];
}

const rowCount = used.rowCount;
if (rowCount > 1) {
  const table = sheet.tables.add(`A1:P${rowCount}`, true, "ManifestTable");
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
}

const statusCol = sheet.getRange(`P2:P${Math.max(rowCount, 2)}`);
statusCol.conditionalFormats.add("containsText", {
  text: "failed",
  format: { fill: "#FEE2E2", font: { color: "#991B1B", bold: true } },
});
statusCol.conditionalFormats.add("containsText", {
  text: "metadata_only",
  format: { fill: "#E0F2FE", font: { color: "#075985", bold: true } },
});
statusCol.conditionalFormats.add("containsText", {
  text: "duplicate",
  format: { fill: "#FEF3C7", font: { color: "#92400E", bold: true } },
});

const preview = await workbook.render({
  sheetName: "Manifest",
  range: "A1:P20",
  scale: 1,
  format: "png",
});
await fs.writeFile(
  path.join(corpusRoot, "manifest_preview.png"),
  new Uint8Array(await preview.arrayBuffer()),
);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(xlsxPath);

console.log(`Saved ${xlsxPath}`);
