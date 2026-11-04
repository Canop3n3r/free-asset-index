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

## Tracking (limits)
GitHub Pages is static, so per-creator **views and outbound clicks are counted in each visitor's localStorage**, which means there are no global totals there. Set `trackEndpoint` in `web/config.json` to point to a server's `/api/track` (the Docker server keeps counts in memory and appends events to `STATS_FILE`) to aggregate them.

## Deploy
`npm run build` writes `dist/`, which is pushed to the `gh-pages` branch.
