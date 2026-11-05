/**
 * Twitter / X 账号监控：用 auth_token + ct0 轮询「点赞」和「书签」，
 * 把新增的推文链接投递到下载队列。
 *
 * - 所有状态按资源库隔离（eagle.library.path）
 * - 启动时补抓「上次关闭后」新增的内容（分页直到覆盖上次检查时间）
 * - 接口：Viewer / Likes / Bookmarks（x.com 内部 GraphQL）
 */

const twitterAuth = require("./twitter-auth");
const { getJson, getRaw } = require("./x-http");
const { scopedKey } = require("./library-context");

const SEEN_KEY = "eagle-video-downloader.twitterSeen";
const ENABLED_KEY = "eagle-video-downloader.twitterMonitorEnabled";
const INTERVAL_KEY = "eagle-video-downloader.twitterMonitorInterval";
const INTERVAL_MS_KEY = "eagle-video-downloader.twitterMonitorIntervalMs";
const MIN_INTERVAL_MS = 120000;
const LIKES_KEY = "eagle-video-downloader.twitterMonitorLikes";
const BOOKMARKS_KEY = "eagle-video-downloader.twitterMonitorBookmarks";
const BASELINE_KEY = "eagle-video-downloader.twitterBaselineAt";
const LAST_CHECK_KEY = "eagle-video-downloader.twitterLastCheckAt";
const PROFILE_KEY = "eagle-video-downloader.twitterProfile";

const MAX_SEEN = 5000;
const MAX_DOWNLOAD_PER_CYCLE = Number.MAX_SAFE_INTEGER;
const MAX_CATCHUP_DOWNLOAD = Number.MAX_SAFE_INTEGER;
const MAX_CATCHUP_PAGES = 200;
const DEFAULT_INTERVAL_MINUTES = 10;

const QUERY_IDS = {
  Viewer: "TpQxQtWMTMnIAMPlMGMqNw",
  Likes: "a6ZbplAY_XzbVt5jy_Ko_Q",
  Bookmarks: "jbqsfdzI0EMFHAtpEC6vyA",
};

const FEATURES = { rweb_video_screen_enabled: false };

let timer = null;
let running = false;
let lastResult = null;
let nextRunAt = 0;
let currentIntervalMs = 0;

/* --------------------------------------------------------------- storage */

