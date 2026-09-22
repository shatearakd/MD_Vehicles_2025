# Maryland on the Move

An interactive, static dashboard built from two Maryland Motor Vehicle Administration open datasets:

- MVA Vehicle Sales Counts by Month (2002–June 2026)
- MVA Vehicle Registrations by County at Month End (January 2023–August 2026)

The dashboard explores monthly new and used vehicle sales, transaction value, county registration rankings, registration trends, and the descriptive relationship between sales flows and registered vehicle stock.

## Run locally

Because the dashboard loads a local JSON file, serve the project directory instead of opening `index.html` directly:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy with GitHub Pages

1. Create a GitHub repository and upload the contents of this folder to the repository root.
2. Push to the `main` branch.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions** as the source.
5. The included workflow publishes the dashboard automatically.

## Refresh the data

Replace the two CSV files in `source_data/` while preserving their filenames, then run:

```bash
python scripts/prepare_data.py
```

Commit the regenerated `data/dashboard_data.json` and push.

## Project structure

```text
assets/                  Dashboard JavaScript and CSS
data/                    Browser-ready cleaned data
scripts/prepare_data.py  Reproducible cleaning pipeline
source_data/             Original government CSV files
.github/workflows/       GitHub Pages deployment
index.html               Dashboard entry point
```

## Analytical cautions

- Sales are monthly flows; registrations are month-end stocks.
- The combined analysis matches sources by month and is descriptive, not causal.
- 2026 is incomplete in both supplied files.
- The registrations source changes the `NOT MD` label to blank beginning in March 2024. The cleaning pipeline retains that series as `NOT MD / UNSPECIFIED`.

## Attribution

Analysis and dashboard by Shateara Davis. Data provided by the Maryland Department of Transportation Motor Vehicle Administration through Data.gov.
