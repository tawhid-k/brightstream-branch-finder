# Brightstream Branch Finder

**Live Demo:** [brightstream-branch-finder.netlify.app](https://brightstream-branch-finder.netlify.app)

A simple web app for finding Brightstream Bank branches near you.

## Overview

A client-side single-page application that fetches live branch data from Optimizely Graph and displays it in a searchable list and interactive map.

On load, a single GraphQL query fetches all branches and stores them in a global array that acts as the app's single source of truth. All filtering, sorting, and rendering operate on this array. The list and map always share the same data state, keeping them in sync.

Search filters branches in real time by matching the query against name, city, and street. When "Locate Me" is used, the app calculates the distance from the user to every branch using the Haversine formula, sorts the array by nearest first, and re-renders both the list and map accordingly. Clicking a branch card or map marker opens a modal with full details and a Google Maps directions link.

## Technologies Used

- **HTML5, CSS3, Vanilla JavaScript** — no frameworks, no build tools
- **Optimizely Graph (GraphQL)** — branch data source
- **Leaflet.js** — interactive map
- **HTML5 Geolocation API** — "Locate Me" feature
- **Google Fonts** — Playfair Display, Jost

## Setup

No installation required.

**Option 1 — Open directly:**
```bash
open index.html
```

**Option 2 — Local server:**
```bash
npx serve .         # runs on http://localhost:3000
# or
python3 -m http.server 8080  # runs on http://localhost:8080
```

## Assumptions & Decisions

- **Vanilla stack** — kept intentionally simple with no framework or bundler, since the app is a straightforward fetch-and-render flow.
- **Leaflet over Google Maps** — no API key required, making it suitable for open/demo environments.
- **Client-side only** — there is no backend. The Optimizely Graph token is included in `app.js`. This is acceptable given it is read-only access to public branch data.
- **Design** — colours, typography, and component styles were extracted from existing Brightstream design assets to keep visual consistency.