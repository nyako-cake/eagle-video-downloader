/**
 * Eagle 视频下载插件
 * 主入口 - 处理插件初始化和下载队列管理
 */

const i18next = require("i18next");
const {
  isYtDlpInstalled,
  downloadYtDlp,
  uninstallYtDlp,
  getYtDlpUpdateInfo,
  getInstalledYtDlpVersion,
  getLatestYtDlpVersion,
  getFfmpegSource,
} = require("./binary");
const { isNetworkError } = require("./net-guard");
const downloader = require("./downloader");
const ui = require("./ui");

// 状态管理
let isInitialized = false;

async function importToEagle(videoPath, metadata, sourceUrl) {
  if (typeof eagle === "undefined") {
    throw new Error(i18next.t("error.eagleApiNotAvailable"));
  }
  const importOptions = {
    name: metadata.title || i18next.t("error.downloadedVideo"),
    website: sourceUrl || undefined,
    tags: [metadata.extractor || "video"],
    annotation: metadata.description ? metadata.description.slice(0, 500) : "",
  };
  try {
    return await eagle.item.addFromPath(videoPath, importOptions);
  } catch (error) {
    throw new Error(`${i18next.t("error.eagleImportFailed")}: ${error.message}`);
  }
}

// 自动设置 Eagle 数据来源 key
const AUTO_ADD_SOURCE_KEY = "eagle-video-downloader.autoAddSource";
// 清晰度与帧率偏好存储 key
const MAX_RESOLUTION_KEY = "eagle-video-downloader.maxResolution";
const MAX_FRAMERATE_KEY = "eagle-video-downloader.maxFramerate";
const THREAD_COUNT_KEY = "eagle-video-downloader.threadCount";

/**
 * 获取用户是否自动设置 Eagle 数据来源 (默认 true)
 */
function getAutoAddSourcePref() {
  const val = localStorage.getItem(AUTO_ADD_SOURCE_KEY);
  return val === null ? true : val === "true";
}

/**
 * 保存用户是否自动设置 Eagle 数据来源
 */
function setAutoAddSourcePref(value) {
  localStorage.setItem(AUTO_ADD_SOURCE_KEY, String(value));
}

/**
 * 获取清晰度上限偏好 (默认 'auto')
 */
function getMaxResolutionPref() {
  return localStorage.getItem(MAX_RESOLUTION_KEY) || "auto";
}

/**
 * 保存清晰度上限偏好
 */
function setMaxResolutionPref(value) {
  const val = value || "auto";
  localStorage.setItem(MAX_RESOLUTION_KEY, val);
  downloader.setQualityPrefs({
    resolution: val,
    framerate: getMaxFrameratePref(),
  });
}

/**
 * 获取帧率上限偏好 (默认 'auto')
 */
function getMaxFrameratePref() {
  return localStorage.getItem(MAX_FRAMERATE_KEY) || "auto";
}

/**
 * 保存帧率上限偏好
 */
function setMaxFrameratePref(value) {
  const val = value || "auto";
  localStorage.setItem(MAX_FRAMERATE_KEY, val);
  downloader.setQualityPrefs({
    resolution: getMaxResolutionPref(),
    framerate: val,
  });
}

/**
 * 获取下载线程数偏好（"auto" 表示交给 yt-dlp 默认）
 */
function getThreadCountPref() {
  return localStorage.getItem(THREAD_COUNT_KEY) || "auto";
}

/**
 * 保存下载线程数偏好
 */
function setThreadCountPref(value) {
  const val = value || "auto";
  localStorage.setItem(THREAD_COUNT_KEY, val);
  downloader.setThreadCount(val);
}

// 下载队列
const downloadQueue = [];
const MAX_CONCURRENT = 3;
let activeCount = 0;
let queueIdCounter = 0;

/**
 * 初始化 i18next
 */
async function initI18n() {
  const enTranslation = require("../Plugin/_locales/en.json");
  const zhCNTranslation = require("../Plugin/_locales/zh_CN.json");

  await i18next.init({
    lng: eagle.app.locale || "en",
    fallbackLng: "en",
    resources: {
      en: { translation: enTranslation },
      zh_CN: { translation: zhCNTranslation },
    },
  });
  
  // 将 i18next 设置为全局变量，供其他模块使用
  global.i18next = i18next;
}

