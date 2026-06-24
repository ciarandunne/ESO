# Music Fun Pack

Collection date: 2026-06-12

This pack is a lightweight music discovery and taste-profile sandbox for a 2-hour Gen AI / agents hackathon. It uses the GroupLens-hosted HetRec 2011 Last.fm 2K dataset and adds LLM-friendly summary files so users can work in Excel, Microsoft 365 Copilot, Gemini Enterprise, or similar tools without doing much data prep.

## Source

- Source: HetRec 2011 Last.fm 2K dataset hosted by GroupLens
- Source page: https://grouplens.org/datasets/hetrec-2011/
- Download URL: https://files.grouplens.org/datasets/hetrec2011/hetrec2011-lastfm-2k.zip
- Source contents: 1,892 users, 17,632 artists, 92,834 user-artist listening records, 11,946 tags, and 186,479 tag assignments

## License And Use Note

The bundled source README states that the data is made available for non-commercial use. Treat this as a fun learning dataset, not a production or commercial asset.

## Folder Guide

- `source_archives/`: original downloaded dataset zip.
- `source_files/`: original extracted tab-separated source files and README.
- `cleaned_data/artist_cards.csv`: one row per artist, with listener counts, total listens, top tags, vibe summary, and popularity tier.
- `cleaned_data/artist_cards_top_500.md`: LLM-friendly Markdown cards for the 500 most-listened artists.
- `cleaned_data/music_discovery_shortlist.csv`: 400 artists with enough listeners and tags for recommendation exercises.
- `cleaned_data/tag_mood_index.csv`: tag index with sample artists for mood/genre exploration.
- `manifest.csv`: source and generated file index.
- `starter_prompts.md`: copy/paste challenge prompts.

## Recommended Starting Files

For Excel or Copilot analysis, start with:

- `cleaned_data/artist_cards.csv`
- `cleaned_data/music_discovery_shortlist.csv`
- `cleaned_data/tag_mood_index.csv`

For Gemini or document-chat style prompting, start with:

- `cleaned_data/artist_cards_top_500.md`
- `starter_prompts.md`

## Caveats

- This is a historical Last.fm sample from 2011, not a current music chart.
- It contains artists and tags, not lyrics, audio files, album metadata, streaming availability, or editorial reviews.
- User IDs are anonymized, but listening and tagging patterns are still behavioral data; use respectfully.
- Tags are user-generated and messy. That messiness is useful for LLM demos, but not authoritative genre classification.
- The `vibe_summary` and `popularity_tier` fields are lightweight heuristics derived from listening counts and tags.
