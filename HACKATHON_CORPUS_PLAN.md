# Merck Official Hackathon Corpus Plan

## Purpose

Create a curated, shareable document corpus from official Merck & Co. sources for an internal Gen AI and agents hackathon. The corpus should be useful for retrieval, summarization, comparison, trend analysis, timeline building, and multi-step agent workflows.

The goal is a clean, source-traceable repository, not a giant scrape. Each downloaded document should have a clear category, date, source URL, local path, and short description.

## Guiding Principles

- Use official Merck & Co. / MSD sources where possible.
- Collect round by round, with QA after each round.
- Prefer high-signal documents over exhaustive archives.
- Keep press releases separate from reports and presentations.
- Preserve source URLs and collection dates in a manifest.
- Use readable, sortable filenames.
- Keep enough scope for useful hackathon projects without overwhelming teams.

## Proposed Folder Structure

```text
Merck Official Hackathon Corpus/
  README.md
  manifest.csv
  manifest.xlsx
  01_financial_reports/
    annual_reports/
    quarterly_earnings/
    earnings_presentations/
    financial_disclosures/
    prepared_remarks/
    transcripts/
  02_investor_events/
    conference_presentations/
    investor_events/
    shareholder_meetings/
    transcripts/
  03_sustainability_esg/
    impact_reports/
    report_summaries/
    performance_data/
    climate_cdp_tcfd/
    sustainability_financing/
    workforce_wellbeing/
  04_press_releases/
    animal_health/
    corporate/
    corporate_responsibility/
    financial/
    prescription_medicine/
    research_and_development/
    vaccine/
  05_pipeline/
    pipeline_pdfs/
    pipeline_snapshots/
    related_presentations/
  06_company_context/
    fact_sheets/
    leadership/
    company_overview/
    culture_values/
    products_overview/
  07_peer_pharma_annual_reports/
    sec_filings/
    official_reports/
    official_snapshots/
    metadata_only/
```

## Initial Scope By Repository

### 01 Financial Reports

Current scope:

- Annual reports / Form 10-K: fiscal years 2016-2025.
- Proxy statements: related proxy statements where available.
- Quarterly earnings: 2024, 2025, and 2026 year-to-date.
- Include earnings announcements, earnings presentations, transcripts, prepared remarks, Form 10-Q/Form 10-K links, and available Excel/other financial disclosures.

Rationale:

Annual reports are high-signal and low-volume. Quarterly materials multiply quickly, so start with recent years.

### 02 Investor Events

Current scope:

- 2024, 2025, and 2026 year-to-date investor events and healthcare conference materials.
- Include presentations, transcripts, acquisition/event decks, science investor-event materials, and annual meeting presentations/transcripts.
- Exclude routine earnings-call materials already captured in `01_financial_reports`.
- Retain webcast links and annual meeting vote-result links as metadata-only references.

Rationale:

Investor materials are useful for strategy, pipeline positioning, and management narrative, but many conference appearances can be repetitive.

### 03 Sustainability / ESG

Current scope:

- Core impact / ESG / corporate responsibility reporting trail from 2014/2015 through 2024/2025 where official assets remain available.
- Current Purpose for Progress report, report summary, fact sheets, infographics, and performance data.
- Current climate/CDP/TCFD/GHG resources, sustainability bond allocation reports, workforce/well-being report, and selected supporting resources.
- Older Corporate Responsibility announcement PDFs where direct report PDFs are no longer available from Merck's current site.

Rationale:

ESG materials are dense and well suited to metric extraction, progress tracking, and claim verification.

### 04 Press Releases

Current scope:

- 2025 full-year and 2026 year-to-date official Merck news releases.
- Separate by Merck's published categories.
- Save releases as HTML snapshots, with official PDF URLs preserved in the timeline index where Merck exposes them.
- After QA and volume review, decide whether to add older years.

Rationale:

Press releases are valuable for timelines and R&D/product/regulatory milestones, but the volume can balloon quickly.

### 05 Pipeline

Current scope:

- Current 2Q2026 pipeline PDF reflecting pipeline to April 30, 2026.
- Additional verified 1Q2026 pipeline PDF reflecting pipeline to January 31, 2026.
- Current pipeline page HTML snapshot collected on 2026-06-12.
- Related investor-science materials are captured in `02_investor_events` where applicable.

Rationale:

Pipeline content is high-value for agent demos, especially for therapeutic-area summaries and change tracking.

### 06 Company Context

Current scope:

- Current company fact sheet.
- Current company overview, what-we-do, research overview, and BD&L pages.
- Current leadership overview and executive team pages.
- Current culture, values, and U.S. products list pages.
- Individual product prescribing-information PDFs intentionally excluded from this round.

Rationale:

These provide lightweight grounding context for teams building assistants over the corpus.

### 07 Peer Pharma Annual Reports

Current scope:

- Latest available annual report / Form 10-K / Form 20-F for 19 non-Merck peers from the top-20 pharma revenue ranking.
- Prefer official SEC annual filings for listed companies.
- Use official company annual-report pages or PDFs where SEC annual filings are not the best available source.
- Retain blocked official sources as metadata-only rather than dropping them.

Rationale:

This gives hackathon teams a clean strategy-comparison pack: company profile evolution, portfolio emphasis, risk factors, capital allocation, pipeline narrative, geographic mix, and management priorities across major pharma peers.

## Manifest Fields

Each collected item should be recorded in `manifest.csv` and `manifest.xlsx`.

Recommended columns:

- `id`
- `repository`
- `subfolder`
- `title`
- `document_type`
- `year`
- `quarter`
- `publication_date`
- `source_url`
- `download_url`
- `local_path`
- `file_type`
- `source_domain`
- `collected_date`
- `notes`
- `status`

