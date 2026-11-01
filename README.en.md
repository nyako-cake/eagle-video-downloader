<img src="./docs/封面-英文.jpg">

# Eagle Video Downloader

English | [中文](./README.md)

Download videos directly to Eagle from sites supported by yt-dlp. Built on [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Supported Platforms

YouTube, Twitter / X, TikTok, Bilibili, Instagram, Pinterest, Dribbble, Vimeo, Sankaku, and [many more](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

## Features

Supports sites backed by yt-dlp. Install yt-dlp via the dependency manager on first launch. Uses Eagle's official FFmpeg plugin for audio/video merging. Automatically imports downloaded videos to Eagle with metadata. Supports Chinese and English interfaces with real-time progress display. Also supports downloading image-only Pinterest Pins (fetches full-resolution originals automatically).

## What's New (3.1.0)

Changes in this branch compared to upstream 3.0.0.

### Downloading

- Live progress: shows percentage, speed and ETA while downloading; merge / transcode stages show an estimated progress, falling back to an indeterminate animation
- Multi-threaded download: a new "Download Threads" preference (Auto / 8 / 16 / 32 / 64 / 128) mapped to yt-dlp `--concurrent-fragments`; it applies to HLS / DASH segments, while direct MP4 files stay single-connection
- Twitter / X restricted content: for logged-out requests X returns a TweetTombstone on NSFW / age-restricted tweets; the plugin resolves the direct CDN url through a public API and lets yt-dlp fetch it, while regular tweets keep the original path

### UI and interaction

- Paste button in the input bar: reads the system clipboard, extracts an https link from mixed text and enables the download button automatically
- Always on top: a pin button in the header calls `eagle.window.setAlwaysOnTop` and persists the state in localStorage
- Resizable window: minimum 360 × 420, size saved 300ms after resizing stops and immediately on close, restored on next launch
- Remove records: hover a download item to reveal a × that removes it; active downloads cannot be removed and imported Eagle items are untouched

### Local bridge

- The plugin exposes `GET /ping` and `POST /ingest` on `127.0.0.1:43110` for the browser extension
- Only https urls on x.com / twitter.com / video.twimg.com / pbs.twimg.com are accepted, request body is capped at 16 KB
- Returns 503 when dependencies are not ready; accepted links are queued and the plugin window is brought to front

## Browser Extension (Edge / Chromium)

The companion extension lives in `edge-extension/` (Manifest V3) and adds a "Save to Eagle" button under videos and GIFs on X / Twitter.

Install: open `edge://extensions`, enable "Developer mode", click "Load unpacked" and select the `edge-extension/` folder.

How it works:

- The content script sends the tweet url plus the direct media url to the background service worker
- The worker posts to the plugin bridge at `127.0.0.1:43110`, so yt-dlp downloads it (works for NSFW and login-only content)
- If the plugin is closed or not ready, it falls back to Eagle's local API at `127.0.0.1:41595` with the direct media url
- If neither is available, the button reports "Please open the Eagle plugin"

Note: the bridge path requires the plugin window to be open; with the window closed, only tweets with a directly reachable media url can be saved through the Eagle API.

## Installation

Manual install: download the [latest release](https://github.com/nyako-cake/eagle-video-downloader/releases), then in Eagle go to Plugins → Developer Options → Import Local Project.

## First Run

On first launch, install yt-dlp (~30MB) from the dependency management page. ffmpeg uses Eagle's official FFmpeg plugin — if missing, a button in the dependency manager allows one-click navigation to download it from the Eagle Store.

## Usage

1. Copy a video link
2. Paste it into the plugin input box
3. Click the download button
4. The video is automatically imported to Eagle after download

## Troubleshooting

- "yt-dlp is not installed": reinstall it from the dependency page; if GitHub is unreachable, drop the yt-dlp binary into the plugin's `bin/` folder manually (`yt-dlp.exe` on Windows) and restart the plugin
- Downloads stall or show no speed: check your system proxy first, yt-dlp inherits the system proxy settings
- The extension says "Please open the Eagle plugin": the plugin window is closed or dependencies are not ready; open the plugin and retry
- NSFW / age-restricted tweets fail: keep the plugin window open so it can resolve the direct media url
- Merge percentage jumps: merge progress is estimated from the output file size, small files may jump straight from 0% to 100%

## Development

```bash
npm install      # Install dependencies
npm run build    # Build plugin
npm run dev      # Development mode (watch for changes)
npm run package  # Packaging Plugin
```

The project uses esbuild for bundling, i18next for internationalization, yt-dlp for video extraction, and Eagle's official FFmpeg plugin.

## System Requirements

Eagle 4.0 or higher. Eagle's official FFmpeg plugin required. Internet connection required.

## License

MIT © [fansanqiu](https://github.com/fansanqiu)

For personal use only. Please comply with the terms of service of video platforms and applicable copyright laws.

## Acknowledgements

This project is based on [OlivierEstevez/eagle-twitter-video-downloader](https://github.com/OlivierEstevez/eagle-twitter-video-downloader). Thanks to the original author for the foundational work. Video extraction is powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp), and audio/video merging and transcoding are powered by [FFmpeg](https://ffmpeg.org).
