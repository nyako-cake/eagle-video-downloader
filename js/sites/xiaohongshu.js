/**
 * 小红书（xiaohongshu.com）适配器
 *
 * 笔记页是服务端渲染的，`window.__INITIAL_STATE__` 里带完整笔记数据
 * （标题、正文、话题标签、图片 fileId、视频直链），因此不需要签名接口。
 * 两个前提：
 *   1. 未登录访问笔记必须带 `xsec_token`（App 分享链接 / 浏览器地址栏里的分享链接自带）；
 *   2. 直接冷启动请求会被拒，需要先访问 /explore 拿到 acw_tc 等 Cookie。
 *
 * 解析出的标题会作为文件名，正文作为 Eagle 注释，话题作为 Eagle 标签。
 */

const { validateUrl, assertHostAllowed, secureHttpsGet } = require("../net-guard");
const i18next = require("i18next");

const PLATFORM_DOMAINS = ["xiaohongshu.com", "xhslink.com"];
const NOTE_HOST_DOMAINS = ["xiaohongshu.com"];
const SHORT_LINK_DOMAINS = ["xhslink.com"];
const ALLOWED_MEDIA_DOMAINS = ["xhscdn.com"];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const NOTE_PATH_RE = /^\/(?:explore|discovery\/item|note)\/([0-9a-f]{24})\/?$/i;
const IMAGE_ORIGIN = "https://sns-img-bd.xhscdn.com/";
const HTML_LIMIT = 4 * 1024 * 1024;
const REQUEST_TIMEOUT = 25000;
const WARM_TTL = 10 * 60 * 1000;
const MAX_TAGS = 30;

function tr(key, fallback) {
  try {
    const value = i18next.t(key);
    return value && value !== key ? value : fallback;
  } catch (e) {
    return fallback;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function isHostIn(url, domains) {
  const host = hostOf(url);
  if (!host) return false;
  return domains.some((domain) => host === domain || host.endsWith("." + domain));
}

function match(url) {
  return isHostIn(url, PLATFORM_DOMAINS);
}

function isShortLink(url) {
  return isHostIn(url, SHORT_LINK_DOMAINS);
}

/**
 * 从笔记地址中取出 24 位笔记 ID；非笔记页（个人主页、搜索页等）返回 null。
 */
function getNoteId(url) {
  try {
    const parsed = url instanceof URL ? url : new URL(url);
    const matched = parsed.pathname.match(NOTE_PATH_RE);
    return matched ? matched[1].toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

/**
 * 只保留读取笔记必需的 xsec_token / xsec_source，方便去重与重试。
 * 媒体直链带签名参数，必须原样保留。
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!getNoteId(parsed)) return url;
    const kept = new URLSearchParams();
    for (const key of ["xsec_token", "xsec_source"]) {
      const value = parsed.searchParams.get(key);
      if (value) kept.set(key, value);
    }
    parsed.hash = "";
    parsed.search = kept.toString();
    return parsed.toString();
  } catch (e) {
    return url;
  }
}

function getSiteArgs() {
  return [
    "--referer", "https://www.xiaohongshu.com/",
    "--add-header", `User-Agent:${USER_AGENT}`,
  ];
}

/* ------------------------------------------------------------------ */
/* HTTP：Cookie 会话 + 逐跳重定向                                      */
/* ------------------------------------------------------------------ */

const cookieJar = new Map();
let warmedAt = 0;
let warmPromise = null;

function storeCookies(res) {
  const list = res && res.headers && res.headers["set-cookie"];
  if (!Array.isArray(list)) return;
  for (const line of list) {
    const pair = String(line).split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) cookieJar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function cookieHeader() {
  if (!cookieJar.size) return "";
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function buildHeaders(url, extra) {
  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    ...(extra || {}),
  };
  // Cookie 只发给小红书主站，避免把会话带到短链服务
  if (isHostIn(url, NOTE_HOST_DOMAINS)) {
    const cookie = cookieHeader();
    if (cookie) headers.Cookie = cookie;
  }
  return headers;
}

/**
 * GET 一个页面，自动跟随重定向（每一跳都会重新做 SSRF 校验）。
 */
function request(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    (async () => {
      let req;
      try {
        req = await secureHttpsGet(url, { headers: buildHeaders(url) }, (res) => {
          storeCookies(res);
          const status = res.statusCode;
          if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
            res.resume();
            if (redirectsLeft <= 0) {
              finish(reject, new Error(tr("error.xhsExtractFailed", "Failed to read this Xiaohongshu note")));
              return;
            }
            let nextUrl;
            try {
              nextUrl = new URL(res.headers.location, url).toString();
            } catch (e) {
              finish(reject, new Error(tr("error.xhsExtractFailed", "Failed to read this Xiaohongshu note")));
              return;
            }
            request(nextUrl, redirectsLeft - 1).then(
              (value) => finish(resolve, value),
              (error) => finish(reject, error)
            );
            return;
          }

          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
            if (body.length > HTML_LIMIT) {
              res.destroy();
              finish(reject, new Error(tr("error.xhsExtractFailed", "Failed to read this Xiaohongshu note")));
            }
          });
          res.on("end", () => finish(resolve, { statusCode: status, body, finalUrl: url, headers: res.headers }));
          res.on("error", () => finish(reject, new Error(tr("error.xhsExtractFailed", "Failed to read this Xiaohongshu note"))));
        });
        req.on("error", () => finish(reject, new Error(tr("error.xhsExtractFailed", "Failed to read this Xiaohongshu note"))));
        req.setTimeout(REQUEST_TIMEOUT, () => {
          req.destroy();
          finish(reject, new Error(tr("error.xhsExtractFailed", "Failed to read this Xiaohongshu note")));
        });
      } catch (error) {
        // ENETBOUNDARY 是安全校验拒绝，保留原样交给上层提示
        finish(reject, error);
      }
    })();
  });
}

