# Peer Pharma Annual Reports

Annual-report benchmark pack for top pharmaceutical companies by 2024 pharma revenue, excluding Merck & Co. because Merck annual reports are already collected in `01_financial_reports`.

## Scope

- Ranking basis: top 20 drug companies by 2024 pharma revenue, as listed in the Pharmaceutical industry global sales table.
- Peer companies targeted: 19 non-Merck companies from that ranking.
- Preferred source: official SEC 10-K / 20-F filing where available.
- Additional official sources: Roche, CSL, and Merck KGaA / EMD Group official annual report PDFs.
- Metadata-only: Bayer and Boehringer Ingelheim official pages were identified but blocked automated download.

## Contents

- `sec_filings/`: official SEC 10-K/20-F annual-report HTML filings.
- `official_reports/`: official company annual-report PDFs for Roche, Merck KGaA / EMD Group, and CSL.
- `official_snapshots/`: official company annual-report page snapshots.
- `pdf_exports/`: generated PDF versions of the saved HTML filings/snapshots for easier upload to LLM tools.
- `major_documents.csv`: manifest-style index for this peer pack.
- `peer_company_index.csv`: compact company/rank/source/status index.
- `pdf_exports.csv`: index of generated PDF exports and their source HTML files.

## Collection Summary

- Manifest rows: 19
- Status counts for core peer rows: downloaded=17, snapshot_saved=0, metadata_only=2
- PDF files in `pdf_exports/`: 16, including Roche and Merck KGaA / EMD Group official PDFs replacing incomplete generated landing-page PDFs

Merck & Co. note: rank 3 in the same top-20 list, already covered by 10 years of annual reports in `01_financial_reports/annual_reports`.
