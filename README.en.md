<img src="./docs/封面-英文.jpg">

# Eagle Video Downloader

English | [中文](./README.md)

Download videos directly to Eagle from sites supported by yt-dlp. Built on [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Supported Platforms

YouTube, Twitter / X, TikTok, Bilibili, Instagram, Pinterest, Dribbble, Vimeo, Sankaku, Xiaohongshu, and [many more](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

## Features

Supports sites backed by yt-dlp. Install yt-dlp via the dependency manager on first launch. Uses Eagle's official FFmpeg plugin for audio/video merging. Automatically imports downloaded videos to Eagle with metadata. Supports Chinese and English interfaces with real-time progress display. Also supports downloading image-only Pinterest Pins (fetches full-resolution originals automatically).

## What's New (3.2.0 - 3.9.0)

Main changes in this branch compared to upstream 3.0.0.

### Sites and content

- Sankaku (sankaku.app / sankakucomplex.com): download post videos and images; an accessToken in settings unlocks login-only posts
- Xiaohongshu (xiaohongshu.com): download note images and videos; the note title becomes the filename, the body becomes the Eagle annotation and the topics become Eagle tags; multiple images are numbered and originals are preferred (HEIC is converted to JPEG); tags can be turned off with the "Xiaohongshu Tags" preference
- Twitter / X images: photo tweets are saved at original size, every image is downloaded, and the tweet text becomes the Eagle annotation
- Tweets with several videos now download every video instead of only the first one

### Accounts and automatic fetching

- New "Accounts" tab: Sankaku accessToken plus Twitter / X auth_token and ct0, all as password inputs
- Saved Twitter credentials show the avatar, display name and handle in the accounts tab
- Automatic likes / bookmarks fetching: choose "Fetch likes" and/or "Fetch bookmarks", pick an interval from 2 minutes to 3 hours, and new posts are queued automatically
- A "Fetch test" button runs one fetch immediately; the plugin also catches up on everything added since it was last closed
- Account data, fetch switches, interval and fetch history are scoped per Eagle library
- Downloads are de-duplicated: the same tweet or Sankaku post is downloaded only once within 24 hours

### LAN sharing

- The bridge listens on 0.0.0.0:43110 and exposes GET /peers to discover machines on the same subnet running this plugin
- The extension popup can scan and remember devices and send the current page link to a LAN device; tweet action bars also get a share button, and the share menu offers "Share to LAN device"
- Only the link is sent, nothing is downloaded locally; the receiving machine must have the plugin open and allow inbound 43110


### Downloading

- Live progress: shows percentage, speed and ETA while downloading; merge / transcode stages show an estimated progress, falling back to an indeterminate animation
- Multi-threaded download: a new "Download Threads" preference (Auto / 8 / 16 / 32 / 64 / 128) mapped to yt-dlp `--concurrent-fragments`; it applies to HLS / DASH segments, while direct MP4 files stay single-connection
- Twitter / X restricted content: for logged-out requests X returns a TweetTombstone on NSFW / age-restricted tweets; the plugin resolves the direct CDN url through a public API and lets yt-dlp fetch it, while regular tweets keep the original path

### UI and interaction

- UI follows Eagle's light panel style; the Appearance section offers 6 themes or a "Follow Eagle theme" switch that tracks Eagle's appearance
- Paste button in the input bar: reads the system clipboard, extracts an https link from mixed text and enables the download button automatically
- Always on top: a pin button in the header calls `eagle.window.setAlwaysOnTop` and persists the state in localStorage
- Resizable window: minimum 360 × 420, size saved 300ms after resizing stops and immediately on close, restored on next launch
- Remove records: hover a download item to reveal a × that removes it; active downloads cannot be removed and imported Eagle items are untouched

### Import info rules

- The settings tab bar gets a new "Import Info" tab, placed right after Settings, that groups the tags written into Eagle on import and the imported item naming rules
- The existing "Xiaohongshu Tags" switch moves into this tab and keeps its saved value, so nothing needs to be set again
- The tab explains the rule: Xiaohongshu notes write their topics, other sites write the site identifier, up to 30 tags per import
- Twitter info rules: a "Twitter Info Rules" card on the same tab uses checkboxes to pick the fields that build the imported item name - Twitter ID (author numeric ID), Tweet ID, username (@handle), tweet text and full name
- Each field row has move-up/move-down buttons, and the name is joined with " - " in the order you arrange; with nothing selected the default "tweet text - @handle" is kept, names are truncated past 150 characters and illegal filename characters are replaced
- When one tweet has several images or videos, " (1/N)" is appended to the imported item name so the files do not collide

### Bridge and LAN

- The plugin exposes `GET /ping`, `GET /peers` and `POST /ingest` on `0.0.0.0:43110`, reachable from the local extension and LAN devices
- `/peers` scans the local subnet and returns machines running this plugin
- Only https urls on x.com / twitter.com / video.twimg.com / pbs.twimg.com / sankaku / xiaohongshu are accepted, request body is capped at 16 KB
- Returns 503 when dependencies are not ready; accepted links are queued and the plugin window is brought to front

## Browser Extension (Edge / Chromium)

The companion extension lives in `edge-extension/` (Manifest V3).

Install: open `edge://extensions`, enable "Developer mode", click "Load unpacked" and select the `edge-extension/` folder.

Features:

- X / Twitter: a "Save to Eagle" button and a "Share to LAN device" button in every tweet action bar; the tweet share menu also offers "Share to LAN device"
- Liking or bookmarking a post pushes its link automatically, with separate switches in the popup
- Sankaku: a floating button in the bottom-right corner of the page
- Xiaohongshu: a floating button on note pages that saves the current note (title as filename, body and topics into Eagle); the link must include xsec_token
- Popup "LAN devices": scan and remember machines on the same subnet and send the current page link (link only, no local download)
- When the plugin is closed, the extension tries to wake it through Eagle's local API before pushing
- If the plugin stays unavailable, direct media urls fall back to Eagle's local API at `127.0.0.1:41595`

## Installation

Manual install: download the [latest release](https://github.com/nyako-cake/eagle-video-downloader/releases), then in Eagle go to Plugins → Developer Options → Import Local Project.

## First Run

On first launch, install yt-dlp (~30MB) from the dependency management page. ffmpeg uses Eagle's official FFmpeg plugin — if missing, a button in the dependency manager allows one-click navigation to download it from the Eagle Store.

## Usage

1. Copy a page link
2. Paste it into the plugin input box (the paste button starts the download automatically)
3. Or use the save button, like or bookmark on X / Twitter and let the extension push the link; on Xiaohongshu, use the floating button on a note page
4. The video is automatically imported to Eagle after download

## Troubleshooting

- "yt-dlp is not installed": reinstall it from the dependency page; if GitHub is unreachable, drop the yt-dlp binary into the plugin's `bin/` folder manually (`yt-dlp.exe` on Windows) and restart the plugin
- Downloads stall or show no speed: check your system proxy first, yt-dlp inherits the system proxy settings
- The extension says "Please open the Eagle plugin": the plugin window is closed or dependencies are not ready; open the plugin and retry
- NSFW / age-restricted tweets fail: keep the plugin window open so it can resolve the direct media url
- Merge percentage jumps: merge progress is estimated from the output file size, small files may jump straight from 0% to 100%
- Xiaohongshu says "This note cannot be read": the link must include `xsec_token`. Copy the full link from the app share menu or the browser address bar (for example `.../explore/<id>?xsec_token=...`); a bare note id cannot be read anonymously

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