/**
 * 冷启动请求会被小红书拒绝，先访问 /explore 建立会话（Cookie 10 分钟内复用）。
 */
async function warmUp() {
  if (cookieJar.size && Date.now() - warmedAt < WARM_TTL) return;
  if (warmPromise) return warmPromise;
  warmPromise = (async () => {
    try {
      await request("https://www.xiaohongshu.com/explore");
      warmedAt = Date.now();
    } catch (e) {
      // 预热失败不直接报错，让后续真实请求给出更准确的错误
    } finally {
      warmPromise = null;
    }
  })();
  return warmPromise;
}

/* ------------------------------------------------------------------ */
/* 页面解析                                                            */
/* ------------------------------------------------------------------ */

function extractState(html) {
  if (typeof html !== "string") return null;
  const matched = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/);
  if (!matched) return null;
  // 页面里的 state 不是严格 JSON：值里会出现 undefined
  const source = matched[1].replace(/([:[,]\s*)undefined(?=\s*[,}\]])/g, "$1null");
  try {
    return JSON.parse(source);
  } catch (e) {
    return null;
  }
}

function pickNote(state, noteId) {
  const map = state && state.note && state.note.noteDetailMap;
  if (!map || typeof map !== "object") return null;
  const entry = map[noteId] || map[Object.keys(map)[0]];
  if (!entry || !entry.note || typeof entry.note !== "object") return null;
  return entry.note;
}

function firstLine(text, maxLength) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const cut = cleaned.split(/[。！？!?\n]/)[0].trim();
  return (cut || cleaned).slice(0, maxLength);
}

function buildTitle(note, noteId) {
  const title = String(note.title || "").replace(/\s+/g, " ").trim();
  if (title) return title.slice(0, 120);
  const fromDesc = firstLine(note.desc, 60);
  return fromDesc || `小红书 ${noteId}`;
}