/**
 * 应用翻译到 UI 元素
 */
function applyTranslations() {
  const appName = document.getElementById("appName");
  if (appName) appName.textContent = i18next.t("ui.appTitle");

  const urlInput = document.getElementById("urlInput");
  if (urlInput) urlInput.placeholder = i18next.t("ui.inputPlaceholder");

  const pinButton = document.getElementById("pinButton");
  if (pinButton) pinButton.title = i18next.t("ui.pin");

  const pasteButton = document.getElementById("pasteButton");
  if (pasteButton) pasteButton.title = i18next.t("ui.paste");
}

/**
 * 初始化插件
 */
eagle.onPluginCreate(async (plugin) => {
  await initI18n();
  applyTranslations();
  ui.updateTheme();
  setupEventListeners();
  setupWindowState();
  startIngestBridge();
  downloader.setQualityPrefs({
    resolution: getMaxResolutionPref(),
    framerate: getMaxFrameratePref(),
  });
  downloader.setThreadCount(getThreadCountPref());
  await initializeBinaries();
});

/**
 * 处理主题变更
 */
eagle.onThemeChanged(() => {
  ui.updateTheme();
});

/**
 * 设置 UI 事件监听器
 */
function setupEventListeners() {
  document.getElementById("closeButton").addEventListener("click", () => {
    saveWindowSize();
    window.close();
  });

  setupPinButton();

  document.getElementById("depsEntryBtn").addEventListener("click", openDepsPage);
  document.getElementById("depsBackBtn").addEventListener("click", closeDepsPage);

  document.getElementById("tabBtnSettings")?.addEventListener("click", () => {
    ui.switchSubpageTab("settings");
  });
  document.getElementById("tabBtnDeps")?.addEventListener("click", () => {
    ui.switchSubpageTab("dependencies");
  });

  // 自动设置 Eagle 数据来源切换
  const autoAddToggle = document.getElementById("autoAddSourceToggle");
  if (autoAddToggle) {
    autoAddToggle.addEventListener("change", (e) => {
      setAutoAddSourcePref(e.target.checked);
    });
  }

  // 清晰度上限选择切换
  const maxResSelect = document.getElementById("maxResolutionSelect");
  if (maxResSelect) {
    maxResSelect.addEventListener("change", (e) => {
      setMaxResolutionPref(e.target.value);
    });
  }

  // 帧率上限选择切换
  const maxFpsSelect = document.getElementById("maxFramerateSelect");
  if (maxFpsSelect) {
    maxFpsSelect.addEventListener("change", (e) => {
      setMaxFrameratePref(e.target.value);
    });
  }

  // 下载线程数切换
  const threadSelect = document.getElementById("threadCountSelect");
  if (threadSelect) {
    threadSelect.addEventListener("change", (e) => {
      setThreadCountPref(e.target.value);
    });
  }

  // yt-dlp 操作按钮事件委托
  document.getElementById("ytdlpActions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ytdlp-action]");
    if (btn) handleYtdlpAction(btn.dataset.ytdlpAction);
  });

  // ffmpeg 操作按钮事件委托（触发 Eagle 官方 FFmpeg 依赖安装弹窗或跳转商店）
  const ffmpegActions = document.getElementById("ffmpegActions");
  if (ffmpegActions) {
    ffmpegActions.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-ffmpeg-action]");
      if (btn && btn.dataset.ffmpegAction === "open-store") {
        openEagleFfmpegStore();
      }
    });
  }

  document.addEventListener("startDownload", (e) => {
    addToQueue(e.detail.url);
  });

  // 下载列表事件委托（重试、复制链接）
  document.querySelector(".download-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);
    if (action === "retry") retryDownload(id);
    if (action === "copyError") copyError(id);
    if (action === "copy") copyUrl(id);
    if (action === "delete") deleteDownloadItem(id);
  });
}

/**
 * 打开 Eagle 官方 FFmpeg 依赖安装弹窗或应用商店页面
 */
