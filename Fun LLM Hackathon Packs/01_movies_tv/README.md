# Movie / TV Fun Pack

Collection date: 2026-06-12

This pack is a lightweight movie recommendation sandbox for a 2-hour Gen AI / agents hackathon. It uses MovieLens latest-small from GroupLens and adds LLM-friendly summary files so users can work in Excel, Microsoft 365 Copilot, Gemini Enterprise, or similar tools without doing much data prep.

## Source

- Source: MovieLens latest-small from GroupLens
- Source page: https://grouplens.org/datasets/movielens/
- Download URL: https://files.grouplens.org/datasets/movielens/ml-latest-small.zip
- Source contents: 9,742 movies, 100,836 ratings, and 3,683 tag applications from 610 anonymized users

## License And Use Note

The bundled MovieLens README states that the data may be used for research purposes under its listed conditions, may be redistributed with those same conditions, and may not be used for commercial or revenue-bearing purposes without permission from GroupLens. Treat this as a fun learning dataset, not a production or commercial asset.

## Folder Guide

- `source_archives/`: original downloaded MovieLens zip.
- `source_files/ml-latest-small/`: original extracted CSVs and README.
- `cleaned_data/movie_cards.csv`: one row per movie, with genres, average rating, rating count, top tags, and a simple vibe summary.
- `cleaned_data/movie_cards_top_500.md`: LLM-friendly Markdown cards for the 500 most-rated movies.
- `cleaned_data/team_movie_night_shortlist.csv`: 300 higher-rated movies with at least 50 ratings.
- `manifest.csv`: source and generated file index.
- `starter_prompts.md`: copy/paste challenge prompts.

## Recommended Starting Files

For Excel or Copilot analysis, start with:

- `cleaned_data/movie_cards.csv`
- `cleaned_data/team_movie_night_shortlist.csv`

For Gemini or document-chat style prompting, start with:

- `cleaned_data/movie_cards_top_500.md`
- `starter_prompts.md`

## Caveats

- Ratings are from a historical MovieLens sample generated in 2018.
- Tags are user-generated and sparse; many movies have no tags.
- The `vibe_summary` field is a lightweight heuristic derived from genres and tags, not an expert label.
- The data does not include streaming availability, posters, trailers, full plots, cast lists, or demographics.
