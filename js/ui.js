/**
 * UI 管理模块
 * 处理用户界面交互
 */

const sankakuAuth = require("./sankaku-auth");
const twitterAuth = require("./twitter-auth");
const twitterMonitor = require("./twitter-monitor");
const { scopedKey } = require("./library-context");

const INTERVAL_CHOICE_KEY = "eagle-video-downloader.twitterIntervalChoice";

/** 读取用户上次选择的时间选项（分钟），未选过返回 null */
function getIntervalChoice() {
  try {
    const raw = localStorage.getItem(scopedKey(INTERVAL_CHOICE_KEY));
    if (raw === null) return null;
    return Number(raw) || 0;
  } catch (e) {
    return null;
  }
}

function setIntervalChoice(minutes) {
  try {
    localStorage.setItem(scopedKey(INTERVAL_CHOICE_KEY), String(Number(minutes) || 0));
  } catch (e) {
    // ignore
  }
}

/**
 * 主题：跟随 Eagle 或手动选择
 */
const THEME_FOLLOW_KEY = "eagle-video-downloader.followEagleTheme";
const THEME_KEY = "eagle-video-downloader.theme";
const THEME_NAMES = ["light", "lightgray", "gray", "dark", "blue", "purple"];

function getFollowEagleTheme() {
  const value = localStorage.getItem(THEME_FOLLOW_KEY);
  return value === null ? true : value === "true";
}

function getManualTheme() {
  const value = localStorage.getItem(THEME_KEY);
  return THEME_NAMES.includes(value) ? value : "light";
}

function eagleThemeName() {
  const support = {
    AUTO: eagle.app.isDarkColors() ? "gray" : "light",
    LIGHT: "light",
    LIGHTGRAY: "lightgray",
    GRAY: "gray",
    DARK: "dark",
    BLUE: "blue",
    PURPLE: "purple",
  };
  try {
    return support[String(eagle.app.theme).toUpperCase()] || "light";
  } catch (e) {
    return "light";
  }
}

function currentThemeName() {
  return getFollowEagleTheme() ? eagleThemeName() : getManualTheme();
}

function setFollowEagleTheme(value) {
  localStorage.setItem(THEME_FOLLOW_KEY, String(!!value));
  // 关闭跟随时，把 Eagle 当前主题记为手动主题，避免跳回默认值
  if (!value) localStorage.setItem(THEME_KEY, eagleThemeName());
  updateTheme();
}

function setManualTheme(name) {
  if (!THEME_NAMES.includes(name)) return;
  localStorage.setItem(THEME_KEY, name);
  localStorage.setItem(THEME_FOLLOW_KEY, "false");
  updateTheme();
}

function syncThemeControls(themeName) {
  const follow = getFollowEagleTheme();
  const toggle = document.getElementById("followThemeToggle");
  if (toggle) toggle.checked = follow;
  const active = themeName || currentThemeName();
  document.querySelectorAll(".theme-swatch").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === active);
    btn.classList.toggle("disabled", follow);
  });
}

let themeControlsBound = false;

function setupThemeControls() {
  syncThemeControls();
  if (themeControlsBound) return;
  themeControlsBound = true;
  const toggle = document.getElementById("followThemeToggle");
  if (toggle) {
    toggle.addEventListener("change", () => setFollowEagleTheme(toggle.checked));
  }
  document.querySelectorAll(".theme-swatch").forEach((btn) => {
    btn.addEventListener("click", () => setManualTheme(btn.dataset.theme));
  });
}

/**
 * 应用当前主题（跟随 Eagle 或手动选择）
 */
function updateTheme() {
  const themeName = currentThemeName();
  const htmlEl = document.querySelector("html");

  htmlEl.classList.add("no-transition");
  htmlEl.setAttribute("theme", themeName);
  try {
    htmlEl.setAttribute("platform", eagle.app.platform);
  } catch (e) {
    // Eagle API 尚未就绪时忽略
  }
  htmlEl.classList.remove("no-transition");
  syncThemeControls(themeName);
}

/**
 * 显示主 UI
 */
function showMainUI() {
  document.getElementById("mainContainer")?.classList.remove("hidden");
}

/**
 * 验证 URL 格式
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

/**
 * 设置输入栏事件
 */
