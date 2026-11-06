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
const sankakuAuth = require("./sankaku-auth");
const twitterAuth = require("./twitter-auth");
const twitterMonitor = require("./twitter-monitor");
const twitterName = require("./twitter-name");
const ui = require("./ui");

// 状态管理
let isInitialized = false;

/**
 * 计算导入 Eagle 时使用的标签：
 * 小红书按偏好决定是否写入话题标签，其他站点优先用适配器标签，否则写站点名。
 */
function buildImportTags(metadata) {
  // 站点适配器可以给出更准确的标签（如小红书话题）
  const adapterTags = Array.isArray(metadata.tags)
    ? metadata.tags
      .map((tag) => String(tag || "").trim().replace(/^#+/, ""))
      .filter(Boolean)
    : [];
  const isXiaohongshu = String(metadata.extractor || "").toLowerCase() === "xiaohongshu";
  if (isXiaohongshu) {
    // 偏好设置里关闭后，小红书笔记不写任何标签
    return getXhsTagsPref() ? adapterTags.slice(0, 30) : [];
  }
  const baseTags = adapterTags.length ? adapterTags.slice(0, 30) : [metadata.extractor || "video"];
  const isTwitter = String(metadata.extractor || "").toLowerCase() === "twitter";
  if (!isTwitter) return baseTags;
  // 推特额外追加「标签规则」勾选出来的字段标签，按调整后的顺序排在站点标签之后
  const ruleTags = twitterName.buildTwitterTags(metadata, getTwitterTagsPref());
  const merged = baseTags.slice();
  for (const tag of ruleTags) {
    if (!merged.some((existing) => existing.toLowerCase() === tag.toLowerCase())) merged.push(tag);
  }
  return merged.slice(0, 30);
}

/**
 * 计算导入 Eagle 时使用的素材名：
 * 推特按勾选字段拼名，未勾选任何字段时沿用适配器给出的标题；
 * 同一条推文的多个文件按 (i/N) 追加序号（推特、小红书各有一个开关，可关闭），避免重名。
 */
function buildImportName(metadata, part) {
  const extractor = String((metadata && metadata.extractor) || "").toLowerCase();
  let appendPart = true;
  if (extractor === "twitter") appendPart = getTwitterMultiFilePref();
  else if (extractor === "xiaohongshu") appendPart = getXhsMultiFilePref();
  return twitterName.composeImportName(
    metadata,
    getTwitterNamePrefs(),
    part,
    i18next.t("error.downloadedVideo"),
    appendPart
  );
}

/**
 * 计算导入 Eagle 时使用的注释：
 * 推特按注释规则的勾选字段拼接，未勾选任何字段时沿用推文正文。
 */
function buildImportAnnotation(metadata) {
  const isTwitter = String(metadata.extractor || "").toLowerCase() === "twitter";
  const composed = isTwitter ? twitterName.buildTwitterAnnotation(metadata, getTwitterAnnotationPrefs()) : "";
  if (composed) return composed.slice(0, twitterName.ANNOTATION_MAX_LENGTH);
  return metadata.description ? metadata.description.slice(0, 5000) : "";
}

async function importToEagle(videoPath, metadata, sourceUrl, part) {
  if (typeof eagle === "undefined") {
    throw new Error(i18next.t("error.eagleApiNotAvailable"));
  }
  const tags = buildImportTags(metadata);
  const importOptions = {
    name: buildImportName(metadata, part),
    website: sourceUrl || undefined,
    tags,
    annotation: buildImportAnnotation(metadata),
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

// 小红书下载是否写入话题标签
const XHS_TAGS_KEY = "eagle-video-downloader.xhsTags";

/**
 * 获取是否把小红书话题写入 Eagle 标签（默认开启）
 */
function getXhsTagsPref() {
  const val = localStorage.getItem(XHS_TAGS_KEY);
  return val === null ? true : val === "true";
}

/**
 * 保存是否写入小红书标签
 */
function setXhsTagsPref(value) {
  localStorage.setItem(XHS_TAGS_KEY, String(value));
}

// 小红书同一篇笔记产出多个文件时，是否在名称末尾追加 (i/N) 区分
const XHS_MULTI_FILE_KEY = "eagle-video-downloader.xhsMultiFile";

/**
 * 获取小红书多图是否追加序号（默认开启）
 */
function getXhsMultiFilePref() {
  const val = localStorage.getItem(XHS_MULTI_FILE_KEY);
  return val === null ? true : val === "true";
}

/**
 * 保存小红书多图是否追加序号
 */
function setXhsMultiFilePref(value) {
  localStorage.setItem(XHS_MULTI_FILE_KEY, String(value));
}

// 同一条推文产出多个文件时，是否在名称末尾追加 (i/N) 区分
const TWITTER_MULTI_FILE_KEY = "eagle-video-downloader.twitterMultiFile";

/**
 * 获取推特多文件是否追加序号（默认开启）
 */
function getTwitterMultiFilePref() {
  const val = localStorage.getItem(TWITTER_MULTI_FILE_KEY);
  return val === null ? true : val === "true";
}

/**
 * 保存推特多文件是否追加序号
 */
function setTwitterMultiFilePref(value) {
  localStorage.setItem(TWITTER_MULTI_FILE_KEY, String(value));
}

// 推特素材命名 / 注释的勾选状态与字段顺序（JSON：{ authorId, tweetId, screenName, text, name, order }）
const TWITTER_NAME_KEY = "eagle-video-downloader.twitterName";
const TWITTER_ANNOTATION_KEY = "eagle-video-downloader.twitterAnnotation";
const TWITTER_TAGS_KEY = "eagle-video-downloader.twitterTagRules";

/**
 * 为「五个字段 + 顺序」这类偏好造一组读写函数，命名规则与注释规则各用一个 key
 * @param {string} storageKey
 */
function createFieldPrefsStore(storageKey) {
  function get() {
    const raw = localStorage.getItem(storageKey);
    let saved = null;
    if (raw) {
      try {
        saved = JSON.parse(raw);
      } catch (e) {
        saved = null;
      }
    }
    const prefs = twitterName.getDefaultPrefs();
    if (saved && typeof saved === "object") {
      for (const field of twitterName.FIELD_ORDER) {
        if (typeof saved[field] === "boolean") prefs[field] = saved[field];
      }
      if (Array.isArray(saved.order)) prefs.order = twitterName.normalizeOrder(saved.order);
      if (Array.isArray(saved.join)) prefs.join = twitterName.normalizeJoin(saved.join);
    }
    return prefs;
  }

  function save(prefs) {
    localStorage.setItem(storageKey, JSON.stringify(prefs));
  }

  function setField(field, value) {
    if (!twitterName.FIELD_ORDER.includes(field)) return;
    const prefs = get();
    prefs[field] = value === true;
    save(prefs);
  }

  function setOrder(order) {
    const prefs = get();
    prefs.order = twitterName.normalizeOrder(order);
    save(prefs);
    return prefs.order;
  }

  /**
   * 标记某个字段是否和它上面那条已勾选字段合并成一条标签
   * @param {string} field
   * @param {boolean} joined
   * @returns {string[]} 校正后的 join 列表
   */
  function setJoin(field, joined) {
    if (!twitterName.FIELD_ORDER.includes(field)) return get().join;
    const prefs = get();
    const list = Array.isArray(prefs.join) ? prefs.join.slice() : [];
    const index = list.indexOf(field);
    if (joined === true && index < 0) list.push(field);
    if (joined !== true && index >= 0) list.splice(index, 1);
    prefs.join = twitterName.normalizeJoin(list);
    save(prefs);
    return prefs.join;
  }

  function move(field, direction) {
    const prefs = get();
    const moved = twitterName.moveInOrder(prefs.order, field, direction);
    if (!moved) return null;
    return setOrder(moved);
  }

  return { get, setField, setOrder, setJoin, move };
}

const twitterNamePrefsStore = createFieldPrefsStore(TWITTER_NAME_KEY);
const twitterAnnotationPrefsStore = createFieldPrefsStore(TWITTER_ANNOTATION_KEY);
const twitterTagsPrefsStore = createFieldPrefsStore(TWITTER_TAGS_KEY);

/**
 * 获取推特素材命名的勾选状态与字段顺序，缺失的字段回落到默认值
 * @returns {{authorId: boolean, tweetId: boolean, screenName: boolean, text: boolean, name: boolean, order: string[]}}
 */
function getTwitterNamePrefs() {
  return twitterNamePrefsStore.get();
}

/**
 * 保存单个推特命名字段的勾选状态
 * @param {string} field
 * @param {boolean} value
 */
function setTwitterNamePref(field, value) {
  twitterNamePrefsStore.setField(field, value);
}

/**
 * 保存命名用的字段拼接顺序，返回校正后的顺序
 * @param {string[]} order
 * @returns {string[]}
 */
function setTwitterNameOrder(order) {
  return twitterNamePrefsStore.setOrder(order);
}

/**
 * 把命名字段上移或下移一格，返回新顺序（越界时返回 null）
 * @param {string} field
 * @param {"up"|"down"} direction
 * @returns {string[]|null}
 */
function moveTwitterNameField(field, direction) {
  return twitterNamePrefsStore.move(field, direction);
}

/**
 * 获取推特素材注释的勾选状态与字段顺序
 * @returns {{authorId: boolean, tweetId: boolean, screenName: boolean, text: boolean, name: boolean, order: string[]}}
 */
function getTwitterAnnotationPrefs() {
  return twitterAnnotationPrefsStore.get();
}

/**
 * 保存单个推特注释字段的勾选状态
 * @param {string} field
 * @param {boolean} value
 */
function setTwitterAnnotationPref(field, value) {
  twitterAnnotationPrefsStore.setField(field, value);
}

/**
 * 保存注释用的字段拼接顺序，返回校正后的顺序
 * @param {string[]} order
 * @returns {string[]}
 */
function setTwitterAnnotationOrder(order) {
  return twitterAnnotationPrefsStore.setOrder(order);
}

/**
 * 把注释字段上移或下移一格，返回新顺序（越界时返回 null）
 * @param {string} field
 * @param {"up"|"down"} direction
 * @returns {string[]|null}
 */
function moveTwitterAnnotationField(field, direction) {
  return twitterAnnotationPrefsStore.move(field, direction);
}

/**
 * 获取推特素材标签规则的勾选状态与字段顺序
 * @returns {{authorId: boolean, tweetId: boolean, screenName: boolean, text: boolean, name: boolean, order: string[]}}
 */
function getTwitterTagsPref() {
  return twitterTagsPrefsStore.get();
}

/**
 * 保存单个推特标签字段的勾选状态
 * @param {string} field
 * @param {boolean} value
 */
function setTwitterTagsPref(field, value) {
  twitterTagsPrefsStore.setField(field, value);
}

/**
 * 保存标签用的字段顺序，返回校正后的顺序
 * @param {string[]} order
 * @returns {string[]}
 */
function setTwitterTagsOrder(order) {
  return twitterTagsPrefsStore.setOrder(order);
}

/**
 * 保存标签字段是否与上一条已勾选字段合并成一条标签，返回新顺序下的合并标记
 * @param {string} field
 * @param {boolean} joined
 * @returns {string[]}
 */
function setTwitterTagsJoin(field, joined) {
  return twitterTagsPrefsStore.setJoin(field, joined);
}

/**
 * 把标签字段上移或下移一格，返回新顺序（越界时返回 null）
 * @param {string} field
 * @param {"up"|"down"} direction
 * @returns {string[]|null}
 */
function moveTwitterTagsField(field, direction) {
  return twitterTagsPrefsStore.move(field, direction);
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
  startLibraryWatcher();
  try {
    ui.renderTwitterProfile();
    twitterMonitor
      .fetchProfile()
      .then((profile) => {
        if (profile && profile.ok) ui.renderTwitterProfile(profile);
      })
      .catch(() => {});
  } catch (e) {}
  twitterMonitor
    .init()
    .then((result) => {
      const status = document.getElementById("twitterAuthStatus");
      if (!status || !result) return;
      if (result.skipped) return;
      if (result.ok === false) {
        status.textContent = i18next.t("deps.twitterAuthFailed", { error: result.error || "error" });
        return;
      }
      if (result.baseline) {
        status.textContent = i18next.t("deps.twitterAuthReady");
        return;
      }
      const parts = [i18next.t("deps.twitterCatchup", { count: result.newCount || 0 })];
      if (result.truncated) parts.push(i18next.t("deps.twitterCatchupTruncated"));
      status.textContent = parts.join(" · ");
    })
    .catch((e) => {
      console.warn("[twitter-monitor] init failed:", e && e.message);
    });
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
let lastLibraryPath = null;

/** 资源库切换时，账号与监控状态跟着切换 */
function startLibraryWatcher() {
  try {
    lastLibraryPath = (eagle.library && eagle.library.path) || "";
  } catch (e) {
    lastLibraryPath = "";
  }

  setInterval(() => {
    let current = "";
    try {
      current = (eagle.library && eagle.library.path) || "";
    } catch (e) {
      current = "";
    }
    if (current === lastLibraryPath) return;
    lastLibraryPath = current;
    try {
      ui.refreshAccountFields();
    } catch (e) {}
    try {
      twitterMonitor.refreshForLibrary();
    } catch (e) {}
  }, 3000);
}

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
  document.getElementById("tabBtnTags")?.addEventListener("click", () => {
    ui.switchSubpageTab("tags");
  });
  document.getElementById("tabBtnDeps")?.addEventListener("click", () => {
    ui.switchSubpageTab("dependencies");
  });
  document.getElementById("tabBtnAccount")?.addEventListener("click", () => {
    ui.switchSubpageTab("account");
  });

  // 自动设置 Eagle 数据来源切换
  const autoAddToggle = document.getElementById("autoAddSourceToggle");
  if (autoAddToggle) {
    autoAddToggle.addEventListener("change", (e) => {
      setAutoAddSourcePref(e.target.checked);
    });
  }

  // 小红书标签开关
  const xhsTagsToggle = document.getElementById("xhsTagsToggle");
  if (xhsTagsToggle) {
    xhsTagsToggle.addEventListener("change", (e) => {
      setXhsTagsPref(e.target.checked);
    });
  }

  // 小红书多图区分开关
  const xhsMultiFileToggle = document.getElementById("xhsMultiFileToggle");
  if (xhsMultiFileToggle) {
    xhsMultiFileToggle.addEventListener("change", (e) => {
      setXhsMultiFilePref(e.target.checked);
    });
  }

  // 推特多文件区分开关
  const twMultiFileToggle = document.getElementById("twMultiFileToggle");
  if (twMultiFileToggle) {
    twMultiFileToggle.addEventListener("change", (e) => {
      setTwitterMultiFilePref(e.target.checked);
    });
  }

  // 推特素材命名复选框
  const twitterNameToggles = {
    authorId: "twNameAuthorId",
    tweetId: "twNameTweetId",
    screenName: "twNameScreenName",
    text: "twNameText",
    name: "twNameFullName",
  };
  for (const [field, id] of Object.entries(twitterNameToggles)) {
    const box = document.getElementById(id);
    if (box) {
      box.addEventListener("change", (e) => {
        setTwitterNamePref(field, e.target.checked);
      });
    }
  }

  // 推特命名字段顺序：上移 / 下移
  const twNameFields = document.getElementById("twNameFields");
  if (twNameFields) {
    twNameFields.addEventListener("click", (e) => {
      const button = e.target.closest(".setting-order-btn");
      if (!button) return;
      const row = button.closest(".setting-check-row");
      const field = row && row.dataset.field;
      if (!field) return;
      const direction = button.dataset.move === "up" ? "up" : "down";
      const order = moveTwitterNameField(field, direction);
      if (order) ui.applyTwitterNameOrder(order);
    });
  }

  // 推特注释字段复选框
  const twitterAnnotationToggles = {
    authorId: "twAnAuthorId",
    tweetId: "twAnTweetId",
    screenName: "twAnScreenName",
    text: "twAnText",
    name: "twAnFullName",
  };
  for (const [field, id] of Object.entries(twitterAnnotationToggles)) {
    const box = document.getElementById(id);
    if (box) {
      box.addEventListener("change", (e) => {
        setTwitterAnnotationPref(field, e.target.checked);
      });
    }
  }

  // 推特注释字段顺序：上移 / 下移
  const twAnnotationFields = document.getElementById("twAnnotationFields");
  if (twAnnotationFields) {
    twAnnotationFields.addEventListener("click", (e) => {
      const button = e.target.closest(".setting-order-btn");
      if (!button) return;
      const row = button.closest(".setting-check-row");
      const field = row && row.dataset.field;
      if (!field) return;
      const direction = button.dataset.move === "up" ? "up" : "down";
      const order = moveTwitterAnnotationField(field, direction);
      if (order) ui.applyTwitterAnnotationOrder(order);
    });
  }

  // 推特标签字段复选框
  const twitterTagsToggles = {
    authorId: "twTagAuthorId",
    tweetId: "twTagTweetId",
    screenName: "twTagScreenName",
    text: "twTagText",
    name: "twTagFullName",
  };
  for (const [field, id] of Object.entries(twitterTagsToggles)) {
    const box = document.getElementById(id);
    if (box) {
      box.addEventListener("change", (e) => {
        setTwitterTagsPref(field, e.target.checked);
        // 相邻两条都勾选时才出现锁链按钮，勾选状态一变就要重算
        ui.refreshTwitterTagJoins(getTwitterTagsPref().join);
      });
    }
  }

  // 推特标签字段顺序：上移 / 下移
  const twTagFields = document.getElementById("twTagFields");
  if (twTagFields) {
    twTagFields.addEventListener("click", (e) => {
      // 锁链按钮：把这一条并到上面那条标签里
      const joinBtn = e.target.closest(".setting-join-btn");
      if (joinBtn) {
        const slot = joinBtn.closest(".setting-check-join");
        const joinField = slot && slot.dataset.join;
        if (!joinField) return;
        const joined = getTwitterTagsPref().join.includes(joinField);
        const join = setTwitterTagsJoin(joinField, !joined);
        ui.refreshTwitterTagJoins(join);
        return;
      }
      const button = e.target.closest(".setting-order-btn");
      if (!button) return;
      const row = button.closest(".setting-check-row");
      const field = row && row.dataset.field;
      if (!field) return;
      const direction = button.dataset.move === "up" ? "up" : "down";
      const order = moveTwitterTagsField(field, direction);
      if (order) ui.applyTwitterTagsOrder(order, getTwitterTagsPref().join);
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

  // Sankaku 账号凭证：保存 / 清除
  const authInput = document.getElementById("sankakuAuthInput");
  const authStatus = document.getElementById("sankakuAuthStatus");
  const authSave = document.getElementById("sankakuAuthSave");
  const authClear = document.getElementById("sankakuAuthClear");

  if (authSave && authInput) {
    authSave.addEventListener("click", () => {
      const token = sankakuAuth.parseAccessToken(authInput.value);
      if (!token) {
        if (authStatus) authStatus.textContent = i18next.t("deps.sankakuAuthInvalid");
        return;
      }
      sankakuAuth.setStoredAuth(authInput.value);
      if (authStatus) authStatus.textContent = i18next.t("deps.sankakuAuthSaved");
    });
  }

  if (authClear && authInput) {
    authClear.addEventListener("click", () => {
      sankakuAuth.setStoredAuth("");
      authInput.value = "";
      if (authStatus) authStatus.textContent = i18next.t("deps.sankakuAuthCleared");
    });
  }

  // Twitter / X 账号：保存并测试、清除、监控间隔
  const twToken = document.getElementById("twitterAuthToken");
  const twCt0 = document.getElementById("twitterCt0");
  const twStatus = document.getElementById("twitterAuthStatus");
  const twSave = document.getElementById("twitterAuthSave");
  const twClear = document.getElementById("twitterAuthClear");
  const twIntervals = document.getElementById("twitterMonitorInterval");
  const setTwStatus = (text) => {
    if (twStatus) twStatus.textContent = text;
  };

  const getIntervalMinutes = () => {
    return twIntervals ? Number(twIntervals.value) || 0 : 0;
  };

  const describeInterval = (ms) => {
    if (ms % 3600000 === 0) return ms / 3600000 + " " + i18next.t("deps.unitHours");
    return ms / 60000 + " " + i18next.t("deps.unitMinutes");
  };

  /** 按当前选中的时间选项启动监控；选「关闭」则停止 */
  const applyInterval = () => {
    const minutes = getIntervalMinutes();
    ui.setIntervalChoice(minutes);
    if (!minutes) {
      twitterMonitor.stop();
      setTwStatus(i18next.t("deps.twitterMonitorOff"));
      return false;
    }
    if (!twitterAuth.hasAuth()) {
      setTwStatus(i18next.t("deps.twitterAuthInvalid"));
      return false;
    }
    const intervalMs = Math.max(twitterMonitor.MIN_INTERVAL_MS, minutes * 60000);
    twitterMonitor.start(intervalMs);
    setTwStatus(i18next.t("deps.twitterMonitorOn", { interval: describeInterval(intervalMs) }));
    return true;
  };

  if (twSave && twToken && twCt0) {
    twSave.addEventListener("click", async () => {
      const cookie = twitterAuth.buildCookie(twToken.value, twCt0.value);
      if (!cookie) {
        setTwStatus(i18next.t("deps.twitterAuthInvalid"));
        return;
      }
      twitterAuth.setStoredCookie(cookie);
      setTwStatus(i18next.t("deps.twitterAuthTesting"));

      const result = await twitterMonitor.testConnection();
      if (!result.ok) {
        setTwStatus(i18next.t("deps.twitterAuthFailed", { error: result.error }));
        return;
      }
      const parts = [i18next.t("deps.twitterAuthSaved", { name: result.screenName || "?" })];
      if (!result.likesOk) parts.push("likes: " + (result.likesError || "error"));
      if (!result.bookmarksOk) parts.push("bookmarks: " + (result.bookmarksError || "error"));
      setTwStatus(parts.join(" \u00b7 "));
      ui.renderTwitterProfile(result);
      applyInterval();
    });
  }

  if (twClear && twToken && twCt0) {
    twClear.addEventListener("click", () => {
      twitterAuth.setStoredCookie("");
      twToken.value = "";
      twCt0.value = "";
      twitterMonitor.saveProfile({});
      ui.renderTwitterProfile(null);
      setTwStatus(i18next.t("deps.twitterAuthCleared"));
      twitterMonitor.stop();
      if (twIntervals) twIntervals.value = "0";
    });
  }

  if (twIntervals) twIntervals.addEventListener("change", applyInterval);

  const twLikes = document.getElementById("twitterMonitorLikes");
  const twBookmarks = document.getElementById("twitterMonitorBookmarks");
  const onSourceChange = () => {
    twitterMonitor.setPrefs({ likes: !!(twLikes && twLikes.checked), bookmarks: !!(twBookmarks && twBookmarks.checked) });
    if (!(twLikes && twLikes.checked) && !(twBookmarks && twBookmarks.checked)) {
      twitterMonitor.stop();
      setTwStatus(i18next.t("deps.twitterMonitorNoSource"));
      return;
    }
    applyInterval();
  };
  if (twLikes) twLikes.addEventListener("change", onSourceChange);
  if (twBookmarks) twBookmarks.addEventListener("change", onSourceChange);

  // 抓取测试：立即执行一次抓取
  const twTest = document.getElementById("twitterMonitorTest");
  if (twTest) {
    twTest.addEventListener("click", async () => {
      if (!twitterAuth.hasAuth()) {
        setTwStatus(i18next.t("deps.twitterAuthInvalid"));
        return;
      }
      twTest.disabled = true;
      setTwStatus(i18next.t("deps.twitterFetching"));
      let result = null;
      try {
        result = await twitterMonitor.catchUp();
      } catch (e) {
        result = { ok: false, error: (e && e.message) || "error" };
      }
      twTest.disabled = false;
      if (!result || result.ok === false) {
        setTwStatus(i18next.t("deps.twitterAuthFailed", { error: (result && result.error) || "error" }));
        return;
      }
      const parts = [i18next.t("deps.twitterCatchup", { count: result.newCount || 0 })];
      if (result.truncated) parts.push(i18next.t("deps.twitterCatchupTruncated"));
      setTwStatus(parts.join(" \u00b7 "));
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
    xhsTagsPref: getXhsTagsPref(),
    xhsMultiFilePref: getXhsMultiFilePref(),
    twitterMultiFilePref: getTwitterMultiFilePref(),
    twitterNamePref: getTwitterNamePrefs(),
    twitterAnnotationPref: getTwitterAnnotationPrefs(),
    twitterTagsPref: getTwitterTagsPref(),
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
const RECENT_DOWNLOAD_KEY = "evd.recentDownloads";
const RECENT_DOWNLOAD_TTL = 24 * 60 * 60 * 1000;
const RECENT_DOWNLOAD_LIMIT = 500;

/** 归一化下载对象：同一条推文 / 同一个 Sankaku 投稿视为同一个任务 */
function downloadKey(url) {
  const text = String(url || "");
  const tweet = text.match(/\/status\/(\d+)/);
  if (tweet) return "tw:" + tweet[1];
  const sankaku = text.match(/\/(?:posts?|post\/show)\/([A-Za-z0-9]+)/i);
  if (sankaku) return "sk:" + sankaku[1];
  const xiaohongshu = text.match(/xiaohongshu\.com\/(?:explore|discovery\/item|note)\/([0-9a-f]{24})/i);
  if (xiaohongshu) return "xhs:" + xiaohongshu[1].toLowerCase();
  return "url:" + text.split("#")[0];
}

function loadRecentDownloads() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_DOWNLOAD_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveRecentDownloads(map) {
  try {
    const now = Date.now();
    const entries = Object.entries(map)
      .filter(([, ts]) => now - ts < RECENT_DOWNLOAD_TTL)
      .sort((a, b) => b[1] - a[1])
      .slice(0, RECENT_DOWNLOAD_LIMIT);
    localStorage.setItem(RECENT_DOWNLOAD_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (e) {
    // ignore
  }
}

/** 24 小时内已下载过，或队列里已有同一任务，则视为重复 */
function isDuplicateDownload(url) {
  const key = downloadKey(url);
  const recent = loadRecentDownloads();
  if (recent[key] && Date.now() - recent[key] < RECENT_DOWNLOAD_TTL) return true;
  return downloadQueue.some((item) => item.state !== "error" && downloadKey(item.url) === key);
}

function recordDownloaded(url) {
  const key = downloadKey(url);
  const recent = loadRecentDownloads();
  recent[key] = Date.now();
  saveRecentDownloads(recent);
  try {
    twitterMonitor.markTweetSeen(url);
  } catch (e) {
    // ignore
  }
}

function addToQueue(url) {
  if (!isInitialized) return;
  if (isDuplicateDownload(url)) {
    console.info("[queue] duplicate skipped:", url);
    return;
  }

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
      await importToEagle(result.path, result.metadata, sourceUrl, {
        index: result.partIndex,
        total: result.partTotal,
      });
      downloader.cleanup(result.path);
    }
    recordDownloaded(item.url);
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
    xhsTagsPref: getXhsTagsPref(),
    xhsMultiFilePref: getXhsMultiFilePref(),
    twitterMultiFilePref: getTwitterMultiFilePref(),
    twitterNamePref: getTwitterNamePrefs(),
    twitterAnnotationPref: getTwitterAnnotationPrefs(),
    twitterTagsPref: getTwitterTagsPref(),
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
// 桥接服务：接收浏览器扩展 / 局域网设备推送的链接（监听 0.0.0.0:43110）
// ---------------------------------------------------------------------------
const INGEST_PORT = 43110;
const INGEST_ALLOWED_HOSTS = ["x.com", "twitter.com", "mobile.twitter.com", "video.twimg.com", "pbs.twimg.com", "sankaku.app", "sankakucomplex.com", "xiaohongshu.com", "xhslink.com"];

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

let peersCache = { at: 0, list: [] };

function getLocalSubnets() {
  const subnets = new Set();
  try {
    const os = require("os");
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const info of interfaces[name] || []) {
        if (info.family === "IPv4" && !info.internal && info.address) {
          subnets.add(info.address.split(".").slice(0, 3).join("."));
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return Array.from(subnets);
}

function probePeer(ip) {
  return new Promise((resolve) => {
    const http = require("http");
    const req = http.get({ host: ip, port: INGEST_PORT, path: "/ping", timeout: 400 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 4096) res.destroy();
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (json && json.app === "eagle-video-downloader") {
            resolve({ ip, name: json.name || ip, ready: !!json.ready });
            return;
          }
        } catch (e) {
          // ignore
        }
        resolve(null);
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
  });
}

/** 扫描同网段内运行本插件的设备 */
async function scanLanPeers(force) {
  const now = Date.now();
  if (!force && peersCache.list.length && now - peersCache.at < 30000) return peersCache.list;

  const selfIps = new Set();
  try {
    const os = require("os");
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const info of interfaces[name] || []) {
        if (info.family === "IPv4" && info.address) selfIps.add(info.address);
      }
    }
  } catch (e) {}

  const targets = [];
  for (const subnet of getLocalSubnets()) {
    for (let host = 1; host <= 254; host++) {
      const ip = subnet + "." + host;
      if (!selfIps.has(ip)) targets.push(ip);
    }
  }
  if (!targets.length) return [];

  const peers = [];
  const concurrency = 64;
  for (let index = 0; index < targets.length; index += concurrency) {
    const batch = targets.slice(index, index + concurrency);
    const results = await Promise.all(batch.map((ip) => probePeer(ip)));
    for (const item of results) {
      if (item) peers.push(item);
    }
    if (peers.length >= 20) break;
  }

  peersCache = { at: Date.now(), list: peers };
  return peers;
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
      let name = "";
      try {
        name = require("os").hostname();
      } catch (e) {}
      writeBridgeResponse(res, 200, { ok: true, app: "eagle-video-downloader", ready: !!isInitialized, name });
      return;
    }

    if (pathname === "/peers") {
      scanLanPeers()
        .then((peers) => writeBridgeResponse(res, 200, { ok: true, peers }))
        .catch(() => writeBridgeResponse(res, 200, { ok: true, peers: [] }));
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
  server.listen(INGEST_PORT, "0.0.0.0");
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

// 供测试使用；Electron 运行时不会用到
module.exports = {
  buildImportTags,
  buildImportName,
  buildImportAnnotation,
  getTwitterNamePrefs,
  setTwitterNamePref,
  setTwitterNameOrder,
  moveTwitterNameField,
  getTwitterAnnotationPrefs,
  setTwitterAnnotationPref,
  setTwitterAnnotationOrder,
  moveTwitterAnnotationField,
  getTwitterTagsPref,
  setTwitterTagsPref,
  setTwitterTagsOrder,
  setTwitterTagsJoin,
  moveTwitterTagsField,
  getXhsMultiFilePref,
  setXhsMultiFilePref,
  getTwitterMultiFilePref,
  setTwitterMultiFilePref,
};

