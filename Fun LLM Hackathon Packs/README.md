# Fun LLM Hackathon Packs

Collection date: 2026-06-12

These are lightweight, non-work sandbox packs for Gen AI hackathon practice. They are intentionally separate from the Merck official-source corpus.

## Packs

### 01 Movies / TV

Movie recommendation and team movie-night sandbox based on MovieLens latest-small from GroupLens.

Start here:

- `01_movies_tv/README.md`
- `01_movies_tv/starter_prompts.md`
- `01_movies_tv/cleaned_data/movie_cards.csv`
- `01_movies_tv/cleaned_data/movie_cards_top_500.md`
- `01_movies_tv/cleaned_data/team_movie_night_shortlist.csv`

Use note: MovieLens latest-small is a research dataset with non-commercial restrictions described in the bundled source README. Treat it as a learning/demo dataset, not a production or commercial asset.

### 02 Music

Music discovery and taste-profile sandbox based on the GroupLens-hosted HetRec 2011 Last.fm 2K dataset.

Start here:

- `02_music/README.md`
- `02_music/starter_prompts.md`
- `02_music/cleaned_data/artist_cards.csv`
- `02_music/cleaned_data/artist_cards_top_500.md`
- `02_music/cleaned_data/music_discovery_shortlist.csv`
- `02_music/cleaned_data/tag_mood_index.csv`

Use note: the bundled source README states that the HetRec 2011 Last.fm data is made available for non-commercial use. Treat it as a learning/demo dataset, not a production or commercial asset.

### 03 Rahway Team Outings

Restaurant and activity recommendation sandbox for team outings near Rahway, NJ, based on public OpenStreetMap data queried through Overpass API.

Start here:

- `03_rahway_team_outings/README.md`
- `03_rahway_team_outings/starter_prompts.md`
- `03_rahway_team_outings/cleaned_data/rahway_team_outing_shortlist.csv`
- `03_rahway_team_outings/cleaned_data/rahway_team_outing_cards.md`
- `03_rahway_team_outings/cleaned_data/rahway_restaurants_food_drink.csv`
- `03_rahway_team_outings/cleaned_data/rahway_activities.csv`

Use note: this pack is not a live ratings, reservations, current-hours, or traffic dataset. Any agent built on it should ask users to verify details before booking.
