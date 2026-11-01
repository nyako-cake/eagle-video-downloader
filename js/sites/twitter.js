/**
 * Twitter / X site adapter.
 *
 * Handles tweet URLs. NSFW / age-restricted tweets return a TweetTombstone for
 * logged-out requests, which leaves yt-dlp without any format. In that case we
 * resolve the direct CDN url through a public API and let yt-dlp download it.
 */

const { validateUrl, assertHostAllowed, secureHttpsGet } = require("../net-guard");

const STATUS_ID_RE = /\/(?:status|statuses)\/(\d+)/;
const ALLOWED_MEDIA_DOMAINS = ["video.twimg.com"];
const RECOVERABLE_ERROR_RE = /No video formats found|No video could be found|TweetTombstone|NSFW|age.?restrict|not authorized|requires authentication/i;

function match(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return host === "twitter.com" || host === "x.com" || host.endsWith(".twitter.com") || host.endsWith(".x.com");
  } catch {
    return false;
  }
}

function getSiteArgs() {
  return [
    "--ignore-no-formats-error",
  ];
}

function getStatusId(url) {
  const matched = String(url || "").match(STATUS_ID_RE);
  return matched ? matched[1] : null;
}

function getOutputTemplate(args) {
  const index = args.indexOf("-o");
  if (index >= 0 && typeof args[index + 1] === "string" && args[index + 1].trim()) {
    return args[index + 1];
  }
  return null;
}

function pickBestVideoUrl(tweet) {
  const videos = tweet && tweet.media && Array.isArray(tweet.media.videos) ? tweet.media.videos : [];
  for (const video of videos) {
    const variants = Array.isArray(video.variants) ? video.variants.filter((variant) => {
      if (!variant || typeof variant.url !== "string") return false;
      const kind = `${variant.content_type || ""} ${variant.container || ""}`.toLowerCase();
      return kind.includes("mp4") || kind.includes("video/");
    }) : [];
    variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const candidate = variants.length > 0 ? variants[0].url : video.url;
    if (typeof candidate === "string" && candidate.startsWith("https://")) {
      return candidate;
    }
  }
  return null;
}

/**
 * Resolve tweet media through a public API (works for NSFW tweets without login).
 */
function fetchTweetJson(statusId) {
  return new Promise(async (resolve) => {
    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    try {
      const apiUrl = `https://api.fxtwitter.com/status/${statusId}`;
      await validateUrl(apiUrl);
      const req = await secureHttpsGet(
        apiUrl,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            return finish(null);
          }
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
            if (body.length > 2e6) {
              res.destroy();
              finish(null);
            }
          });
          res.on("end", () => {
            try {
              finish(JSON.parse(body));
            } catch (e) {
              finish(null);
            }
          });
          res.on("error", () => finish(null));
        }
      );
      req.on("error", () => finish(null));
      req.setTimeout(15000, () => {
        req.destroy();
        finish(null);
      });
    } catch (e) {
      finish(null);
    }
    setTimeout(() => finish(null), 20000);
  });
}

async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, url }) {
  try {
    if (!match(url) || !Array.isArray(args) || args.includes("--dump-json")) return null;
    if (!RECOVERABLE_ERROR_RE.test(String(stderr || ""))) return null;

    const statusId = getStatusId(url);
    const outputTemplate = getOutputTemplate(args);
    if (!statusId || !outputTemplate) return null;

    const data = await fetchTweetJson(statusId);
    const directUrl = pickBestVideoUrl(data && data.tweet);
    if (!directUrl) return null;

    await validateUrl(directUrl);
    assertHostAllowed(directUrl, ALLOWED_MEDIA_DOMAINS);

    return await execYtDlp(
      [directUrl, "-o", outputTemplate, "--no-warnings", "--merge-output-format", "mp4"],
      onProgress,
      onOutput,
      false
    );
  } catch (e) {
    return null;
  }
}

module.exports = {
  match,
  getSiteArgs,
  handleExecFailure,
};