function readJson(baseKey, fallback) {
  try {
    const key = scopedKey(baseKey);
    let raw = localStorage.getItem(key);
    if (raw === null) {
      const legacy = localStorage.getItem(baseKey);
      if (legacy !== null) {
        localStorage.setItem(key, legacy);
        raw = legacy;
      }
    }
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function readNumber(baseKey) {
  try {
    const key = scopedKey(baseKey);
    let raw = localStorage.getItem(key);
    if (raw === null) {
      const legacy = localStorage.getItem(baseKey);
      if (legacy !== null) {
        localStorage.setItem(key, legacy);
        raw = legacy;
      }
    }
    return Number(raw) || 0;
  } catch (e) {
    return 0;
  }
}

function writeValue(baseKey, value) {
  try {
    localStorage.setItem(scopedKey(baseKey), String(value));
  } catch (e) {
    // ignore
  }
}

function readSeen() {
  const parsed = readJson(SEEN_KEY, []);
  return new Set(Array.isArray(parsed) ? parsed : []);
}

function writeSeen(set) {
  writeValue(SEEN_KEY, JSON.stringify(Array.from(set).slice(-MAX_SEEN)));
}

function getPrefs() {
  try {
    const savedMs = readNumber(INTERVAL_MS_KEY);
    const legacyMinutes = readNumber(INTERVAL_KEY);
    const ms = savedMs || (legacyMinutes ? legacyMinutes * 60000 : DEFAULT_INTERVAL_MINUTES * 60000);
    const readFlag = (key) => localStorage.getItem(scopedKey(key)) !== "0";
    return {
      enabled: localStorage.getItem(scopedKey(ENABLED_KEY)) === "1",
      ms: Math.max(MIN_INTERVAL_MS, ms || DEFAULT_INTERVAL_MINUTES * 60000),
      likes: readFlag(LIKES_KEY),
      bookmarks: readFlag(BOOKMARKS_KEY),
    };
  } catch (e) {
    return { enabled: false, ms: DEFAULT_INTERVAL_MINUTES * 60000, likes: true, bookmarks: true };
  }
}

function setPrefs(patch) {
  if (typeof patch.enabled === "boolean") writeValue(ENABLED_KEY, patch.enabled ? "1" : "0");
  if (patch.ms) writeValue(INTERVAL_MS_KEY, Math.max(MIN_INTERVAL_MS, Number(patch.ms) || 0));
  if (typeof patch.likes === "boolean") writeValue(LIKES_KEY, patch.likes ? "1" : "0");
  if (typeof patch.bookmarks === "boolean") writeValue(BOOKMARKS_KEY, patch.bookmarks ? "1" : "0");
}

function getBaselineAt() {
  return readNumber(BASELINE_KEY);
}

function setBaselineAt(value) {
  writeValue(BASELINE_KEY, value || 0);
}

function getLastCheckAt() {
  return readNumber(LAST_CHECK_KEY);
}

function setLastCheckAt(value) {
  writeValue(LAST_CHECK_KEY, value || Date.now());
}

/* --------------------------------------------------------------- api */

function describeError(result) {
  if (result.status === 401 || result.status === 403) return "cookie 无效或已过期";
  if (result.status === 404) return "X 接口已更新（queryId 失效）";
  if (result.status === 422) return "请求参数被拒绝";
  if (result.status === 429) return "请求过于频繁（429）";
  if (result.status === 0) return "网络错误（可能需要代理）" + (result.error ? "：" + result.error : "");
  return "HTTP " + result.status;
}

function findTweetIds(node, out, depth) {
  if (!node || depth > 14) return;
  if (Array.isArray(node)) {
    for (const item of node) findTweetIds(item, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const result = node.tweet_results && node.tweet_results.result;
  if (result) {
    const legacy = result.legacy || result;
    const id = legacy.id_str || legacy.rest_id || result.rest_id;
    if (id && /^\d+$/.test(String(id))) out.push(String(id));
  }
  for (const key of Object.keys(node)) {
    if (key === "tweet_results") continue;
    findTweetIds(node[key], out, depth + 1);
  }
}

/** 从时间线响应里取出推文 id / 时间 / 下一页 cursor */
function extractTimeline(json) {
  const instructions = [];
  const visit = (node, depth) => {
    if (!node || depth > 8) return;
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof node !== "object") return;
    if (Array.isArray(node.instructions)) instructions.push(...node.instructions);
    for (const key of Object.keys(node)) {
      if (key !== "instructions") visit(node[key], depth + 1);
    }
  };
  visit(json, 0);

  const items = [];
  let cursor = null;
  for (const instruction of instructions) {
    if (!instruction) continue;
    if (instruction.cursorType === "Bottom" && instruction.value) cursor = instruction.value;
    if (!Array.isArray(instruction.entries)) continue;
    for (const entry of instruction.entries) {
      if (!entry) continue;
      const content = entry.content || {};
      const itemContent = content.itemContent;
      const tweet = itemContent && itemContent.tweet_results && itemContent.tweet_results.result;
      if (tweet) {
        const legacy = tweet.legacy || tweet;
        const id = legacy.id_str || legacy.rest_id || tweet.rest_id;
        const createdAt = legacy.created_at ? Date.parse(legacy.created_at) : 0;
        if (id) items.push({ id: String(id), createdAt });
      }
      if (typeof entry.entryId === "string" && entry.entryId.startsWith("cursor-bottom") && content.value) {
        cursor = content.value;
      }
    }
  }
  return { items, cursor };
}

function findUserLegacy(node, depth) {
  if (!node || depth > 10) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findUserLegacy(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  if (node.legacy && typeof node.legacy === "object" && node.legacy.screen_name) return node.legacy;
  for (const key of Object.keys(node)) {
    const found = findUserLegacy(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function normalizeProfile(legacy, fallbackId) {
  const avatar = legacy && (legacy.profile_image_url_https || legacy.profile_image_url || legacy.image_url);
  return {
    id: (legacy && legacy.id_str) || fallbackId || "",
    screenName: (legacy && legacy.screen_name) || "",
    name: (legacy && legacy.name) || "",
    avatar: typeof avatar === "string" ? avatar.replace("_normal.", "_200x200.") : "",
  };
}

/** 头像走插件自己的代理请求，转成 data URL，避免渲染层直连图片 CDN 失败 */
async function withAvatarData(profile) {
  if (!profile || !profile.avatar) return profile;
  try {
    const result = await getRaw(profile.avatar, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        accept: "image/*",
      },
    });
    if (result.status === 200 && result.buffer && result.buffer.length) {
      const type = String(result.contentType || "image/jpeg").split(";")[0];
      const dataUrl = "data:" + type + ";base64," + result.buffer.toString("base64");
      if (dataUrl.length < 400000) profile.avatarData = dataUrl;
    }
  } catch (e) {
    // 忽略头像失败，不影响账号信息
  }
  return profile;
}

function saveProfile(profile) {
  try {
    writeValue(PROFILE_KEY, JSON.stringify(profile || {}));
  } catch (e) {
    // ignore
  }
}

function getSavedProfile() {
  const parsed = readJson(PROFILE_KEY, null);
  return parsed && typeof parsed === "object" ? parsed : null;
}

async function getProfile(auth) {
  const url = "https://x.com/i/api/graphql/" + QUERY_IDS.Viewer + "/Viewer?variables=%7B%7D&features=%7B%7D";
  const result = await getJson(url, { headers: auth.headers });
  if (result.status !== 200 || !result.json) {
    return { ok: false, status: result.status, error: describeError(result) };
  }
  const body = result.body || "";
  const idMatch = body.match(/"rest_id":"(\d+)"/);
  const legacy = findUserLegacy(result.json, 0);
  const profile = normalizeProfile(legacy, idMatch ? idMatch[1] : "");

  // 兜底：某些版本 Viewer 返回结构不同，直接从文本里取字段
  if (!profile.screenName) {
    const matched = body.match(/"screen_name":"([^"]+)"/);
    if (matched) profile.screenName = matched[1];
  }
  if (!profile.name) {
    const matched = body.match(/"name":"((?:[^"\\]|\\.)+)"/);
    if (matched) profile.name = matched[1].replace(/\\"/g, '"');
  }
  if (!profile.avatar) {
    const matched = body.match(/"(?:profile_image_url_https|image_url)":"([^"]+)"/);
    if (matched) profile.avatar = matched[1].replace(/\\\//g, "/").replace("_normal.", "_200x200.");
  }
  return { ok: true, ...profile };
}

function endpoointUrl(kind, variables) {
  const op = kind === "likes" ? "Likes" : "Bookmarks";
  return (
    "https://x.com/i/api/graphql/" +
    QUERY_IDS[op] +
    "/" +
    op +
    "?variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&features=" +
    encodeURIComponent(JSON.stringify(FEATURES))
  );
}

async function fetchPage(auth, kind, userId, cursor, count) {
  const variables =
    kind === "likes"
      ? {
          userId,
          count,
          includePromotedContent: false,
          withClientEventToken: false,
          withBirdwatchNotes: false,
          withVoice: true,
        }
      : { count, includePromotedContent: true };
  if (cursor) variables.cursor = cursor;

  const result = await getJson(endpoointUrl(kind, variables), { headers: auth.headers });
  if (result.status !== 200 || !result.json) {
    return { ok: false, status: result.status, error: describeError(result), items: [], cursor: null };
  }
  const timeline = extractTimeline(result.json);
  return { ok: true, items: timeline.items, cursor: timeline.cursor };
}

async function fetchLikes(auth, userId, count) {
  const page = await fetchPage(auth, "likes", userId, null, count);
  if (!page.ok) return page;
  return { ok: true, items: Array.from(new Set(page.items.map((item) => item.id))).map((id) => ({ id, source: "like" })) };
}

async function fetchBookmarks(auth, count) {
  const page = await fetchPage(auth, "bookmarks", "", null, count);
  if (!page.ok) return page;
  return { ok: true, items: Array.from(new Set(page.items.map((item) => item.id))).map((id) => ({ id, source: "bookmark" })) };
}

/** 从最新一页往回翻，直到推文时间早于 since 或翻页上限 */
async function fetchSince(auth, kind, userId, since, maxPages) {
  const collected = [];
  let cursor = null;
  let reachedOld = false;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const page = await fetchPage(auth, kind, userId, cursor, 20);
    if (!page.ok) return { ok: false, error: page.error, items: collected };
    if (!page.items.length) break;

    for (const item of page.items) {
      if (item.createdAt && item.createdAt < since) {
        reachedOld = true;
        continue;
      }
      collected.push(item);
    }
    cursor = page.cursor;
    if (reachedOld || !cursor) break;
  }

  return { ok: true, items: collected };
}

/* --------------------------------------------------------------- poll */

const defaultApi = { getProfile, fetchLikes, fetchBookmarks, fetchSince };

async function pollOnce(options = {}) {
  const { baselineOnly = false, api = defaultApi } = options;
  const auth = twitterAuth.getAuth();
  if (!auth) return { ok: false, error: "no-cookie" };

  const profile = await api.getProfile(auth);
  if (!profile.ok) return { ok: false, error: profile.error, status: profile.status };

  const seen = readSeen();
  const isFirstRun = !getBaselineAt();
  const prefs = getPrefs();

  const collected = [];
  const likes = prefs.likes ? await api.fetchLikes(auth, profile.id, 20) : { ok: true, items: [] };
  if (likes.ok) collected.push(...likes.items);

  const bookmarks = prefs.bookmarks ? await api.fetchBookmarks(auth, 20) : { ok: true, items: [] };
  if (bookmarks.ok) collected.push(...bookmarks.items);

  const fresh = collected.filter((item) => item.id && !seen.has(item.id));
  for (const item of collected) seen.add(item.id);
  writeSeen(seen);
  setLastCheckAt(Date.now());

  if (isFirstRun || baselineOnly) {
    setBaselineAt(Date.now());
    return {
      ok: true,
      baseline: true,
      screenName: profile.screenName,
      newCount: 0,
      likesOk: likes.ok,
      bookmarksOk: bookmarks.ok,
    };
  }

  const toDownload = fresh.slice(0, MAX_DOWNLOAD_PER_CYCLE);
  for (const item of toDownload) {
    document.dispatchEvent(new CustomEvent("startDownload", { detail: { url: "https://x.com/i/status/" + item.id } }));
  }

  return {
    ok: true,
    screenName: profile.screenName,
    newCount: toDownload.length,
    likesOk: likes.ok,
    bookmarksOk: bookmarks.ok,
    likesError: likes.ok ? null : likes.error,
    bookmarksError: bookmarks.ok ? null : bookmarks.error,
  };
}

/**
 * 补抓：翻页收取「上次检查时间之后」新增的点赞与收藏，全部加入下载队列。
 * 首次运行（没有历史检查时间）只建立基线。
 */
async function catchUp(options = {}) {
  const { maxPages = MAX_CATCHUP_PAGES, maxDownload = MAX_CATCHUP_DOWNLOAD, api = defaultApi } = options;
  const auth = twitterAuth.getAuth();
  if (!auth) return { ok: false, error: "no-cookie" };

  const lastCheck = getLastCheckAt();
  if (!lastCheck) {
    const baseline = await pollOnce({ baselineOnly: true });
    return { ok: true, baseline: true, newCount: 0, screenName: baseline.screenName };
  }

  const profile = await api.getProfile(auth);
  if (!profile.ok) return { ok: false, error: profile.error };

  const since = lastCheck - 60000;
  const seen = readSeen();
  const prefs = getPrefs();

  const likes = prefs.likes
    ? await api.fetchSince(auth, "likes", profile.id, since, maxPages)
    : { ok: true, items: [] };
  const bookmarks = prefs.bookmarks
    ? await api.fetchSince(auth, "bookmarks", "", since, maxPages)
    : { ok: true, items: [] };

  const collected = [];
  if (likes.ok) collected.push(...likes.items.map((item) => ({ id: item.id, source: "like" })));
  if (bookmarks.ok) collected.push(...bookmarks.items.map((item) => ({ id: item.id, source: "bookmark" })));

  const unique = [];
  const seenIds = new Set();
  for (const item of collected) {
    if (!item.id || seenIds.has(item.id) || seen.has(item.id)) continue;
    seenIds.add(item.id);
    unique.push(item);
  }

  for (const item of unique) seen.add(item.id);
  writeSeen(seen);
  setLastCheckAt(Date.now());

  const toDownload = unique.slice(0, maxDownload);
  for (const item of toDownload) {
    document.dispatchEvent(new CustomEvent("startDownload", { detail: { url: "https://x.com/i/status/" + item.id } }));
  }

  return {
    ok: true,
    screenName: profile.screenName,
    newCount: toDownload.length,
    truncated: unique.length > toDownload.length,
    likesOk: likes.ok,
    bookmarksOk: bookmarks.ok,
    likesError: likes.ok ? null : likes.error,
    bookmarksError: bookmarks.ok ? null : bookmarks.error,
  };
}

/* --------------------------------------------------------------- lifecycle */

function markNextRun(intervalMs) {
  currentIntervalMs = intervalMs;
  nextRunAt = Date.now() + intervalMs;
}

async function runCycle() {
  if (running) return lastResult;
  running = true;
  try {
    lastResult = await pollOnce();
  } catch (error) {
    lastResult = { ok: false, error: (error && error.message) || "unknown" };
  } finally {
    running = false;
  }
  return lastResult;
}

function start(ms) {
  stop();
  const interval = Math.max(MIN_INTERVAL_MS, Number(ms) || DEFAULT_INTERVAL_MINUTES * 60000);
  setPrefs({ enabled: true, ms: interval });
  runCycle();
  markNextRun(interval);
  timer = setInterval(runCycle, interval);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  setPrefs({ enabled: false });
  nextRunAt = 0;
  currentIntervalMs = 0;
}

function isRunning() {
  return !!timer;
}

function getStatus() {
  return {
    running: isRunning(),
    prefs: getPrefs(),
    baselineAt: getBaselineAt(),
    lastCheckAt: getLastCheckAt(),
    last: lastResult,
  };
}

async function testConnection() {
  const auth = twitterAuth.getAuth();
  if (!auth) return { ok: false, error: "no-cookie" };
  const profile = await getProfile(auth);
  if (!profile.ok) return profile;
  const likes = await fetchLikes(auth, profile.id, 3);
  const bookmarks = await fetchBookmarks(auth, 3);
  await withAvatarData(profile);
  saveProfile(profile);
  return {
    ok: true,
    screenName: profile.screenName,
    name: profile.name,
    avatar: profile.avatar,
    avatarData: profile.avatarData || "",
    id: profile.id,
    likesOk: likes.ok,
    likesError: likes.ok ? null : likes.error,
    bookmarksOk: bookmarks.ok,
    bookmarksError: bookmarks.ok ? null : bookmarks.error,
  };
}

/** 只刷新账号资料（头像 / 昵称 / 用户名），不触发监控请求 */
async function fetchProfile() {
  const auth = twitterAuth.getAuth();
  if (!auth) return { ok: false, error: "no-cookie" };
  const profile = await getProfile(auth);
  if (profile.ok) {
    await withAvatarData(profile);
    saveProfile(profile);
  }
  return profile;
}

/** 插件启动：补抓上次关闭后新增内容，然后按偏好开始轮询 */
async function init() {
  const prefs = getPrefs();
  if (!prefs.enabled || !twitterAuth.hasAuth()) return { ok: false, skipped: true };

  let result = null;
  try {
    result = await catchUp();
  } catch (error) {
    result = { ok: false, error: (error && error.message) || "unknown" };
  }

  const interval = Math.max(MIN_INTERVAL_MS, prefs.ms || DEFAULT_INTERVAL_MINUTES * 60000);
  runCycle();
  if (timer) clearInterval(timer);
  markNextRun(interval);
  timer = setInterval(runCycle, interval);
  setPrefs({ enabled: true, ms: interval });
  return result;
}

/** 资源库切换后重新读取凭证与偏好 */
function refreshForLibrary() {
  const wasRunning = isRunning();
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  const prefs = getPrefs();
  if (prefs.enabled && twitterAuth.hasAuth()) {
    runCycle();
    const interval = Math.max(MIN_INTERVAL_MS, prefs.ms);
    markNextRun(interval);
    timer = setInterval(runCycle, interval);
    return true;
  }
  return false;
}

module.exports = {
  MIN_INTERVAL_MS,
  findTweetIds,
  extractTimeline,
  describeError,
  init,
  catchUp,
  start,
  stop,
  isRunning,
  getStatus,
  testConnection,
  pollOnce,
  runCycle,
  getPrefs,
  setPrefs,
  fetchProfile,
  getSavedProfile,
  saveProfile,
  getLastCheckAt,
  setLastCheckAt,
  setBaselineAt,
  refreshForLibrary,
};