function buildTags(note) {
  const list = Array.isArray(note.tagList) ? note.tagList : [];
  const seen = new Set();
  const tags = [];
  for (const tag of list) {
    const name = String((tag && tag.name) || "").trim().replace(/^#+/, "");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    tags.push(name);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

function buildDescription(note) {
  return String(note.desc || "").slice(0, 4000);
}

function mediaUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const upgraded = value.trim().replace(/^http:\/\//i, "https://");
  try {
    assertHostAllowed(upgraded, ALLOWED_MEDIA_DOMAINS);
    return upgraded;
  } catch (e) {
    return null;
  }
}

/**
 * 图片：优先用 sns-img-bd 的原图（fileId），失败时退回页面里的 JPEG 默认图。
 * 返回 { url, fallbacks } 供下载器按顺序尝试。
 */
function pickImages(note) {
  const list = Array.isArray(note.imageList) ? note.imageList : [];
  const items = [];
  const seen = new Set();

  for (const image of list) {
    if (!image) continue;
    const fileId = typeof image.fileId === "string" ? image.fileId.trim() : "";
    const original = fileId ? mediaUrl(IMAGE_ORIGIN + fileId) : null;
    const fallback = mediaUrl(image.urlDefault) || mediaUrl(image.url);
    if (!original && !fallback) continue;
    if (original && seen.has(original)) continue;
    if (original) seen.add(original);
    // 原图可能是 HEIC（Eagle 无法预览）；imageView2 能让 CDN 在服务端转成全尺寸 JPEG
    const converted = original ? mediaUrl(`${original}?imageView2/2/w/0/format/jpg`) : null;
    const fallbacks = [];
    for (const candidate of [converted, fallback]) {
      if (candidate && candidate !== original && !fallbacks.includes(candidate)) fallbacks.push(candidate);
    }
    const item = original ? { url: original, fallbacks } : { url: fallback, fallbacks: [] };
    items.push(item);
  }
  return items;
}

/**
 * 视频：在 h264/h265/av1 各档里挑体积最大的一档（同等体积优先 h264，兼容性最好）。
 */
function pickVideo(note) {
  const stream = note && note.video && note.video.media && note.video.media.stream;
  if (!stream || typeof stream !== "object") return null;

  const candidates = [];
  for (const codec of ["h264", "h265", "av1", "h266"]) {
    const list = Array.isArray(stream[codec]) ? stream[codec] : [];
    for (const item of list) {
      if (item && typeof item === "object") candidates.push(item);
    }
  }
  if (!candidates.length) return null;

  const score = (item) => {
    const size = Number(item.size) || 0;
    return size * (String(item.videoCodec || "").toLowerCase() === "h264" ? 1.2 : 1);
  };
  candidates.sort((a, b) => score(b) - score(a));

  for (const candidate of candidates) {
    const backups = Array.isArray(candidate.backupUrls) ? candidate.backupUrls : [];
    for (const raw of [candidate.masterUrl, ...backups]) {
      const url = mediaUrl(raw);
      if (!url) continue;
      const durationMs = Number(candidate.videoDuration) || 0;
      const duration = durationMs > 0
        ? Math.round(durationMs / 1000)
        : Number(note.video && note.video.capa && note.video.capa.duration) || 0;
      return {
        url,
        duration,
        width: Number(candidate.width) || 0,
        height: Number(candidate.height) || 0,
      };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 适配器入口                                                          */
/* ------------------------------------------------------------------ */

async function customGetInfo(url) {
  await warmUp();

  let noteUrl = url;
  if (isShortLink(url)) {
    const initial = await request(url);
    noteUrl = initial.finalUrl;
  }

  if (!isHostIn(noteUrl, NOTE_HOST_DOMAINS)) {
    throw new Error(tr("error.xhsUnsupported", "Only Xiaohongshu note links are supported"));
  }

  const noteId = getNoteId(noteUrl);
  if (!noteId) {
    throw new Error(tr("error.xhsUnsupported", "Only Xiaohongshu note links are supported"));
  }

  await validateUrl(noteUrl);
  const response = await request(noteUrl);
  if (response.statusCode === 404) {
    throw new Error(tr("error.xhsNoteUnavailable", "This Xiaohongshu note cannot be read"));
  }
  if (response.statusCode !== 200) {
    throw new Error(tr("error.xhsExtractFailed", "Failed to read this Xiaohongshu note"));
  }

  const state = extractState(response.body);
  const note = pickNote(state, noteId);
  if (!note) {
    throw new Error(tr("error.xhsNoteUnavailable", "This Xiaohongshu note cannot be read"));
  }

  const title = buildTitle(note, noteId);
  const description = buildDescription(note);
  const tags = buildTags(note);
  const nickname = (note.user && (note.user.nickname || note.user.nickName)) || "Xiaohongshu";

  const base = {
    title,
    description,
    tags,
    extractor: "xiaohongshu",
    uploader: String(nickname),
    id: noteId,
    webpage_url: noteUrl,
    thumbnail: mediaUrl(note.imageList && note.imageList[0] && note.imageList[0].urlDefault) || null,
  };

  const video = pickVideo(note);
  if (video && video.url) {
    return {
      ...base,
      duration: video.duration || 0,
      webpage_url: video.url,
      useTitleAsFilename: true,
    };
  }
  // 视频笔记解析不到直链时不要静默退回封面图
  if (String(note.type || "").toLowerCase() === "video") {
    throw new Error(tr("error.xhsNoMedia", "No downloadable image or video found in this note"));
  }

  const images = pickImages(note);
  if (images.length) {
    return {
      ...base,
      type: "image",
      imageUrl: images[0].url,
      images,
      // 图片 CDN 直连即可，跳过 yt-dlp 尝试，避免每张图多一次无效子进程
      imageDirect: true,
    };
  }

  throw new Error(tr("error.xhsNoMedia", "No downloadable image or video found in this note"));
}

module.exports = {
  match,
  normalizeUrl,
  getSiteArgs,
  getNoteId,
  customGetInfo,
};
