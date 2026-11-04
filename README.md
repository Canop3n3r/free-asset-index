# Free Asset Index (working name)

A searchable index of **free 3D and 2D game assets** with clear licenses (CC0 / CC-BY), plus a public JSON API that people, AIs and game engines can search.

**Index and link only.** We never rehost files. Every result links to the creator's own page, so creators keep ownership and get the traffic.

- Live site: https://canop3n3r.github.io/free-asset-index/
- Static API: https://canop3n3r.github.io/free-asset-index/api/items.json ([API docs](https://canop3n3r.github.io/free-asset-index/api.html))

## Sources (v1)
| Source | How we index it | License |
|---|---|---|
| [Poly Haven](https://polyhaven.com) | Official public API `api.polyhaven.com/assets` | CC0 |
| [Quaternius](https://quaternius.com) | Pack list + pack page meta, 1 request/s | CC0 ([license](https://quaternius.com/license.html)) |
| [OpenGameArt](https://opengameart.org) | Advanced search filtered to CC0 / CC-BY 3.0 / CC-BY 4.0, then the item page for author and license. Honors robots.txt `Crawl-delay: 10` | per item |
| [ambientCG](https://ambientcg.com) | Official API `/api/v2/full_json` (`node scripts/crawl-source.mjs ambientcg`) | CC0 |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | Official API (api.data.gov key in a header, read at crawl time only), 3D packages with CC0 usage only | CC0 |
| [Freesound](https://freesound.org) | Official APIv2 (key in a header, read at crawl time only). CC0 / CC-BY only; NC and Sampling+ excluded. `downloadUrl` = official HQ MP3 preview | CC0 / CC-BY |
| [Kenney](https://kenney.nl) | **Hand-curated seed** (`data/kenney-seed.json`). kenney.nl's robots.txt disallows `/assets/`, so we don't crawl it | CC0 |

Every item stores `license`, `licenseUrl`, `creator`, `creatorUrl`, `url` (the source page), `formats`, `style`, `kind` and `tags`, plus a generated `attribution` credit line.

## Run locally
```sh
docker compose up --build      # http://localhost:8080 , /api/search?q=chair&format=GLB&license=CC0
# or without Docker:
npm test && npm run build && npm start
npm run crawl                  # refresh data/items.json (OpenGameArt is slow on purpose)
```

## API
- Static (Pages): `api/items.json`, `api/creators.json`, `api/meta.json`, `api/source/*.json`, `api/license/{cc0,cc-by}.json`, `api/format/*.json`
- Server: `GET /api/search?q=&format=&license=&style=&kind=&source=&creator=&limit=&offset=` · `GET /api/creators` · `POST /api/track` · `GET /api/stats`

## Tracking
Views of creator pages and outbound clicks are sent anonymously, with no IPs or personal data, to a free-tier Supabase project (`supabase/tracking_v1.sql`). That project exposes an insert-only RPC with validation and rate limits, plus a `creator_stats` RPC for global totals. Counts are also kept in localStorage. If Supabase is down, the site keeps working and the Creators page falls back to this browser's counts. The key in `web/config.json` is Supabase's *publishable* key, which is safe to make public. Set `trackEndpoint` to `/api/track` to use the Docker server instead.

## Refreshing OpenGameArt (resumable)
`OGA_PAGES=3 OGA_PER_COMBO=48 node scripts/crawl.mjs opengameart` waits 10 seconds between requests, skips items already in `data/items.json` and saves every 10 items, so it's safe to stop and rerun. Then run `npm run build` and push `dist/` to `gh-pages`.

## Deploy
`npm run build` writes `dist/`, which is pushed to the `gh-pages` branch.

## Tags and curated bundles
`src/classify.mjs` tags every item at build time using rules over titles, tags and source metadata. It adds `categories` (vehicles, space, nature, buildings, characters, props, textures, hdris, audio, ui) and `styles` (low-poly, realistic, psx, pixel, stylized). `src/bundles.mjs` defines the bundles. Bundles are rebuilt on every `npm run build` and `scripts/deploy-pages.sh` run, so they grow as crawls add items. Bundles with fewer than 3 items are skipped.
- Site: `bundles.html` (includes a "Copy all credits" button)
- API: `api/bundles.json` and `api/bundles/<slug>.json` (each item links to its source, plus a combined `attribution` block). The Docker server serves the same data at `/api/bundles` and `/api/bundles/<slug>`, and supports `/api/search?category=`.

## For AI agents and engines
- `llms.txt` and `openapi.json` are published at the site root.
- Engine manifests: `api/bundles/{slug}.{godot|unity|threejs}.json` give the target path, preferred format, import hint and three.js loader for each asset. Download stays manual, from the source page.
- `api/search-index.json` is a compact index for fast client-side search. `sort=quality` orders results by the 0-100 `quality` score.

## Roadmap / sources needing keys
- Sketchfab (API token required for its search API; CC filters available), Freesound (API key required), Smithsonian Open Access (api.data.gov key), NASA 3D Resources (GitHub repo, no key; check per-model usage terms), itch.io (no public asset API; robots disallows /search).
- 3D previews with `<model-viewer>`: not enabled yet, because no current source clearly permits embedding its model files directly.

## Budget and download fields
Where a source's API provides them, items carry `downloadUrl` (an official direct link: Poly Haven glTF/HDR/maps, ambientCG 1K zip, Smithsonian GLB, Freesound HQ MP3 preview), `downloads[]`, `fileSize` (bytes), `triangles`, `textureRes` (px), `maps[]` and `duration`. `/api/search` accepts `maxTriangles`, `maxFileSize` (MB), `maxTextureRes`, `map` and `audio`. Items without data are excluded when a budget filter is set. Poly Haven reports `triangles` as its own polycount.

## Keys
Keyed crawlers (`node scripts/crawl-source.mjs freesound|smithsonian`) read keys from `/home/box/secrets/*` (or `SECRETS_DIR`) at crawl time and send them only in HTTP headers. `scripts/check-no-secrets.mjs` runs in `deploy-pages.sh` and fails the deploy if any secret value appears in `dist/`, `data/`, `src/`, `web/`, `scripts/` or `test/`.