async function openEagleFfmpegStore() {
  if (typeof eagle !== "undefined" && eagle.extraModule && eagle.extraModule.ffmpeg && typeof eagle.extraModule.ffmpeg.install === "function") {
    try {
      await eagle.extraModule.ffmpeg.install();
      return;
    } catch (e) {}
  }
  const isZh = eagle.app.locale && eagle.app.locale.startsWith("zh");
  const url = isZh
    ? "https://community-cn.eagle.cool/plugin/detail/eagle-plugin-ffmpeg"
    : "https://community.eagle.cool/plugin/detail/eagle-plugin-ffmpeg";
  try {
    const { shell } = require("electron");
    shell.openExternal(url);
  } catch (e) {
    window.open(url, "_blank");
  }
}

/**
 * 初始化二进制文件
 * yt-dlp 和 ffmpeg 均为必需依赖，缺失时进入依赖管理页（门槛模式）
 */
async function initializeBinaries() {
  if (depsReady()) {
    isInitialized = true;
    initializeMainUI();
    // 后台检查 yt-dlp 是否有新版本，有则提示用户（齿轮红点）
    checkForUpdateAndNotify();
    return;
  }

  // 缺少必要依赖：进入依赖管理页门槛模式，装齐后自动进入主界面
  ui.showDepsPage({
    tab: "dependencies",
    gating: true,
    autoAddSourcePref: getAutoAddSourcePref(),
    maxResolutionPref: getMaxResolutionPref(),
    maxFrameratePref: getMaxFrameratePref(),
    threadCountPref: getThreadCountPref(),
  });
  ui.updateDepsBadge(true);
  loadDepsInfo();
}

/**
 * 是否已具备使用插件所需的全部依赖（yt-dlp + ffmpeg）
 */
function depsReady() {
  return isYtDlpInstalled() && !!getFfmpegSource();
}

/**
 * 依赖状态变化后调用：
 * - 已就绪且尚未初始化 → 退出门槛模式，进入主界面
 * - 未就绪 → 锁定依赖页（门槛模式）
 */
function refreshDepsGatingState() {
  if (depsReady()) {
    if (!isInitialized) {
      isInitialized = true;
      ui.hideDepsPage();
      initializeMainUI();
      checkForUpdateAndNotify();
    } else {
      getYtDlpUpdateInfo().then(({ hasUpdate }) => {
        ui.updateDepsBadge(hasUpdate);
      }).catch(() => {
        ui.updateDepsBadge(false);
      });
    }
  } else {
    isInitialized = false;
    ui.setDepsGating(true);
    ui.updateDepsBadge(true);
  }
}

/**
 * 初始化主 UI
 */
function initializeMainUI() {
  ui.showMainUI();
  ui.setupInputBar();
  const urlInput = document.getElementById("urlInput");
  if (urlInput) urlInput.focus();
}

/**
 * 添加下载任务到队列
 */
function addToQueue(url) {
  if (!isInitialized) return;

  const item = {
    id: ++queueIdCounter,
    url,
    title: url,
    state: "waiting",
    progress: 0,
    speed: "",
    eta: "",
    phase: null,
    processingPercent: undefined,
    error: null,
  };

  downloadQueue.push(item);
  ui.appendQueueItem(item);
  processQueue();
}

/**
 * 处理队列，启动等待中的任务（最多 MAX_CONCURRENT 个并发）
 */
function processQueue() {
  while (activeCount < MAX_CONCURRENT) {
    const nextItem = downloadQueue.find((item) => item.state === "waiting");
    if (!nextItem) break;
    activeCount++;
    executeDownload(nextItem);
  }
}

/**
 * 将下载失败的底层异常转换为对用户友好的错误提示
 */
function formatDownloadError(error, url) {
  if (error?.code === 'ENETBOUNDARY') {
    return i18next.t("error.blockedAddress");
  }
  if (isNetworkError(error)) {
    return i18next.t("error.networkUnavailable");
  }
  const msg = error?.message || '';
  if (/Unsupported URL/i.test(msg)) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname === 'dribbble.com' || hostname.endsWith('.dribbble.com')) {
        return i18next.t("error.dribbbleProtected");
      }
    } catch {}
    return i18next.t("error.unsupportedUrl");
  }
  if (/Video unavailable|This video is unavailable|Unable to download video/i.test(msg)) {
    return i18next.t("error.videoUnavailable");
  }
  if (/Private video|This video is private|Sign in to confirm/i.test(msg)) {
    return i18next.t("error.privateVideo");
  }
  return msg || i18next.t("download.failed");
}

