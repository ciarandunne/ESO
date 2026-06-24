$ErrorActionPreference = "Stop"

$workspace = Get-Location
$corpusRoot = Join-Path $workspace "Merck Official Hackathon Corpus"
$manifestPath = Join-Path $corpusRoot "manifest.csv"
$sourceFinancial = "https://www.merck.com/investor-relations/financial-information/"
$collectedDate = "2026-06-12"

function Convert-ToCsvField {
    param([AllowNull()][object]$Value)
    $text = if ($null -eq $Value) { "" } else { [string]$Value }
    '"' + $text.Replace('"', '""') + '"'
}

function Add-ManifestRow {
    param(
        [string]$Id,
        [string]$Repository,
        [string]$Subfolder,
        [string]$Title,
        [string]$DocumentType,
        [string]$Year,
        [string]$Quarter,
        [string]$PublicationDate,
        [string]$SourceUrl,
        [string]$DownloadUrl,
        [string]$LocalPath,
        [string]$FileType,
        [string]$SourceDomain,
        [string]$CollectedDate,
        [string]$Notes,
        [string]$Status
    )

    $fields = @(
        $Id, $Repository, $Subfolder, $Title, $DocumentType, $Year, $Quarter,
        $PublicationDate, $SourceUrl, $DownloadUrl, $LocalPath, $FileType,
        $SourceDomain, $CollectedDate, $Notes, $Status
    ) | ForEach-Object { Convert-ToCsvField $_ }

    Add-Content -Path $manifestPath -Value ($fields -join ",") -Encoding UTF8
}

function Get-Extension {
    param([string]$Url)
    $path = ([System.Uri]$Url).AbsolutePath
    $ext = [System.IO.Path]::GetExtension($path)
    if ([string]::IsNullOrWhiteSpace($ext)) { return ".html" }
    return $ext.ToLowerInvariant()
}

function Convert-ToSlug {
    param([string]$Text)
    $slug = $Text.ToLowerInvariant()
    $slug = $slug -replace "&amp;", "and"
    $slug = $slug -replace "&", "and"
    $slug = $slug -replace "[^a-z0-9]+", "-"
    $slug = $slug.Trim("-")
    if ($slug.Length -gt 90) {
        $slug = $slug.Substring(0, 90).Trim("-")
    }
    return $slug
}

function Get-DocumentTypeAndFolder {
    param([string]$Title)

    $lower = $Title.ToLowerInvariant()
    if ($lower -match "annual report|10-k") {
        return @{ Type = "annual_report_form_10k"; Folder = "01_financial_reports\annual_reports" }
    }
    if ($lower -match "proxy") {
        return @{ Type = "proxy_statement"; Folder = "01_financial_reports\annual_reports" }
    }
    if ($lower -match "presentation") {
        return @{ Type = "earnings_presentation"; Folder = "01_financial_reports\earnings_presentations" }
    }
    if ($lower -match "announcement|release") {
        return @{ Type = "earnings_announcement"; Folder = "01_financial_reports\quarterly_earnings" }
    }
    if ($lower -match "other financial disclosures|financial disclosure") {
        return @{ Type = "financial_disclosure"; Folder = "01_financial_reports\financial_disclosures" }
    }
    if ($lower -match "prepared remarks") {
        return @{ Type = "prepared_remarks"; Folder = "01_financial_reports\prepared_remarks" }
    }
    if ($lower -match "transcript") {
        return @{ Type = "transcript"; Folder = "01_financial_reports\transcripts" }
    }
    if ($lower -match "10-q") {
        return @{ Type = "form_10q"; Folder = "01_financial_reports\quarterly_earnings" }
    }
    return @{ Type = "financial_document"; Folder = "01_financial_reports\quarterly_earnings" }
}

function Download-Document {
    param(
        [string]$Url,
        [string]$OutputPath
    )
    & curl.exe --noproxy "*" -L --fail --silent --show-error $Url -o $OutputPath
    if ($LASTEXITCODE -ne 0) {
        throw "Download failed: $Url"
    }
}

$tempDir = Join-Path $workspace ".collection_temp"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$existingIds = @{}
if (Test-Path $manifestPath) {
    Import-Csv $manifestPath | ForEach-Object {
        if ($_.id) { $existingIds[$_.id] = $true }
    }
}

$counter = 1
while ($existingIds.ContainsKey(("fin-{0:D4}" -f $counter))) {
    $counter++
}

function New-ManifestId {
    do {
        $id = "fin-{0:D4}" -f $script:counter
        $script:counter++
    } while ($script:existingIds.ContainsKey($id))
    $script:existingIds[$id] = $true
    return $id
}