function setupInputBar() {
  const urlInput = document.getElementById("urlInput");
  const addButton = document.getElementById("addButton");

  if (!urlInput || !addButton) return;

  addButton.classList.add("disabled");

  urlInput.addEventListener("input", () => {
    setInputBarState("idle");
    addButton.classList.toggle("disabled", urlInput.value.trim().length === 0);
  });

  const handleSubmit = () => {
    const url = urlInput.value.trim();
    if (!url) return;

    if (!isValidUrl(url)) {
      setInputBarState("error", i18next.t("error.invalidUrl"));
      return;
    }

    document.dispatchEvent(new CustomEvent("startDownload", { detail: { url } }));
    urlInput.value = "";
    addButton.classList.add("disabled");
    setInputBarState("idle");
  };

  addButton.addEventListener("click", handleSubmit);

  urlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSubmit();
  });

  const pasteButton = document.getElementById("pasteButton");
  if (pasteButton) {
    pasteButton.addEventListener("click", () => {
      let clipboardText = "";
      try {
        clipboardText = eagle && eagle.clipboard && typeof eagle.clipboard.readText === "function"
          ? eagle.clipboard.readText()
          : "";
      } catch (e) {
        clipboardText = "";
      }
      clipboardText = String(clipboardText || "").trim();
      const urlMatch = clipboardText.match(/https:\/\/[^\s"'<>]+/i);
      const value = urlMatch ? urlMatch[0] : clipboardText;
      if (!value) return;
      urlInput.value = value;
      urlInput.dispatchEvent(new Event("input", { bubbles: true }));
      // 粘贴后直接开始下载
      handleSubmit();
    });
  }
}

/**
 * 设置输入栏状态（idle / error）
 */
function setInputBarState(state, errorMessage = "") {
  const addButton = document.getElementById("addButton");
  const buttonImg = addButton?.querySelector("img");
  const tooltip = addButton?.querySelector(".error-tooltip");

  addButton?.classList.remove("error");
  if (tooltip) tooltip.textContent = "";
  if (buttonImg) buttonImg.src = "assets/icon_download.svg";

  if (state === "error") {
    addButton?.classList.add("error");
    if (tooltip && errorMessage) tooltip.textContent = errorMessage;
    if (buttonImg) buttonImg.src = "assets/icon_error.svg";
  }
}

/**
 * 追加单个队列项到列表末尾
 */
/**
 * Whether a queue record may be removed (active downloads are protected).
 */
function canDeleteQueueItem(item) {
  return !!item && item.state !== "preparing" && item.state !== "downloading";
}

/**
 * Remove a queue record from the list.
 */
function removeQueueItem(id) {
  const el = document.querySelector(`.download-item[data-id="${id}"]`);
  if (el) el.remove();
}

function appendQueueItem(item) {
  const list = document.querySelector(".download-list");
  if (!list) return;
  list.appendChild(createQueueItemEl(item));
  // 自动滚动到底部
  list.scrollTop = list.scrollHeight;
}

/**
 * 创建队列项 DOM 元素
 */
function createQueueItemEl(item) {
  const el = document.createElement("div");
  el.className = `download-item ${item.state}`;
  el.dataset.id = item.id;

  const isError = item.state === "error";
  el.innerHTML = `
    <button class="item-delete" data-action="delete" data-id="${item.id}" title="${escapeHtml(i18next.t("queue.remove"))}">&#215;</button>
    <div class="item-title">${escapeHtml(item.title)}</div>
    <div class="item-progress-bar">
      <div class="item-progress-fill" style="width: ${item.progress}%"></div>
    </div>
    <div class="item-footer">
      <span class="item-meta">${escapeHtml(getMetaText(item))}</span>
      <div class="item-actions${isError ? "" : " hidden"}">
        <button class="item-action-btn" data-action="retry" data-id="${item.id}">${i18next.t("queue.retry")}</button>
        <button class="item-action-btn" data-action="copyError" data-id="${item.id}" id="copy-error-btn-${item.id}">${i18next.t("queue.copyError")}</button>
        <button class="item-action-btn" data-action="copy" data-id="${item.id}" id="copy-btn-${item.id}">${i18next.t("queue.copyUrl")}</button>
      </div>
    </div>
  `;

  return el;
}

/**
 * 局部更新队列项（避免全量重渲染）
 */
function updateQueueItem(id, data) {
  const el = document.querySelector(`.download-item[data-id="${id}"]`);
  if (!el) return;

  el.className = `download-item ${data.state}`;

  const titleEl = el.querySelector(".item-title");
  if (titleEl) titleEl.textContent = data.title;

  const bar = el.querySelector(".item-progress-bar");
  const fill = el.querySelector(".item-progress-fill");
  const isProcessing = data.state === "downloading" && (data.phase === "merge" || data.phase === "convert");
  const hasProcessingPercent = isProcessing && typeof data.processingPercent === "number";
  const width = isProcessing ? (hasProcessingPercent ? data.processingPercent : 100) : data.progress;
  if (bar) bar.classList.toggle("indeterminate", isProcessing && !hasProcessingPercent);
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, width || 0))}%`;

  const footer = el.querySelector(".item-footer");
  if (footer) {
    const meta = footer.querySelector(".item-meta");
    if (meta) meta.textContent = getMetaText(data);
    const actions = footer.querySelector(".item-actions");
    if (actions) actions.classList.toggle("hidden", data.state !== "error");
    const deleteBtn = el.querySelector(".item-delete");
    if (deleteBtn) deleteBtn.disabled = !canDeleteQueueItem(data);
  }
}

/**
 * 显示"已复制"反馈（复制链接按钮）
 */
function showCopiedFeedback(id) {
  const btn = document.getElementById(`copy-btn-${id}`);
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = i18next.t("queue.copied");
  setTimeout(() => { btn.textContent = original; }, 1500);
}

/**
 * 显示"已复制"反馈（复制错误按钮）
 */
function showCopiedErrorFeedback(id) {
  const btn = document.getElementById(`copy-error-btn-${id}`);
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = i18next.t("queue.copied");
  setTimeout(() => { btn.textContent = original; }, 1500);
}

/**
 * 根据状态生成元信息文本（仅 error 时使用）
 */
function getMetaText(item) {
  if (item.state === "error") {
    return item.error || i18next.t("queue.error");
  }
  if (item.state === "completed") {
    return i18next.t("queue.completed");
  }
  if (item.phase === "merge" || item.phase === "convert") {
    const label = i18next.t(item.phase === "merge" ? "queue.merging" : "queue.converting");
    return typeof item.processingPercent === "number" ? `${label} ${Math.round(item.processingPercent)}%` : `${label}...`;
  }
  if (item.state === "downloading") {
    const parts = [];
    if (typeof item.progress === "number") parts.push(`${item.progress.toFixed(1)}%`);
    if (item.speed) parts.push(item.speed);
    if (item.eta) parts.push(`${i18next.t("queue.eta")} ${item.eta}`);
    return parts.join(" \u00B7 ");
  }
  return "";
}

/**
 * HTML 转义
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDepCardEls(prefix) {
  return {
    statusEl:     document.getElementById(`${prefix}Badge`),
    detailEl:     document.getElementById(`${prefix}Detail`),
    progressWrap: document.getElementById(`${prefix}ProgressWrap`),
    progressFill: document.getElementById(`${prefix}ProgressFill`),
    actionsEl:    document.getElementById(`${prefix}Actions`),
  };
}

/**
 * 更新设置按钮指示红点状态
 * @param {boolean} hasNotice
 */
function updateDepsBadge(hasNotice) {
  const badge = document.getElementById("depsBadge");
  if (!badge) return;
  badge.classList.toggle("hidden", !hasNotice);
}

/**
 * 切换子页面分栏（Settings / Auto Tags / Dependencies / Accounts）
 * @param {'settings' | 'tags' | 'dependencies' | 'account'} tabName
 */
function switchSubpageTab(tabName) {
  const tabs = {
    settings: { btn: document.getElementById("tabBtnSettings"), panel: document.getElementById("settingsPanel") },
    tags: { btn: document.getElementById("tabBtnTags"), panel: document.getElementById("tagsPanel") },
    dependencies: { btn: document.getElementById("tabBtnDeps"), panel: document.getElementById("depsPanel") },
    account: { btn: document.getElementById("tabBtnAccount"), panel: document.getElementById("accountPanel") },
  };

  for (const [name, item] of Object.entries(tabs)) {
    item.btn?.classList.toggle("active", name === tabName);
    item.panel?.classList.toggle("hidden", name !== tabName);
  }
}

/** 常驻显示推特账号：头像 / 昵称 / @用户名 / 数字 ID */
function renderTwitterProfile(profile) {
  const box = document.getElementById("twitterProfile");
  if (!box) return;
  const data = profile || twitterMonitor.getSavedProfile();
  if (!data || (!data.screenName && !data.name)) {
    box.classList.add("hidden");
    return;
  }
  const avatar = document.getElementById("twitterAvatar");
  const name = document.getElementById("twitterName");
  const handle = document.getElementById("twitterHandle");
  const avatarSrc = data.avatarData || data.avatar;

  if (avatar) {
    if (avatarSrc) {
      avatar.onerror = () => {
        avatar.style.display = "none";
      };
      avatar.src = avatarSrc;
      avatar.style.display = "";
    } else {
      avatar.removeAttribute("src");
      avatar.style.display = "none";
    }
  }
  if (name) name.textContent = data.name || data.screenName || "";
  if (handle) handle.textContent = data.screenName ? "@" + data.screenName : "";
  box.classList.remove("hidden");
}

/** 回填「下载点赞 / 下载收藏」复选框 */
function applySourceCheckboxes() {
  const likesBox = document.getElementById("twitterMonitorLikes");
  const bookmarksBox = document.getElementById("twitterMonitorBookmarks");
  const prefs = twitterMonitor.getPrefs();
  if (likesBox) likesBox.checked = prefs.likes !== false;
  if (bookmarksBox) bookmarksBox.checked = prefs.bookmarks !== false;
}

/** 把监控间隔（毫秒）回填到时间下拉框 */
/** 让时间下拉框宽度等于最长选项文字的宽度 */
function fitIntervalSelectWidth() {
  const select = document.getElementById("twitterMonitorInterval");
  if (!select) return;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    const style = typeof getComputedStyle === "function" ? getComputedStyle(select) : null;
    const font = style && style.font ? style.font : "12px sans-serif";
    context.font = font;
    let maxWidth = 0;
    for (const option of Array.from(select.options)) {
      maxWidth = Math.max(maxWidth, context.measureText(option.textContent || "").width);
    }
    if (maxWidth > 0) {
      const width = Math.ceil(maxWidth + 44);
      select.style.width = width + "px";
      const column = select.parentElement;
      if (column && column.classList.contains("setting-monitor-right")) {
        column.style.width = width + "px";
      }
    }
  } catch (e) {
    // 忽略测量失败
  }
}

function applyIntervalSelect() {
  const select = document.getElementById("twitterMonitorInterval");
  if (!select) return;

  const prefs = twitterMonitor.getPrefs();
  const savedChoice = getIntervalChoice();
  const minutes =
    savedChoice === null ? (prefs.enabled ? Math.max(2, Math.round((prefs.ms || 600000) / 60000)) : 0) : savedChoice;
  const values = Array.from(select.options).map((option) => Number(option.value));
  let chosen = values.includes(minutes) ? minutes : 0;
  if (!chosen && minutes) {
    const positives = values.filter((value) => value > 0);
    chosen = positives.reduce((best, value) => (Math.abs(value - minutes) < Math.abs(best - minutes) ? value : best), positives[0]);
  }
  select.value = String(chosen || 0);
  fitIntervalSelectWidth();
}

/** 资源库切换后，重新从当前资源库读取账号与监控设置 */
function refreshAccountFields() {
  const sankakuInput = document.getElementById("sankakuAuthInput");
  if (sankakuInput) {
    sankakuInput.value = sankakuAuth.getStoredAuth();
    autoGrowTextarea(sankakuInput);
  }
  const sankakuStatus = document.getElementById("sankakuAuthStatus");
  if (sankakuStatus) sankakuStatus.textContent = "";

  const token = document.getElementById("twitterAuthToken");
  const ct0 = document.getElementById("twitterCt0");
  if (token || ct0) {
    const parts = twitterAuth.splitCookie();
    if (token) token.value = parts.authToken;
    if (ct0) ct0.value = parts.ct0;
  }

  applyIntervalSelect();
  applySourceCheckboxes();

  const status = document.getElementById("twitterAuthStatus");
  if (status) {
    status.textContent = twitterAuth.hasAuth() ? i18next.t("deps.twitterAuthReady") : "";
  }
  renderTwitterProfile();
}

/** 让 textarea 跟随内容高度（不出现滚动条） */
function autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.max(38, el.scrollHeight) + "px";
}

/**
 * 显示偏好设置与依赖管理页面
 * @param {Object} opts
 * @param {'settings' | 'tags' | 'dependencies' | 'account'} opts.tab - 初始标签页
 * @param {boolean} opts.gating - 是否为「门槛模式」（依赖未就绪，强制停留在此页，隐藏返回按钮）
 * @param {boolean} opts.autoAddSourcePref - 是否自动设置 Eagle 数据来源
 * @param {boolean} opts.xhsTagsPref - 小红书下载是否写入话题标签
 */
function showDepsPage({ tab = "settings", gating = false, autoAddSourcePref = true, xhsTagsPref = true, maxResolutionPref = "auto", maxFrameratePref = "auto", threadCountPref = "auto" } = {}) {
  // 填充静态文本
  const tabBtnSettings = document.getElementById("tabBtnSettings");
  const tabBtnTags = document.getElementById("tabBtnTags");
  const tabBtnDeps = document.getElementById("tabBtnDeps");
  const tabBtnAccount = document.getElementById("tabBtnAccount");
  const autoAddLabel = document.getElementById("autoAddSourceLabel");
  const autoAddHint = document.getElementById("autoAddSourceHint");
  const autoAddToggle = document.getElementById("autoAddSourceToggle");
  const xhsTagsLabel = document.getElementById("xhsTagsLabel");
  const xhsTagsHint = document.getElementById("xhsTagsHint");
  const xhsTagsToggle = document.getElementById("xhsTagsToggle");
  const tagsTitle = document.getElementById("tagsTitle");
  const tagsNote = document.getElementById("tagsNote");
  const maxResLabel = document.getElementById("maxResolutionLabel");
  const maxResHint = document.getElementById("maxResolutionHint");
  const maxResSelect = document.getElementById("maxResolutionSelect");
  const maxFpsLabel = document.getElementById("maxFramerateLabel");
  const maxFpsHint = document.getElementById("maxFramerateHint");
  const maxFpsSelect = document.getElementById("maxFramerateSelect");
  const threadLabel = document.getElementById("threadCountLabel");
  const threadHint = document.getElementById("threadCountHint");
  const threadSelect = document.getElementById("threadCountSelect");
  const notice = document.getElementById("depsNotice");
  const ytdlpDesc = document.getElementById("ytdlpDesc");
  const ffmpegDesc = document.getElementById("ffmpegDesc");
  const appearanceTitle = document.getElementById("appearanceTitle");
  const themeLabel = document.getElementById("themeLabel");
  const themeHint = document.getElementById("themeHint");
  const followThemeLabel = document.getElementById("followThemeLabel");
  const followThemeHint = document.getElementById("followThemeHint");

  if (tabBtnSettings) tabBtnSettings.textContent = i18next.t("deps.tabSettings");
  if (tabBtnTags) tabBtnTags.textContent = i18next.t("deps.tabTags");
  if (tabBtnDeps) tabBtnDeps.textContent = i18next.t("deps.tabDependencies");
  if (autoAddLabel) autoAddLabel.textContent = i18next.t("deps.autoAddSourceLabel");
  if (autoAddHint) autoAddHint.textContent = i18next.t("deps.autoAddSourceHint");
  if (autoAddToggle) autoAddToggle.checked = autoAddSourcePref;
  if (xhsTagsLabel) xhsTagsLabel.textContent = i18next.t("deps.xhsTagsLabel");
  if (xhsTagsHint) xhsTagsHint.textContent = i18next.t("deps.xhsTagsHint");
  if (xhsTagsToggle) xhsTagsToggle.checked = xhsTagsPref !== false;
  if (tagsTitle) tagsTitle.textContent = i18next.t("deps.tagsTitle");
  if (tagsNote) tagsNote.textContent = i18next.t("deps.tagsNote");

  if (maxResLabel) maxResLabel.textContent = i18next.t("deps.maxResolutionLabel");
  if (maxResHint) maxResHint.textContent = i18next.t("deps.maxResolutionHint");
  if (maxResSelect) {
    if (maxResSelect.options[0]) maxResSelect.options[0].textContent = i18next.t("deps.resAuto");
    maxResSelect.value = maxResolutionPref || "auto";
  }

  if (maxFpsLabel) maxFpsLabel.textContent = i18next.t("deps.maxFramerateLabel");
  if (maxFpsHint) maxFpsHint.textContent = i18next.t("deps.maxFramerateHint");
  if (maxFpsSelect) {
    if (maxFpsSelect.options[0]) maxFpsSelect.options[0].textContent = i18next.t("deps.fpsAuto");
    maxFpsSelect.value = maxFrameratePref || "auto";
  }

  if (threadLabel) threadLabel.textContent = i18next.t("deps.threadCountLabel");
  if (threadHint) threadHint.textContent = i18next.t("deps.threadCountHint");
  if (threadSelect) {
    if (threadSelect.options[0]) threadSelect.options[0].textContent = i18next.t("deps.threadAuto");
    threadSelect.value = String(threadCountPref || "auto");
  }

  const authLabel = document.getElementById("sankakuAuthLabel");
  const authHint = document.getElementById("sankakuAuthHint");
  const authInput = document.getElementById("sankakuAuthInput");
  const authSave = document.getElementById("sankakuAuthSave");
  const authClear = document.getElementById("sankakuAuthClear");

  if (authLabel) authLabel.textContent = i18next.t("deps.sankakuAuthLabel");
  if (authHint) authHint.textContent = i18next.t("deps.sankakuAuthHint");
  if (authInput) {
    authInput.value = sankakuAuth.getStoredAuth();
  }
  const sankakuTokenLabel = document.getElementById("sankakuAuthTokenLabel");
  if (sankakuTokenLabel) sankakuTokenLabel.textContent = "accessToken";
  if (tabBtnAccount) tabBtnAccount.textContent = i18next.t("deps.tabAccount");

  const twLabel = document.getElementById("twitterAuthLabel");
  const twHint = document.getElementById("twitterAuthHint");
  const twMonLabel = document.getElementById("twitterMonitorLabel");
  const twMonHint = document.getElementById("twitterMonitorHint");
  if (twLabel) twLabel.textContent = i18next.t("deps.twitterAuthLabel");
  if (twHint) twHint.textContent = i18next.t("deps.twitterAuthHint");
  if (twMonLabel) twMonLabel.textContent = i18next.t("deps.twitterMonitorLabel");
  if (twMonHint) twMonHint.textContent = i18next.t("deps.twitterMonitorHint");

  renderTwitterProfile();
  const twitterToken = document.getElementById("twitterAuthToken");
  const twitterCt0 = document.getElementById("twitterCt0");
  const twitterStatus = document.getElementById("twitterAuthStatus");
  const twitterInterval = document.getElementById("twitterMonitorInterval");
  if (twitterToken || twitterCt0) {
    const parts = twitterAuth.splitCookie();
    if (twitterToken) twitterToken.value = parts.authToken;
    if (twitterCt0) twitterCt0.value = parts.ct0;
  }
  const twitterTokenLabel = document.getElementById("twitterAuthTokenLabel");
  const twitterCt0Label = document.getElementById("twitterCt0Label");
  if (twitterTokenLabel) twitterTokenLabel.textContent = "auth_token";
  if (twitterCt0Label) twitterCt0Label.textContent = "ct0";
  if (twitterStatus && !twitterStatus.textContent) {
    twitterStatus.textContent = twitterAuth.hasAuth() ? i18next.t("deps.twitterAuthReady") : "";
  }
  if (twitterInterval) {
    const prefs = twitterMonitor.getPrefs();
    twitterInterval.value = prefs.enabled ? String(prefs.minutes) : "0";
  }
  applyIntervalSelect();
  applySourceCheckboxes();
  const likesLabel = document.getElementById("twitterMonitorLikesLabel");
  const bookmarksLabel = document.getElementById("twitterMonitorBookmarksLabel");
  if (likesLabel) likesLabel.textContent = i18next.t("deps.twitterMonitorLikesLabel");
  if (bookmarksLabel) bookmarksLabel.textContent = i18next.t("deps.twitterMonitorBookmarksLabel");
  const twSaveBtn = document.getElementById("twitterAuthSave");
  const twClearBtn = document.getElementById("twitterAuthClear");
  if (twSaveBtn) twSaveBtn.textContent = i18next.t("deps.twitterAuthSave");
  if (twClearBtn) twClearBtn.textContent = i18next.t("deps.twitterAuthClear");
  const twMinHint = document.getElementById("twitterMonitorMinHint");
  if (twMinHint) twMinHint.textContent = i18next.t("deps.twitterMonitorMinHint");
  if (authSave) authSave.textContent = i18next.t("deps.sankakuAuthSave");
  if (authClear) authClear.textContent = i18next.t("deps.sankakuAuthClear");

  if (notice) notice.textContent = i18next.t("deps.setupRequired");
  if (ytdlpDesc) ytdlpDesc.textContent = i18next.t("deps.ytdlpDesc");
  if (ffmpegDesc) ffmpegDesc.textContent = i18next.t("deps.ffmpegDesc");

  // 外观：主题与跟随 Eagle 开关
  if (appearanceTitle) appearanceTitle.textContent = i18next.t("deps.appearanceTitle");
  if (themeLabel) themeLabel.textContent = i18next.t("deps.themeLabel");
  if (themeHint) themeHint.textContent = i18next.t("deps.themeHint");
  if (followThemeLabel) followThemeLabel.textContent = i18next.t("deps.followThemeLabel");
  if (followThemeHint) followThemeHint.textContent = i18next.t("deps.followThemeHint");
  const themeTitles = {
    light: "themeLight",
    lightgray: "themeLightgray",
    gray: "themeGray",
    dark: "themeDark",
    blue: "themeBlue",
    purple: "themePurple",
  };
  document.querySelectorAll(".theme-swatch").forEach((btn) => {
    const key = themeTitles[btn.dataset.theme];
    if (key) btn.title = i18next.t(`deps.${key}`);
  });
  setupThemeControls();

  switchSubpageTab(gating ? "dependencies" : tab);

  document.getElementById("depsContainer")?.classList.remove("hidden");
  document.getElementById("mainContainer")?.classList.add("hidden");
  setDepsGating(gating);
}

/**
 * 切换依赖页的「门槛模式」：隐藏/显示返回按钮，显示/隐藏强制安装提示
 */
function setDepsGating(gating) {
  document.querySelector(".subpage-header")?.classList.toggle("hidden", gating);
  document.getElementById("depsNotice")?.classList.toggle("hidden", !gating);
  if (gating) {
    switchSubpageTab("dependencies");
  }
}

/**
 * 隐藏依赖管理页面，恢复主界面
 */
function hideDepsPage() {
  setDepsGating(false);
  document.getElementById("depsContainer")?.classList.add("hidden");
  document.getElementById("mainContainer")?.classList.remove("hidden");
}

/**
 * 更新 yt-dlp 卡片状态
 * state: 'checking' | 'latest' | 'outdated' | 'missing' | 'busy' | 'done' | 'installed' | 'error'
 * data: { version, installedVersion, latestVersion, statusText, percent, message, retryAction }
 */
function updateYtdlpCard(state, data = {}) {
  const { statusEl, detailEl, progressWrap, progressFill, actionsEl } = getDepCardEls("ytdlp");

  if (!statusEl) return;

  statusEl.className = "dep-badge";
  progressWrap?.classList.add("hidden");

  switch (state) {
    case "checking":
      statusEl.classList.add("checking");
      statusEl.textContent = i18next.t("deps.checking");
      if (detailEl) detailEl.textContent = "";
      if (actionsEl) actionsEl.innerHTML = "";
      break;

    case "installed": {
      statusEl.classList.add("ok");
      statusEl.textContent = i18next.t("deps.installed");
      if (detailEl) {
        const versionPart = data.version
          ? i18next.t("deps.versionInstalled", { version: data.version })
          : "";
        const checkingPart = data.checkingUpdate
          ? i18next.t("deps.checkingUpdate")
          : "";
        detailEl.textContent = [versionPart, checkingPart].filter(Boolean).join("  ·  ");
      }
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
      }
      break;
    }

    case "latest":
      statusEl.classList.add("ok");
      statusEl.textContent = i18next.t("deps.latest");
      if (detailEl) detailEl.textContent = i18next.t("deps.versionInstalled", { version: data.version });
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
      }
      break;

    case "outdated":
      statusEl.classList.add("update");
      statusEl.textContent = i18next.t("deps.outdated");
      if (detailEl) detailEl.textContent = i18next.t("deps.versionUpdate", { from: data.installedVersion, to: data.latestVersion });
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="update">${i18next.t("deps.update")}</button>
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
      }
      break;

    case "missing":
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.missing");
      if (detailEl) detailEl.textContent = "";
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="install">${i18next.t("deps.install")}</button>
        `;
      }
      break;

    case "error":
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.downloadFailed");
      if (detailEl) detailEl.textContent = data.message || "";
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="${data.retryAction || 'install'}">${i18next.t("deps.retry")}</button>
        `;
      }
      break;

    case "busy": {
      statusEl.classList.add("busy");
      statusEl.textContent = data.statusText || i18next.t("deps.updating");
      const pct = Math.round(data.percent || 0);
      if (detailEl) detailEl.textContent = i18next.t("deps.progressText", { percent: pct });
      progressWrap?.classList.remove("hidden");
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (actionsEl) actionsEl.innerHTML = "";
      break;
    }

    case "done":
      statusEl.classList.add("ok");
      statusEl.textContent = data.statusText || i18next.t("deps.doneInstalled");
      if (detailEl) detailEl.textContent = data.version ? i18next.t("deps.versionInstalled", { version: data.version }) : "";
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
      }
      break;
  }
}

/**
 * 更新 ffmpeg 卡片状态
 * state: 'checking' | 'eagle' | 'missing'
 * data: { version }
 */
function updateFfmpegCard(state, data = {}) {
  const { statusEl, detailEl, progressWrap, actionsEl } = getDepCardEls("ffmpeg");

  if (!statusEl) return;

  statusEl.className = "dep-badge";
  progressWrap?.classList.add("hidden");

  switch (state) {
    case "checking":
      statusEl.classList.add("checking");
      statusEl.textContent = i18next.t("deps.checking");
      if (detailEl) detailEl.textContent = "";
      if (actionsEl) actionsEl.innerHTML = "";
      break;

    // Eagle 内置版本：只读展示，不提供操作按钮
    case "eagle":
      statusEl.classList.add("ok");
      statusEl.textContent = i18next.t("deps.eagleBuiltin");
      if (detailEl) {
        detailEl.textContent = i18next.t("deps.ffmpegManaged");
      }
      if (actionsEl) actionsEl.innerHTML = "";
      break;

    // 未找到 Eagle 内置 ffmpeg：提供「安装 FFmpeg 依赖」按钮
    case "missing":
    default:
      statusEl.classList.add("missing");
      statusEl.textContent = i18next.t("deps.notFound");
      if (detailEl) {
        detailEl.textContent = i18next.t("deps.ffmpegNotFoundHint");
      }
      if (actionsEl) {
        actionsEl.innerHTML = `<button class="dep-btn primary" data-ffmpeg-action="open-store">${i18next.t("deps.installFfmpegDep")}</button>`;
      }
      break;
  }
}

module.exports = {
  updateTheme,
  showMainUI,
  isValidUrl,
  setupInputBar,
  setInputBarState,
  appendQueueItem,
  updateQueueItem,
  showCopiedFeedback,
  showCopiedErrorFeedback,
  canDeleteQueueItem,
  removeQueueItem,
  showDepsPage,
  hideDepsPage,
  setDepsGating,
  switchSubpageTab,
  autoGrowTextarea,
  refreshAccountFields,
  applyIntervalSelect,
  getIntervalChoice,
  setIntervalChoice,
  applySourceCheckboxes,
  renderTwitterProfile,
  updateDepsBadge,
  updateYtdlpCard,
  updateFfmpegCard,
  setupThemeControls,
  getFollowEagleTheme,
  setFollowEagleTheme,
  setManualTheme,
};