/**
 * 执行单个下载任务
 */
async function executeDownload(item) {
  try {
    item.state = "preparing";
    ui.updateQueueItem(item.id, item);

    const videoInfo = await downloader.getVideoInfo(item.url);
    item.title = videoInfo.title || i18next.t("error.untitledVideo");
    item.state = "downloading";
    item.phase = null;
    item.processingPercent = undefined;
    item.eta = "";
    ui.updateQueueItem(item.id, item);

    const results = await downloader.downloadVideo(
      item.url,
      (progress) => {
        if (progress.phase) {
          item.phase = progress.phase;
          item.processingPercent = undefined;
        }
        if (typeof progress.processingPercent === "number") item.processingPercent = progress.processingPercent;
        if (typeof progress.percent === "number" && !progress.phase) item.progress = progress.percent;
        if (typeof progress.currentSpeed === "string") item.speed = progress.currentSpeed;
        if (typeof progress.eta === "string") item.eta = progress.eta;
        ui.updateQueueItem(item.id, item);
      },
      null,
      videoInfo
    );

    item.state = "completed";
    item.progress = 100;
    item.speed = "";
    item.eta = "";
    item.phase = null;
    item.processingPercent = undefined;
    ui.updateQueueItem(item.id, item);

    for (const result of results) {
      const sourceUrl = getAutoAddSourcePref() ? item.url : undefined;
      await importToEagle(result.path, result.metadata, sourceUrl);
      downloader.cleanup(result.path);
    }
  } catch (error) {
    item.state = "error";
    item.error = formatDownloadError(error, item.url);
    ui.updateQueueItem(item.id, item);
  } finally {
    activeCount--;
    processQueue();
  }
}

/**
 * 重试失败的下载任务
 */
function retryDownload(id) {
  const item = downloadQueue.find((item) => item.id === id);
  if (!item || item.state !== "error") return;

  item.state = "waiting";
  item.progress = 0;
  item.error = null;
  item.speed = "";
  item.eta = "";
  item.phase = null;
  item.processingPercent = undefined;
  ui.updateQueueItem(item.id, item);
  processQueue();
}

/**
 * 复制下载任务的错误信息
 */
async function copyError(id) {
  const item = downloadQueue.find((item) => item.id === id);
  if (!item || !item.error) return;
  try {
    await navigator.clipboard.writeText(item.error);
    ui.showCopiedErrorFeedback(id);
  } catch (error) {
    console.error("Failed to copy error:", error);
  }
}

/**
 * 后台检查 yt-dlp 版本，有新版本时更新齿轮红点提示
 */
async function checkForUpdateAndNotify() {
  try {
    const { hasUpdate } = await getYtDlpUpdateInfo();
    ui.updateDepsBadge(hasUpdate || !depsReady());
  } catch (e) {
    ui.updateDepsBadge(!depsReady());
  }
}

/**
 * 打开设置与依赖管理页面并加载信息
 */
function openDepsPage() {
  ui.showDepsPage({
    tab: "settings",
    autoAddSourcePref: getAutoAddSourcePref(),
    maxResolutionPref: getMaxResolutionPref(),
    maxFrameratePref: getMaxFrameratePref(),
    threadCountPref: getThreadCountPref(),
  });
  loadDepsInfo();
}

/**
 * 关闭依赖管理页面，回到主界面
 */
function closeDepsPage() {
  ui.hideDepsPage();
}

/**
 * 加载并展示各依赖的当前状态
 */
function loadDepsInfo(options = {}) {
  const ffmpegSource = getFfmpegSource();
  const ytdlpInstalled = isYtDlpInstalled();

  if (ffmpegSource === "eagle") {
    ui.updateFfmpegCard("eagle", {});
  } else {
    ui.updateFfmpegCard("missing", {});
  }

  if (!ytdlpInstalled) {
    ui.updateYtdlpCard("missing");
    return;
  }

  if (options.ytdlpKnownLatest) {
    ui.updateYtdlpCard("latest", { version: options.ytdlpKnownLatest });
  } else {
    loadYtdlpUpdateStatus();
  }
}