$annualYears = 2021..2025
foreach ($year in $annualYears) {
    $apiUrl = "https://www.merck.com/wp-json/wp/v2/report/?slug=$year-annual-report"
    $jsonPath = Join-Path $tempDir "annual_$year.json"
    & curl.exe --noproxy "*" -L --fail --silent --show-error $apiUrl -o $jsonPath
    if ($LASTEXITCODE -ne 0) {
        Add-ManifestRow -Id (New-ManifestId) -Repository "01_financial_reports" -Subfolder "annual_reports" -Title "$year annual report metadata" -DocumentType "annual_report_metadata" -Year $year -Quarter "" -PublicationDate "" -SourceUrl $sourceFinancial -DownloadUrl $apiUrl -LocalPath "" -FileType "json" -SourceDomain "merck.com" -CollectedDate $collectedDate -Notes "Failed to retrieve annual report metadata." -Status "failed"
        continue
    }

    $reports = Get-Content -Raw $jsonPath | ConvertFrom-Json
    foreach ($report in $reports) {
        $docs = $report.extended_data.acf_fields.documents
        foreach ($doc in $docs) {
            $title = [System.Net.WebUtility]::HtmlDecode([string]$doc.document_title)
            $url = [string]$doc.document_path
            if ([string]::IsNullOrWhiteSpace($url)) { continue }

            $meta = Get-DocumentTypeAndFolder -Title $title
            $folderRel = $meta.Folder
            $folderAbs = Join-Path $corpusRoot $folderRel
            New-Item -ItemType Directory -Force -Path $folderAbs | Out-Null

            $ext = Get-Extension -Url $url
            $slug = Convert-ToSlug -Text $title
            $filename = if ($meta.Type -eq "proxy_statement") {
                "FY$year`_merck_proxy-statement$ext"
            } elseif ($meta.Type -eq "annual_report_form_10k") {
                "FY$year`_merck_annual-report-form-10-k$ext"
            } else {
                "FY$year`_merck_$slug$ext"
            }
            $outputPath = Join-Path $folderAbs $filename
            $relativePath = Join-Path $folderRel $filename

            $status = "downloaded"
            $notes = ""
            try {
                Download-Document -Url $url -OutputPath $outputPath
            } catch {
                $status = "failed"
                $notes = $_.Exception.Message
            }

            Add-ManifestRow -Id (New-ManifestId) -Repository "01_financial_reports" -Subfolder ($folderRel -replace "\\", "/") -Title $title -DocumentType $meta.Type -Year $year -Quarter "" -PublicationDate "" -SourceUrl $sourceFinancial -DownloadUrl $url -LocalPath $relativePath -FileType $ext.TrimStart(".") -SourceDomain ([System.Uri]$url).Host -CollectedDate $collectedDate -Notes $notes -Status $status
        }
    }
}

$quarterSlugs = @{
    "Q1" = "first-quarter"
    "Q2" = "second-quarter"
    "Q3" = "third-quarter"
    "Q4" = "fourth-quarter"
}

foreach ($year in 2024..2026) {
    $slugList = @("first-quarter-$year", "second-quarter-$year", "third-quarter-$year", "fourth-quarter-$year") -join ","
    $apiUrl = "https://www.merck.com/wp-json/wp/v2/report/?slug=$slugList&?orderby=sort_date&order=desc"
    $jsonPath = Join-Path $tempDir "quarterly_$year.json"
    & curl.exe --noproxy "*" -L --fail --silent --show-error $apiUrl -o $jsonPath
    if ($LASTEXITCODE -ne 0) {
        Add-ManifestRow -Id (New-ManifestId) -Repository "01_financial_reports" -Subfolder "quarterly_earnings" -Title "$year quarterly earnings metadata" -DocumentType "quarterly_earnings_metadata" -Year $year -Quarter "" -PublicationDate "" -SourceUrl $sourceFinancial -DownloadUrl $apiUrl -LocalPath "" -FileType "json" -SourceDomain "merck.com" -CollectedDate $collectedDate -Notes "Failed to retrieve quarterly metadata." -Status "failed"
        continue
    }

    $reports = Get-Content -Raw $jsonPath | ConvertFrom-Json
    foreach ($report in $reports) {
        $renderedTitle = [System.Net.WebUtility]::HtmlDecode([string]$report.title.rendered)
        $quarter = ""
        foreach ($entry in $quarterSlugs.GetEnumerator()) {
            if ($report.slug -like "$($entry.Value)-*") {
                $quarter = $entry.Key
                break
            }
        }
        if ([string]::IsNullOrWhiteSpace($quarter)) { continue }

        $docs = $report.extended_data.acf_fields.documents
        foreach ($doc in $docs) {
            $category = [string]$doc.document_category
            if ($category -eq "Press Release1") { continue }

            $title = [System.Net.WebUtility]::HtmlDecode([string]$doc.document_title)
            $url = [string]$doc.document_path
            if ([string]::IsNullOrWhiteSpace($url)) { continue }

            $meta = Get-DocumentTypeAndFolder -Title $title
            $folderRel = $meta.Folder
            $folderAbs = Join-Path $corpusRoot $folderRel
            New-Item -ItemType Directory -Force -Path $folderAbs | Out-Null

            $ext = Get-Extension -Url $url
            $slug = Convert-ToSlug -Text $title
            $filename = "$year`_$quarter`_merck_$slug$ext"
            $outputPath = Join-Path $folderAbs $filename
            $relativePath = Join-Path $folderRel $filename

            $status = "downloaded"
            $notes = "Report title: $renderedTitle"
            try {
                Download-Document -Url $url -OutputPath $outputPath
            } catch {
                $status = "failed"
                $notes = $_.Exception.Message
            }

            Add-ManifestRow -Id (New-ManifestId) -Repository "01_financial_reports" -Subfolder ($folderRel -replace "\\", "/") -Title $title -DocumentType $meta.Type -Year $year -Quarter $quarter -PublicationDate "" -SourceUrl $sourceFinancial -DownloadUrl $url -LocalPath $relativePath -FileType $ext.TrimStart(".") -SourceDomain ([System.Uri]$url).Host -CollectedDate $collectedDate -Notes $notes -Status $status
        }
    }
}

Write-Host "Round 1 financial collection complete."
