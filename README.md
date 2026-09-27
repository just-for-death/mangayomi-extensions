# Mangayomi extensions (Sunfire companion)

JavaScript sources for **Sunfire** and any [MangaYomi](https://github.com/kodjodevf/mangayomi)-compatible client.

Maintained by [just-for-death](https://github.com/just-for-death). Consumed by Sunfire as a remote extension catalog (see Sunfire `README.md` “How extensions work”).

## Repository URL

**Settings → Extension repositories** in Sunfire or MangaYomi:

```
https://raw.githubusercontent.com/just-for-death/mangayomi-extensions/main/index.json
```

Keep `index.json` versions in lockstep with the `mangayomiSources.version` field inside each `.js` file.

## FOSS icons

`iconUrl` in `index.json` points at this repo (`icons/*.png`) — **not** Google Favicon CDN.

Sunfire also ships the same PNGs as `asset:assets/icons/sources/<name>.png` so Browse works fully offline.

## Extensions

| Source | Lang | Version | Base URL | Notes |
|---|---|---|---|---|
| MangaFreak | EN | 1.0.5 | `https://ww3.mangafreak.me` | Popular, latest, search |
| Mangago | EN | 1.3.4 | `https://www.mangago.me` | Cloudflare-aware |
| MangaHere | EN | 1.2.4 | `https://fanfox.net` | Popular, latest, search |
| Mangapill | EN | 1.3.2 | `https://mangapill.com` | High-res reader |
| nHentai | EN | 1.1.3 | `https://nhentai.net` | NSFW |
| NineHentai | EN | 1.1.2 | `https://9hentai.so` | NSFW |
| Read Comics Online | EN | 1.2.3 | `https://readcomicsonline.ru` | Comics + `getCoverUrl` |
| Webtoons | EN | 1.2.1 | `https://www.webtoons.com` | Multi-lang catalog |
| Weeb Central | EN | 1.2.2 | `https://weebcentral.com` | Popular, latest, filters |

## Sync into Sunfire

Remote catalog is the single source of truth since Sunfire 4.0.0
(`assets/extensions/` removed). After bumping JS + `index.json`,
verify `sha256`/`size` with `sha256sum` + `stat -c%s` before push.

Sunfire app version that consumes these sources: **4.0.0**.