/**
 * 检查 yt-dlp 是否有更新并渲染对应卡片状态
 */
function loadYtdlpUpdateStatus() {
  ui.updateYtdlpCard("installed", { checkingUpdate: true });
  const latestVersion = getLatestYtDlpVersion();

  getInstalledYtDlpVersion().then((installedVersion) => {
    if (!installedVersion) { ui.updateYtdlpCard("missing"); return; }
    if (installedVersion !== latestVersion) {
      ui.updateYtdlpCard("outdated", { installedVersion, latestVersion });
    } else {
      ui.updateYtdlpCard("latest", { version: installedVersion });
    }
  }).catch(() => {});
}

/**
 * 执行 yt-dlp 操作：install / update / reinstall / uninstall
 */
async function handleYtdlpAction(action) {
  if (action === "uninstall") {
    uninstallYtDlp();
    ui.updateYtdlpCard("missing");
    refreshDepsGatingState();
    return;
  }

  const statusKey = {
    install: "deps.installing",
    update: "deps.updating",
    reinstall: "deps.reinstalling",
  }[action] || "deps.updating";

  const doneKey = {
    install: "deps.doneInstalled",
    update: "deps.doneUpdated",
    reinstall: "deps.doneReinstalled",
  }[action] || "deps.doneInstalled";

  const statusText = i18next.t(statusKey);
  ui.updateYtdlpCard("busy", { statusText, percent: 0 });

  try {
    await downloadYtDlp((progress) => {
      ui.updateYtdlpCard("busy", { statusText, percent: progress });
    });

    const version = await getInstalledYtDlpVersion();
    ui.updateYtdlpCard("done", { statusText: i18next.t(doneKey), version });

    setTimeout(() => {
      loadDepsInfo({ ytdlpKnownLatest: version });
      refreshDepsGatingState();
    }, 1500);
  } catch (e) {
    const message = isNetworkError(e) ? i18next.t("error.networkUnavailable") : e.message;
    ui.updateYtdlpCard("error", { message, retryAction: action });
  }
}

/**
 * 复制下载任务的 URL
 */
async function copyUrl(id) {
  const item = downloadQueue.find((item) => item.id === id);
  if (!item) return;

  try {
    await navigator.clipboard.writeText(item.url);
    ui.showCopiedFeedback(id);
  } catch (error) {
    console.error("Failed to copy URL:", error);
  }
}

/**
 * 删除一条下载记录（正在下载的任务不允许删除）
 */
function deleteDownloadItem(id) {
  const index = downloadQueue.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  if (!ui.canDeleteQueueItem(downloadQueue[index])) return;
  downloadQueue.splice(index, 1);
  ui.removeQueueItem(id);
}

// ---------------------------------------------------------------------------
// 窗口尺寸记忆
// ---------------------------------------------------------------------------
const WINDOW_SIZE_KEY = "evd.windowSize";

function getSavedWindowSize() {
  try {
    const raw = localStorage.getItem(WINDOW_SIZE_KEY);
    if (!raw) return null;
    const size = JSON.parse(raw);
    const width = Number(size && size.width);
    const height = Number(size && size.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (width < 320 || height < 320 || width > 4000 || height > 4000) return null;
    return { width: Math.round(width), height: Math.round(height) };
  } catch (e) {
    return null;
  }
}

function saveWindowSize() {
  try {
    const width = Math.round(window.innerWidth);
    const height = Math.round(window.innerHeight);
    if (width > 0 && height > 0) {
      localStorage.setItem(WINDOW_SIZE_KEY, JSON.stringify({ width, height }));
    }
  } catch (e) {}
}

/**
 * 启动时恢复上次窗口尺寸，并在缩放 / 关闭时保存
 */
function setupWindowState() {
  const saved = getSavedWindowSize();
  const api = typeof eagle !== "undefined" && eagle.window ? eagle.window : null;
  if (saved && api && typeof api.setSize === "function") {
    Promise.resolve().then(async () => {
      try {
        const current = typeof api.getSize === "function" ? await api.getSize() : null;
        const width = Array.isArray(current) ? current[0] : current && current.width;
        const height = Array.isArray(current) ? current[1] : current && current.height;
        if (width == null || height == null || Math.abs(width - saved.width) > 2 || Math.abs(height - saved.height) > 2) {
          await api.setSize(saved.width, saved.height);
        }
      } catch (e) {}
    });
  }

  let saveTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowSize, 300);
  });
  window.addEventListener("beforeunload", saveWindowSize);
}

