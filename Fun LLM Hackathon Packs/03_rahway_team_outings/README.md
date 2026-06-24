# Rahway Team Outings Fun Pack

Collection date: 2026-06-12

This pack is a lightweight public-data sandbox for building a restaurant/activity recommendation bot for team outings near Rahway, NJ. It is designed for Microsoft 365 Copilot, Gemini Enterprise, Excel, and document-chat style workflows.

## Source

- Source: OpenStreetMap data queried through Overpass API
- OpenStreetMap: https://www.openstreetmap.org/
- Overpass API: https://overpass-api.de/api/interpreter
- Query center: Rahway, NJ, approximated at latitude 40.6082, longitude -74.2776
- Collection radius: 35 km query, then filtered to roughly 28 miles

## Attribution And License Note

This pack uses OpenStreetMap data. OpenStreetMap data is copyright OpenStreetMap contributors and is available under the Open Database License. Keep source attribution with any shared derivative pack.

## Important Caveat

This is not a live restaurant reservation or review dataset. It does not provide reliable ratings, pricing, current opening hours, menus, private-room availability, accessibility, or live travel times. Any bot or agent built from this pack should tell users to verify details before booking.

The 45-minute constraint is modeled with a rough drive-time estimate from central Rahway. Real travel time depends on office location, time of day, route, parking, and traffic.

## Folder Guide

- `source_files/openstreetmap_rahway_35km_restaurants_activities.json`: raw OpenStreetMap/Overpass extract.
- `cleaned_data/rahway_outing_places.csv`: all cleaned restaurants and activity places.
- `cleaned_data/rahway_restaurants_food_drink.csv`: food and drink subset.
- `cleaned_data/rahway_activities.csv`: non-restaurant activities and venues.
- `cleaned_data/rahway_team_outing_shortlist.csv`: compact shortlist for quick hackathon use.
- `cleaned_data/rahway_team_outing_cards.md`: LLM-friendly Markdown cards for chat-style tools.
- `manifest.csv`: source and generated file index.
- `starter_prompts.md`: copy/paste challenge prompts.

## Summary Counts

- Total cleaned places: 19448
- Shortlist places: 500
- Food/drink places: 13347
- Activities/venues/outdoor/shopping places: 6101

## Good Hackathon Ideas

- Team lunch recommender.
- After-work outing planner.
- Indoor rainy-day activity recommender.
- Budget/vibe-based team social assistant.
- Agent that asks follow-up questions, proposes options, and generates a booking checklist.
