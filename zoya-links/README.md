# ZOYA links

Link-in-bio page for `links.zoyasmusic.com`, hosted on Cloudflare Workers and deployed from GitHub.
No Spotify developer app and no API keys are needed.

- **Releases:** you upload the cover art and add a few lines to `config.json`
- **Sets:** pulled automatically from a public YouTube playlist (or listed by hand)

## Where things live

| File | What it does |
| --- | --- |
| `public/config.json` | **The file you edit**: bio, social links, releases, sets, featured item |
| `public/images/zoya.jpg` | Your portrait |
| `public/images/releases/` | Cover art, one square JPG per release |
| `public/index.html`, `style.css`, `app.js` | Layout, look and behaviour |
| `src/worker.js` | Reads your YouTube playlist for `/api/sets` |
| `scripts/check-config.mjs` | Checks `config.json` before each deploy |

## Add a new release (about 2 minutes, all in the GitHub website)

1. Open `public/images/releases/` on GitHub, choose Add file, then Upload files, and drop in the cover art (for example `new-track.jpg`). Commit.
2. Open `public/config.json`, click the pencil icon, and add a block at the top of `"items"`:

```json
{
  "title": "New Track",
  "type": "single",
  "date": "2026-10-03",
  "image": "/images/releases/new-track.jpg",
  "links": {
    "spotify": "https://open.spotify.com/album/PASTE_ID_HERE",
    "apple": "https://music.apple.com/...",
    "ytmusic": "https://music.youtube.com/playlist?list=...",
    "youtube": "https://www.youtube.com/watch?v=..."
  }
},
```

3. Commit. The page updates in about a minute.

Notes:
- Tapping a release opens a popup with one button per link. Leave out any platform you don't have, or leave it as `""`.
- With only one link, the cover goes straight to it (no popup).
- Other platforms you can add: `beatport`, `soundcloud`, `deezer`, `amazon`, `tidal`, `bandcamp`.
- `type` can be `single`, `ep`, `album` or `remix`.
- Every block except the last one needs a comma after the closing `}`.
- The newest release (by `date`) becomes the big featured card (it opens the same popup) and gets a "New" badge for 45 days.
- Sets are different: tapping a set always goes straight to YouTube.

## Featured card

By default it shows your newest release. To highlight something else (a mix, tickets, a new video), delete the `"auto"` line in `featured` and fill in `title`, `subtitle`, `image`, `url`, `badge`, `button`.

## Sets

Recommended: put `setsPlaylistId` in `config.json` (the part after `list=` in your public playlist's link). New videos added to that playlist appear on their own within about 30 minutes.

Prefer full control? Fill `youtube.items` instead and the playlist is ignored:

```json
{ "title": "Live at Luminosity 2026", "date": "2026-08-20", "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```

The thumbnail is taken from YouTube. To use your own image, add `"image": "/images/sets/name.jpg"`.

## The safety check

Cloudflare runs `npm run check` before each deploy. If `config.json` has a typo (a missing comma, a wrong file name), the deploy fails and the live page keeps its last good version. The error is shown in the build log in Cloudflare (Worker > Deployments > latest build).

## Troubleshooting

- Sets missing: open `/api/sets` on your site to see the exact error.
- Cover missing: check the file name matches `config.json` exactly, including capitals.

- 
