/**
 * Sankaku（sankaku.app）适配器
 * 支持 Sankaku Complex 投稿页的视频与图片解析下载
 *
 * 站点为纯前端渲染的单页应用，页面源码中不含媒体直链，
 * 因此通过站点官方的公开 API（sankakuapi.com/v2/posts）按投稿 ID 取回投稿数据，
 * 再交由 yt-dlp 下载 file_url 指向的直链。
 */

const { validateUrl, assertHostAllowed, secureHttpsGet } = require("../net-guard");
const i18next = require("i18next");

const API_BASE = "https://sankakuapi.com";
const API_ACCEPT = "application/vnd.sankaku.api+json;v=2";
const ALLOWED_MEDIA_DOMAINS = ["sankakucomplex.com", "sankaku.app"];
const POST_PATH_RE = /^(?:\/[a-z]{2})?\/posts?(?:\/show)?\/([A-Za-z0-9]+)\/?$/i;
const VIDEO_EXT_RE = /^(mp4|webm|mov|m4v|mkv)$/i;
const IMAGE_EXT_RE = /^(jpg|jpeg|png|gif|webp|avif)$/i;

function match(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "sankaku.app" ||
      host.endsWith(".sankaku.app") ||
      host === "sankakucomplex.com" ||
      host.endsWith(".sankakucomplex.com")
    );
  } catch {
    return false;
  }
}

/**
 * 仅规范化投稿页地址（去掉查询串与片段），
 * 媒体直链带有签名参数，必须原样保留。
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    if (!getPostId(u)) return url;
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url;
  }
}

function getSiteArgs() {
  return [
    "--referer", "https://sankaku.app/",
    "--add-header", "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ];
}

/**
 * 从投稿页地址中取出投稿 ID；不是投稿页（如媒体直链、列表页）时返回 null。
 */
function getPostId(url) {
  try {
    const parsed = url instanceof URL ? url : new URL(url);
    const matched = parsed.pathname.match(POST_PATH_RE);
    return matched ? matched[1] : null;
  } catch {
    return null;
  }
}

/**
 * 调用官方 API 查询单个投稿。
 * @returns {Promise<object|null>} 投稿对象；查询无结果时返回 null
 */
function fetchPost(postId) {
  return new Promise(async (resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const params = new URLSearchParams({
      lang: "en",
      page: "1",
      limit: "1",
      tags: `id:${postId}`,
    });
    const apiUrl = `${API_BASE}/v2/posts?${params.toString()}`;

    try {
      await validateUrl(apiUrl);
      const req = await secureHttpsGet(
        apiUrl,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": API_ACCEPT,
            "Origin": "https://sankaku.app",
            "Referer": "https://sankaku.app/",
          },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
            if (body.length > 2e6) {
              res.destroy();
              finish(reject, new Error(i18next.t("error.sankakuExtractFailed")));
            }
          });
          res.on("end", () => {
            if (res.statusCode === 429) {
              finish(reject, new Error(i18next.t("error.sankakuRateLimited")));
              return;
            }
            if (res.statusCode !== 200) {
              finish(reject, new Error(i18next.t("error.sankakuExtractFailed")));
              return;
            }
            try {
              finish(resolve, pickPost(JSON.parse(body), postId));
            } catch (e) {
              finish(reject, new Error(i18next.t("error.sankakuExtractFailed")));
            }
          });
          res.on("error", () => finish(reject, new Error(i18next.t("error.sankakuExtractFailed"))));
        }
      );
      req.on("error", () => finish(reject, new Error(i18next.t("error.sankakuExtractFailed"))));
      req.setTimeout(15000, () => {
        req.destroy();
        finish(reject, new Error(i18next.t("error.sankakuExtractFailed")));
      });
    } catch (e) {
      finish(reject, e);
    }
    setTimeout(() => finish(reject, new Error(i18next.t("error.sankakuExtractFailed"))), 20000);
  });
}

/**
 * API 正常返回投稿数组；按 ID 精确匹配，避免 id_range 前缀命中其它投稿。
 */
function pickPost(payload, postId) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload && payload.data)
      ? payload.data
      : [];
  const post = list.find((item) => item && String(item.id).toLowerCase() === postId.toLowerCase());
  return post || null;
}

function buildTitle(post) {
  const author = (post.author && (post.author.display_name || post.author.name)) || "";
  const label = `Sankaku ${post.id}`;
  return author ? `${author} - ${label}` : label;
}

function buildDescription(post) {
  const tags = Array.isArray(post.tag_names) ? post.tag_names.slice(0, 12).join(" ") : "";
  return tags;
}

async function customGetInfo(url) {
  const postId = getPostId(url);
  // 媒体直链等非投稿页交给 yt-dlp 的通用解析器处理
  if (!postId) return null;

  const post = await fetchPost(postId);
  if (!post) {
    throw new Error(i18next.t("error.sankakuNotFound"));
  }
  if (post.status && post.status !== "active") {
    throw new Error(i18next.t("error.sankakuUnavailable"));
  }

  let fileUrl = typeof post.file_url === "string" ? post.file_url.trim() : "";
  if (!fileUrl) {
    throw new Error(i18next.t("error.sankakuLoginRequired"));
  }
  if (fileUrl.startsWith("http://")) {
    fileUrl = `https://${fileUrl.slice("http://".length)}`;
  }

  assertHostAllowed(fileUrl, ALLOWED_MEDIA_DOMAINS);
  await validateUrl(fileUrl);

  const fileExt = String(post.file_ext || "").toLowerCase();
  const fileType = String(post.file_type || "").toLowerCase();
  const isVideo = fileType.startsWith("video/") || VIDEO_EXT_RE.test(fileExt);

  const base = {
    title: buildTitle(post),
    description: buildDescription(post),
    duration: Number(post.duration || post.video_duration || 0) || 0,
    thumbnail: post.preview_url || post.sample_url || null,
    uploader: (post.author && (post.author.display_name || post.author.name)) || "Sankaku",
    extractor: "sankaku",
    id: post.id,
    webpage_url: fileUrl,
  };

  if (isVideo) {
    return base;
  }

  if (IMAGE_EXT_RE.test(fileExt) || fileType.startsWith("image/")) {
    return {
      ...base,
      type: "image",
      imageUrl: fileUrl,
      webpage_url: url,
    };
  }

  throw new Error(i18next.t("error.sankakuNoMedia"));
}

module.exports = {
  match,
  normalizeUrl,
  getSiteArgs,
  customGetInfo,
  getPostId,
};