// ---------------------------------------------------------------------------
// 本机桥接：接收浏览器扩展推送的链接（仅监听 127.0.0.1）
// ---------------------------------------------------------------------------
const INGEST_PORT = 43110;
const INGEST_ALLOWED_HOSTS = ["x.com", "twitter.com", "mobile.twitter.com", "video.twimg.com", "pbs.twimg.com"];

function isIngestUrlAllowed(value) {
  try {
    const parsed = new URL(String(value || ""));
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return INGEST_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed));
  } catch (e) {
    return false;
  }
}

function writeBridgeResponse(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function startIngestBridge() {
  if (startIngestBridge.server) return startIngestBridge.server;
  let http;
  try {
    http = require("http");
  } catch (e) {
    return null;
  }

  const server = http.createServer((req, res) => {
    const pathname = String(req.url || "/").split("?")[0];

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (pathname === "/ping") {
      writeBridgeResponse(res, 200, { ok: true, app: "eagle-video-downloader", ready: !!isInitialized });
      return;
    }

    if (pathname !== "/ingest" || req.method !== "POST") {
      writeBridgeResponse(res, 404, { ok: false, error: "not-found" });
      return;
    }

    let body = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16 * 1024) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on("end", () => {
      if (tooLarge) return;
      let payload = null;
      try {
        payload = JSON.parse(body || "{}");
      } catch (e) {
        payload = null;
      }
      const target = payload && typeof payload.url === "string" ? payload.url.trim() : "";
      if (!target || !isIngestUrlAllowed(target)) {
        writeBridgeResponse(res, 400, { ok: false, error: "invalid-url" });
        return;
      }
      if (!isInitialized) {
        writeBridgeResponse(res, 503, { ok: false, error: "not-ready" });
        return;
      }
      addToQueue(target);
      try {
        if (eagle.window && typeof eagle.window.restore === "function") eagle.window.restore();
        if (eagle.window && typeof eagle.window.focus === "function") eagle.window.focus();
      } catch (e) {}
      writeBridgeResponse(res, 200, { ok: true, url: target });
    });
    req.on("error", () => {});
  });

  server.on("error", (error) => {
    console.warn("[ingest] bridge error:", error && error.message);
  });
  server.listen(INGEST_PORT, "127.0.0.1");
  startIngestBridge.server = server;
  return server;
}

/**
 * Always-on-top toggle (state persisted in localStorage).
 */
function setupPinButton() {
  const pinButton = document.getElementById("pinButton");
  if (!pinButton) return;

  const STORAGE_KEY = "evd.alwaysOnTop";
  const api = typeof eagle !== "undefined" && eagle.window ? eagle.window : null;

  const render = (pinned) => {
    pinButton.classList.toggle("active", pinned);
    pinButton.setAttribute("aria-pressed", pinned ? "true" : "false");
  };

  const apply = async (pinned) => {
    try {
      if (api && typeof api.setAlwaysOnTop === "function") {
        await api.setAlwaysOnTop(pinned);
      }
    } catch (e) {
      console.error("Failed to set always on top:", e);
      return;
    }
    render(pinned);
    try {
      localStorage.setItem(STORAGE_KEY, pinned ? "1" : "0");
    } catch (e) {}
  };

  let pinned = false;
  try {
    pinned = localStorage.getItem(STORAGE_KEY) === "1";
  } catch (e) {}
  render(pinned);
  if (pinned) apply(true);

  pinButton.addEventListener("click", () => {
    pinned = !pinned;
    apply(pinned);
  });
}

module.exports = {};