Suggested status values:

- `downloaded`
- `snapshot_saved`
- `metadata_only`
- `failed`
- `duplicate`

## Filename Convention

Use lowercase or title-safe filenames that sort naturally:

```text
YYYY-MM-DD_merck_category_short-title.ext
YYYY_Q#_merck_earnings-presentation.ext
FY2025_merck_annual-report-form-10-k.pdf
```

Examples:

```text
FY2025_merck_annual-report-form-10-k.pdf
2026_Q1_merck_earnings-presentation.pdf
2026-06-09_merck_goldman-sachs-healthcare-conference-transcript.pdf
2024-2025_merck_purpose-for-progress-impact-report.pdf
```

## Execution Rounds

### Round 0: Setup

- Create folder structure.
- Create empty manifest files.
- Create a top-level README template.
- Confirm collection date and official-source framing.

Status: completed 2026-06-12.

### Round 1: Financial Reports and Earnings

- Collect annual reports and proxy statements.
- Collect quarterly earnings materials.
- Capture download URLs and source page URLs.
- QA filenames, completeness, and manifest rows.

Status: completed 2026-06-12.

Round 1 summary:

- Downloaded files: 81.
- Metadata-only links: 14 webcast/proxy-voting-result links.
- Duplicates marked: 1 Q4 Form 10-K already captured as an annual report.
- Failed items: 0.

### Round 2: Investor Events

- Collect selected event presentations, webcasts metadata, transcripts, and shareholder meeting materials.
- QA for duplicate transcripts and repeated conference materials.

Status: completed 2026-06-12.

Round 2 summary:

- Downloaded files: 53.
- Metadata-only links: 41 webcast/vote-result links.
- Failed items: 0.
- Coverage: 2024, 2025, and 2026 year-to-date through 2026-06-12.
- Curated major investor-events index created with 53 rows.
- Supporting investor-events index created with 41 retained rows.
- Routine earnings-call materials excluded to avoid duplicating `01_financial_reports`.

### Round 3: Sustainability / ESG

- Collect impact reports, summaries, spreadsheets, CDP/TCFD materials, bond allocation reports, and workforce/well-being reports.
- QA file readability and metric-rich spreadsheets.

Status: completed 2026-06-12.

Round 3 summary:

- Downloaded files: 37.
- HTML snapshots: 2.
- Failed items: 0.
- Curated major ESG index created with 14 rows.
- Supporting ESG index created with 25 retained rows.
- Direct impact-report PDFs captured for 2024/2025, 2023/2024, and 2021/2022.
- 2022/2023 and 2020/2021 captured as official Merck announcement HTML snapshots because current direct report links do not expose downloadable PDFs.

### Round 4: Pipeline and Company Context

- Collect current pipeline PDF and page snapshot/extract.
- Collect fact sheet, overview, leadership, culture/values, and product overview materials.
- QA that these files are clearly marked as current snapshots.

Status: completed 2026-06-12.

Round 4 summary:

- Downloaded files: 2 current/recent pipeline PDFs.
- HTML snapshots: 10.
- Failed items: 0.
- Pipeline PDFs captured: Merck Pipeline 1Q2026 and 2Q2026, reflecting pipeline to January 31, 2026 and April 30, 2026.
- Discovery note: official merck.com upload paths were probed for 2023-2026 quarterly pipeline PDFs and Merck's public search endpoints were checked; only 1Q2026 and 2Q2026 formal pipeline PDFs were verified as currently accessible official PDFs.
- Company context snapshots cover fact sheet, company overview, what-we-do, research overview, BD&L, leadership, executive team, culture/values, and products list pages.
- Individual product prescribing-information PDFs intentionally excluded to keep the corpus business/context oriented.

### Round 5: Press Releases

- Collect 2026 and 2025 press releases by category.
- Review volume.
- Decide whether to add 2024.
- QA for source URL preservation and clean categorization.

Status: 2025-2026 batch completed 2026-06-12.

Round 5 summary:

- HTML snapshots: 167.
- Failed items: 0.
- Coverage: full-year 2025 and 2026 year-to-date through 2026-06-12.
- Year distribution: 115 releases from 2025 and 52 releases from 2026 year-to-date.
- Category distribution: animal health 7, corporate 23, financial 28, prescription medicine 46, research and development 61, vaccine 2.
- Official PDF URLs are preserved in `04_press_releases/timeline_index.csv` where exposed by Merck's API.
- Next decision: whether to add older years after reviewing volume/usefulness.

### Round 6: Peer Pharma Annual Reports

- Build a peer benchmark pack using the top-20 pharma revenue ranking.
- Exclude Merck & Co. because Merck annual reports are already captured in `01_financial_reports`.
- Capture latest available annual reports from official SEC or company sources.
- QA source traceability, local file existence, and metadata-only exceptions.

Status: completed 2026-06-12.

Round 6 summary:

- Manifest rows: 19.
- Downloaded files: 15.
- HTML snapshots: 2.
- Metadata-only links: 2.
- Failed items: 0.
- SEC filings captured for 14 peers.
- Official company sources captured for Roche, Merck KGaA / EMD Group, and CSL.
- Bayer and Boehringer Ingelheim retained as metadata-only because official pages blocked automated download.

## QA Checklist After Each Round

- Expected years and quarters are represented.
- Every file has a manifest row.
- Every manifest row has a source URL.
- Downloaded files open successfully.
- Filenames sort logically.
- Duplicate files are marked or removed from the active set.
- Failed downloads are tracked for retry.
- The README is updated with scope decisions and collection notes.

## Initial Recommendation

Start with Round 0 and Round 1. Financial reports and earnings materials are structured, high-value, and will establish the download, naming, manifest, and QA pattern for the larger corpus.
