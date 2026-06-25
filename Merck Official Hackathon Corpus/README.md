# Merck Official Hackathon Corpus

Collection date: 2026-06-12

This corpus contains curated documents from official Merck & Co. / MSD sources for an internal Gen AI and agents hackathon.

Merck & Co., Inc. is known as Merck in the United States and Canada and MSD outside the United States and Canada. The corpus is organized to support retrieval, summarization, comparison, trend analysis, timeline building, and multi-step agent workflows.

## Repositories

### 01 Financial Reports

Annual reports, proxy statements, quarterly earnings materials, presentations, financial disclosure files, prepared remarks, and transcripts.

Current scope:

- Fiscal year 2016-2025 annual reports / Form 10-K.
- Related proxy statements where available.
- 2024, 2025, and 2026 year-to-date quarterly earnings materials.

### 02 Investor Events

Investor conference presentations, investor events, shareholder meeting materials, and transcripts.

Current scope:

- 2024, 2025, and 2026 year-to-date investor event and healthcare conference materials.
- Presentations, transcripts, acquisition/event decks, science investor-event materials, and annual meeting presentations/transcripts.
- Routine earnings-call materials excluded because they are already captured in `01_financial_reports`.
- Webcasts and vote results retained as metadata-only reference links.

### 03 Sustainability / ESG

Impact reports, ESG performance data, report summaries, climate/CDP/TCFD materials, sustainability financing reports, and workforce/well-being materials.

Current scope:

- Core impact / ESG / corporate responsibility reporting trail from 2014/2015 through 2024/2025 where official assets remain available.
- Current Purpose for Progress report, report summary, fact sheets, infographics, and performance data.
- Current climate/CDP/TCFD/GHG resources, sustainability bond allocation reports, workforce/well-being report, and selected supporting resources.
- Older Corporate Responsibility announcement PDFs where the original microsite report links now redirect or no longer expose a direct report PDF.

### 04 Press Releases

Official Merck news releases grouped by published category.

Current scope:

- 2025 full-year and 2026 year-to-date official Merck news releases.
- HTML snapshots grouped by category.
- Official PDF URLs preserved in `04_press_releases/timeline_index.csv` where exposed by Merck's API.
- Review 2025-2026 volume and usefulness before deciding whether to add older years.

### 05 Pipeline

Pipeline PDFs, snapshots, and related investor/science materials.

Current scope:

- Current 2Q2026 pipeline PDF reflecting pipeline to April 30, 2026.
- Additional verified 1Q2026 pipeline PDF reflecting pipeline to January 31, 2026.
- Current pipeline page HTML snapshot collected on 2026-06-12.

### 06 Company Context

Current company fact sheets, overview pages, leadership, values, and product overview materials.

Current scope:

- Company fact sheet, company overview, what-we-do, research overview, BD&L, leadership, executive team, culture/values, and U.S. products list page snapshots.
- Individual product prescribing-information PDFs intentionally excluded from this round.

### 07 Peer Pharma Annual Reports

Annual-report benchmark pack for top pharmaceutical companies by 2024 pharma revenue, excluding Merck & Co. because Merck annual reports are already covered in `01_financial_reports`.

Current scope:

- 19 non-Merck peer companies from the top-20 pharma revenue ranking.
- Latest available annual report / Form 10-K / Form 20-F, primarily from SEC filings where available.
- Official company annual-report sources used for Roche, Merck KGaA / EMD Group, CSL, Bayer, and Boehringer Ingelheim.
- Roche, Merck KGaA / EMD Group, and CSL are captured as official annual-report PDFs.
- Generated PDF exports for the saved HTML filings/snapshots to simplify LLM upload and review.
- Bayer and Boehringer Ingelheim retained as metadata-only because their official annual-report pages blocked automated download.

## Manifest

The manifest files track each collected item with source metadata:

- `manifest.csv`
- `manifest.xlsx`

Key fields include title, repository, subfolder, document type, year, quarter, publication date, source URL, download URL, local path, file type, collected date, notes, and status.

## Notes For Hackathon Users

- These documents are intended as an official-source corpus for experimentation.
- Source URLs are preserved in the manifest for auditability.
- Some materials may include forward-looking statements or date-sensitive information; use the document publication date when interpreting content.

## Collection Status

### Completed: Round 0 Setup

- Folder structure created.
- README created.
- CSV and Excel manifests created.

### Completed: Round 1 Financial Reports And Earnings

Collection date: 2026-06-12

Manifest status counts:

- Downloaded files: 81
- Metadata-only links: 14
- Duplicates marked: 1
- Failed items: 0

Downloaded file counts by folder:

- `annual_reports`: 20
- `earnings_presentations`: 9
- `financial_disclosures`: 18
- `prepared_remarks`: 8
- `quarterly_earnings`: 17
- `transcripts`: 9

Notes:

- Webcasts are tracked as metadata-only links rather than downloaded documents.
- Proxy voting results are tracked as metadata-only links and excluded from the core annual/proxy document set.
- One Q4 Form 10-K item is marked as a duplicate because the same annual report is already captured in `annual_reports`.
- All downloaded manifest rows were reconciled against local files.

### Completed: Round 2 Investor Events

Collection date: 2026-06-12

Manifest status counts:

- Downloaded files: 53
- Metadata-only links: 41
- Failed items: 0

Downloaded file counts by folder:

- `conference_presentations`: 3
- `investor_events`: 9
- `shareholder_meetings`: 3
- `transcripts`: 38

Notes:

- Start with `02_investor_events/major_documents.csv` for the lean event/presentation set.
- Supporting webcast links and annual meeting vote-result links were retained in `02_investor_events/supporting_documents.csv`.
- Routine earnings-call materials were excluded from this repository to avoid duplicating `01_financial_reports`.
- Coverage is 2024, 2025, and 2026 year-to-date through 2026-06-12.
- All downloaded manifest rows were reconciled against local files.

### Completed: Round 3 Sustainability / ESG

Collection date: 2026-06-12

Manifest status counts:

- Downloaded files: 37
- HTML snapshots: 2
- Failed items: 0

Downloaded/snapshot file counts by folder:

- `climate_cdp_tcfd`: 12
- `impact_reports`: 5
- `performance_data`: 1
- `report_announcements`: 8
- `report_summaries`: 8
- `supporting_resources`: 2
- `sustainability_financing`: 2
- `workforce_wellbeing`: 1

Notes:

- Start with `03_sustainability_esg/major_documents.csv` for the lean ESG hackathon set.
- Supporting/fringe ESG files were retained and indexed in `03_sustainability_esg/supporting_documents.csv`.
- Direct impact-report PDFs were captured for 2024/2025, 2023/2024, and 2021/2022.
- The 2022/2023 and 2020/2021 ESG/report items are captured as official Merck announcement HTML snapshots because the current direct report links do not expose a downloadable PDF.
- Older Corporate Responsibility report years are represented by official Merck announcement PDFs and source URLs where the original report microsites now redirect.
- All downloaded and snapshot manifest rows were reconciled against local files.

### Completed: Round 4 Pipeline And Company Context

Collection date: 2026-06-12

Manifest status counts:

- Downloaded files: 2
- HTML snapshots: 10
- Failed items: 0

File counts by repository:

- `05_pipeline`: 2 PDFs and 1 HTML snapshot
- `06_company_context`: 9 HTML snapshots

Notes:

- The pipeline PDFs are Merck Pipeline 1Q2026 and 2Q2026, reflecting pipeline to January 31, 2026 and April 30, 2026.
- I probed official merck.com upload paths for 2023-2026 quarterly pipeline PDFs and checked Merck's public search endpoints; only 1Q2026 and 2Q2026 formal pipeline PDFs were verified as currently accessible official PDFs.
- Company context snapshots cover the company fact sheet, company overview, what-we-do, research overview, BD&L, leadership, executive team, culture/values, and products list pages.
- Individual product prescribing-information PDFs were intentionally excluded from this round.
- All downloaded and snapshot manifest rows were reconciled against local files.

### Completed: Round 5 Press Releases

Collection date: 2026-06-12

Manifest status counts:

- HTML snapshots: 167
- Failed items: 0

Snapshot counts by folder:

- `animal_health`: 7
- `corporate`: 23
- `financial`: 28
- `prescription_medicine`: 46
- `research_and_development`: 61
- `vaccine`: 2

Notes:

- This is a controlled press-release batch covering full-year 2025 and 2026 year-to-date.
- Start with `04_press_releases/timeline_index.csv` for date/category browsing and official PDF URLs where available.
- Merck states that each news release was factually accurate on the date issued and should not be relied upon as current after its issuance date.
- All snapshot manifest rows were reconciled against local files.

### Completed: Round 6 Peer Pharma Annual Reports

Collection date: 2026-06-12

Manifest status counts:

- Downloaded files: 15
- HTML snapshots: 2
- Metadata-only links: 2
- Failed items: 0

Notes:

- This pack covers the 19 non-Merck companies from the top-20 pharma revenue ranking.
- Merck & Co. appears in the same ranking but is excluded here because 10 years of Merck annual reports are already captured in `01_financial_reports/annual_reports`.
- SEC 10-K / 20-F filings were captured for 14 peers.
- Roche, Merck KGaA / EMD Group, and CSL were captured as official annual-report PDFs.
- PDF exports were generated for 16 saved HTML filings/snapshots.
- Bayer and Boehringer Ingelheim official annual-report pages were identified and retained as metadata-only because they blocked automated download.
