/* Eagle 视频下载助手 — 内容脚本
 * X / Twitter：把下载按钮插到推文操作栏「分享」按钮旁边（图片、视频推文都适用）
 * Sankaku（sankaku.app）：右下角固定浮动按钮
 * 点击后把页面链接（以及可选的直链）推送给本机 Eagle 插件。
 */
(function () {
  "use strict";

  const HOST_ID = "evd-eagle-media-download-host";
  const BTN_ID = "evd-eagle-media-download";
  const ACTION_CLASS = "evd-eagle-action";
  const SANKAKU_POST_RE = /^(?:\/[a-z]{2}(?:-[a-z]{2,4})?)?\/posts?(?:\/show)?\/([A-Za-z0-9]+)\/?$/i;

  const SITE = (function () {
    const host = (location.hostname || "").toLowerCase();
    if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com") || host.endsWith(".x.com")) {
      return "twitter";
    }
    if (host === "sankaku.app" || host.endsWith(".sankaku.app") || host.endsWith(".sankakucomplex.com")) {
      return "sankaku";
    }
    return null;
  })();

  /* ------------------------------------------------------------ url helpers */

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function areaOf(el) {
    const rect = el.getBoundingClientRect();
    return rect.width * rect.height;
  }

  function getTweetUrl(article) {
    if (!article) return null;
    const timeLink = article.querySelector('a[href*="/status/"] time');
    const anchor = timeLink ? timeLink.closest("a") : article.querySelector('a[href*="/status/"]');
    if (!anchor || !anchor.href) return null;
    try {
      const url = new URL(anchor.href);
      const match = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
      if (!match) return anchor.href.split("?")[0];
      return `https://x.com/${match[1]}/status/${match[2]}`;
    } catch (e) {
      return null;
    }
  }

  function getMediaUrlFrom(media) {
    if (!media) return null;
    if (media.tagName === "VIDEO") {
      const src = media.currentSrc || media.src || "";
      if (/^https:\/\/video\.twimg\.com\//i.test(src)) return src;
      const source = media.querySelector("source[src]");
      const sourceSrc = source ? source.getAttribute("src") || "" : "";
      if (/^https:\/\/video\.twimg\.com\//i.test(sourceSrc)) return sourceSrc;
      return null;
    }
    const img = media.tagName === "IMG" ? media : (media.querySelector && media.querySelector("img"));
    const src = img ? img.currentSrc || img.src || "" : "";
    if (/^https:\/\/pbs\.twimg\.com\//i.test(src)) return src.split("?")[0] + "?name=orig";
    return null;
  }

  function getMediaUrl(article) {
    if (!article) return null;
    const video = article.querySelector("video");
    if (video) {
      const url = getMediaUrlFrom(video);
      if (url) return url;
    }
    const photo = article.querySelector('[data-testid="tweetPhoto"]');
    if (photo) {
      const url = getMediaUrlFrom(photo);
      if (url) return url;
    }
    return null;
  }

  function tweetUrlForMedia(media) {
    const article = media.closest ? media.closest('article[data-testid="tweet"]') : null;
    if (article) {
      const url = getTweetUrl(article);
      if (url) return url;
    }
    const link = media.closest ? media.closest('a[href*="/status/"]') : null;
    if (link && link.href) {
      const matched = link.href.match(/\/status\/(\d+)/);
      if (matched) return `https://x.com/i/status/${matched[1]}`;
    }
    const pathMatch = (location.pathname || "").match(/\/status\/(\d+)/);
    return pathMatch ? `https://x.com/i/status/${pathMatch[1]}` : null;
  }

  function getSankakuPostUrl() {
    const matched = (location.pathname || "").match(SANKAKU_POST_RE);
    if (!matched) return null;
    return `${location.protocol}//${location.host}${location.pathname.replace(/\/+$/, "")}`;
  }

  function getSankakuPostUrlFor(node) {
    const direct = getSankakuPostUrl();
    if (direct) return direct;
    let el = node;
    while (el && el !== document.body) {
      if (el.tagName === "A" && el.href) {
        try {
          const url = new URL(el.href);
          if (SANKAKU_POST_RE.test(url.pathname)) return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`;
        } catch (e) {
          // ignore malformed href
        }
      }
      el = el.parentElement;
    }
    return null;
  }

  function getSankakuMediaUrl(video) {
    const src = (video && (video.currentSrc || video.src)) || "";
    if (/^https:\/\/[^/]*sankakucomplex\.com\//i.test(src)) return src;
    return null;
  }

  function findSankakuSidebar() {
    return (
      document.querySelector(".MuiDrawer-paper.MuiDrawer-paperAnchorLeft") ||
      document.querySelector('[class*="MuiDrawer-paperAnchorLeft"]') ||
      null
    );
  }

  /* ------------------------------------------------------------ send helper */

  async function sendIngest(url, mediaUrl) {
    try {
      return await chrome.runtime.sendMessage({ type: "ingest", url: url, mediaUrl: mediaUrl || null });
    } catch (e) {
      return { ok: false, error: "扩展后台不可用" };
    }
  }

  /* ------------------------------------------------------------ twitter action bar */

  const ACTION_ICON_SVG =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z"/>' +
    "</svg>";

  function createActionButton(url, mediaUrl) {
    const wrap = document.createElement("div");
    wrap.className = ACTION_CLASS;
    wrap.style.cssText = "display:flex;align-items:center;justify-content:center;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "evd-eagle-action-btn";
    btn.setAttribute("aria-label", "保存到 Eagle");
    btn.title = "保存到 Eagle（图片 / 视频）";
    btn.innerHTML = ACTION_ICON_SVG;
    btn.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "width:34.75px",
      "height:34.75px",
      "padding:0",
      "border:none",
      "border-radius:9999px",
      "background:transparent",
      "color:rgb(113,118,123)",
      "cursor:pointer",
      "transition:background 0.15s ease,color 0.15s ease",
    ].join(";");

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(29,155,240,0.1)";
      btn.style.color = "rgb(29,155,240)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "transparent";
      btn.style.color = "rgb(113,118,123)";
    });

    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (btn.dataset.state === "sending") return;
      btn.dataset.state = "sending";
      btn.style.opacity = "0.6";
      const response = await sendIngest(url, mediaUrl);
      btn.style.opacity = "1";
      if (response && response.ok) {
        btn.style.color = "rgb(0,186,124)";
      } else {
        btn.style.color = "rgb(244,33,46)";
        btn.title = (response && response.error) || "推送失败";
      }
      setTimeout(() => {
        btn.dataset.state = "idle";
        btn.style.color = "rgb(113,118,123)";
        btn.title = "保存到 Eagle（图片 / 视频）";
      }, 2400);
    });

    wrap.appendChild(btn);
    return wrap;
  }

  const LAN_ACTION_CLASS = "evd-eagle-lan-action";
  const LAN_ICON_SVG =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">' +
    '<path d="M18 8a3 3 0 1 0-2.82-4H15A3 3 0 0 0 18 8Zm-12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 8a3 3 0 1 0 2.82 4H21a3 3 0 0 0-3-4ZM8.6 7.5l6.8-3.4a1 1 0 1 1 .9 1.8L9.5 9.3a1 1 0 0 1-.9-1.8Zm0 9 6.8 3.4a1 1 0 1 0 .9-1.8l-6.8-3.4a1 1 0 0 0-.9 1.8ZM8.5 11h7a1 1 0 1 1 0 2h-7a1 1 0 1 1 0-2Z"/>' +
    "</svg>";

  /** 分享到局域网设备：只发送链接，不在本机下载 */
  function createLanActionButton(url) {
    const wrap = document.createElement("div");
    wrap.className = LAN_ACTION_CLASS;
    wrap.style.cssText = "display:flex;align-items:center;justify-content:center;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "evd-eagle-lan-btn";
    btn.setAttribute("aria-label", "分享到局域网设备");
    btn.title = "分享到局域网设备";
    btn.innerHTML = LAN_ICON_SVG;
    btn.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "width:34.75px",
      "height:34.75px",
      "padding:0",
      "border:none",
      "border-radius:9999px",
      "background:transparent",
      "color:rgb(113,118,123)",
      "cursor:pointer",
      "transition:background 0.15s ease,color 0.15s ease",
    ].join(";");

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(29,155,240,0.1)";
      btn.style.color = "rgb(29,155,240)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "transparent";
      btn.style.color = "rgb(113,118,123)";
    });

    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (btn.dataset.state === "sending") return;
      btn.dataset.state = "sending";
      btn.style.opacity = "0.6";

      const ip = await getLanDevice();
      if (!ip) {
        btn.style.opacity = "1";
        btn.dataset.state = "idle";
        showToast("请先在扩展弹窗选择局域网设备");
        return;
      }

      let response = null;
      try {
        response = await chrome.runtime.sendMessage({ type: "lan-send", url, ip });
      } catch (e) {
        response = { ok: false, error: "扩展后台不可用" };
      }
      btn.style.opacity = "1";
      if (response && response.ok) {
        btn.style.color = "rgb(0,186,124)";
        showToast("已发送到 " + ip);
      } else {
        btn.style.color = "rgb(244,33,46)";
        showToast((response && response.error) || "发送失败");
      }
      setTimeout(() => {
        btn.dataset.state = "idle";
        btn.style.color = "rgb(113,118,123)";
      }, 2400);
    });

    wrap.appendChild(btn);
    return wrap;
  }

  /** 每条推文都加两个按钮：保存到 Eagle / 分享到局域网设备 */
  function injectForTweet(article) {
    if (!article) return false;
    const group = article.querySelector('[role="group"]');
    if (!group) return false;

    const url = getTweetUrl(article);
    if (!url) return false;

    let injected = false;
    if (!group.querySelector("." + ACTION_CLASS)) {
      group.appendChild(createActionButton(url, getMediaUrl(article)));
      injected = true;
    }
    if (!group.querySelector("." + LAN_ACTION_CLASS)) {
      group.appendChild(createLanActionButton(url));
      injected = true;
    }
    return injected;
  }

  /* ------------------------------------------------------------ like / bookmark -> auto push */

  const pushSettings = { like: true, bookmark: true };

  function applyStoredSettings(values) {
    if (!values) return;
    if (typeof values.evdLikePush === "boolean") pushSettings.like = values.evdLikePush;
    if (typeof values.evdBookmarkPush === "boolean") pushSettings.bookmark = values.evdBookmarkPush;
  }

  function loadPushSettings() {
    try {
      chrome.storage.local.get({ evdLikePush: true, evdBookmarkPush: true }, (values) => {
        applyStoredSettings(values);
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        for (const key of Object.keys(changes)) {
          const value = changes[key].newValue;
          if (key === "evdLikePush") pushSettings.like = value !== false;
          if (key === "evdBookmarkPush") pushSettings.bookmark = value !== false;
        }
      });
    } catch (e) {
      // storage unavailable: keep the defaults
    }
  }

  const recentlyPushed = new Map();

  function markPushed(url) {
    const now = Date.now();
    const last = recentlyPushed.get(url) || 0;
    if (now - last < 8000) return false;
    recentlyPushed.set(url, now);
    // 控制 Map 体积
    if (recentlyPushed.size > 200) {
      for (const [key, ts] of recentlyPushed) {
        if (now - ts > 60000) recentlyPushed.delete(key);
      }
    }
    return true;
  }

  /**
   * 点赞 / 收藏即推送：
   * 只处理「未操作 -> 已操作」的按钮（like / bookmark），取消操作不触发。
   */
  async function handleActionClick(event) {
    const target = event.target;
    if (!target || !target.closest) return;

    const likeBtn = target.closest('[data-testid="like"]');
    const bookmarkBtn = likeBtn ? null : target.closest('[data-testid="bookmark"]');
    const btn = likeBtn || bookmarkBtn;
    if (!btn) return;
    if (likeBtn && !pushSettings.like) return;
    if (bookmarkBtn && !pushSettings.bookmark) return;

    const article = btn.closest('article[data-testid="tweet"]');
    if (!article) return;
    const url = getTweetUrl(article);
    if (!url) return;
    if (!markPushed(url)) return;

    await sendIngest(url, getMediaUrl(article));
    showToast(likeBtn ? "已推送点赞帖子到 Eagle" : "已推送收藏帖子到 Eagle");
  }

  /* ------------------------------------------------------------ toast */

  let toastHost = null;

  function showToast(text) {
    if (!toastHost || !toastHost.isConnected) {
      toastHost = document.createElement("div");
      toastHost.id = "evd-eagle-toast-host";
      const shadow = toastHost.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent =
        ".toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);" +
        "background:rgba(0,0,0,.82);color:#fff;font-size:13px;padding:8px 14px;border-radius:999px;" +
        "font-family:-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;" +
        "z-index:2147483647;opacity:0;transition:opacity .18s ease;pointer-events:none;white-space:nowrap;}";
      const toast = document.createElement("div");
      toast.className = "toast";
      shadow.appendChild(style);
      shadow.appendChild(toast);
      document.body.appendChild(toastHost);
      toastHost.__toast = toast;
    }
    const toast = toastHost.__toast;
    toast.textContent = text;
    toast.style.opacity = "1";
    clearTimeout(toastHost.__timer);
    toastHost.__timer = setTimeout(() => {
      toast.style.opacity = "0";
    }, 1800);
  }

  /* ------------------------------------------------------------ sankaku floating button */

  let hostEl = null;

  const FAB_STYLE = `
    .wrap { position: fixed; right: 24px; bottom: 24px; z-index: 2147483647;
      font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
    button { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 16px;
      border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; background: rgba(0,0,0,0.72);
      color: #fff; font-size: 13px; line-height: 1; cursor: pointer;
      box-shadow: 0 6px 20px rgba(0,0,0,0.45); backdrop-filter: blur(6px);
      transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s ease; }
    button:hover { background: rgba(49,151,255,0.9); }
    button:active { transform: scale(0.97); }
    button[data-state="sending"] { opacity: 0.75; cursor: default; }
    button.is-ok { background: rgba(75,217,82,0.9); }
    button.is-error { background: rgba(245,108,108,0.9); }
  `;

  function ensureHost() {
    if (hostEl && hostEl.isConnected) return hostEl;
    hostEl = document.createElement("div");
    hostEl.id = HOST_ID;
    hostEl.style.all = "initial";
    const shadow = hostEl.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = FAB_STYLE;

    const wrap = document.createElement("div");
    wrap.className = "wrap";

    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.dataset.state = "idle";
    btn.innerHTML = '<span aria-hidden="true">&#8681;</span><span class="label">保存到 Eagle</span>';
    btn.title = "把当前页面 / 媒体推送到 Eagle 视频下载器";

    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (btn.dataset.state === "sending") return;
      const label = btn.querySelector(".label");
      const target = resolveSankakuTarget();
      if (!target) {
        btn.dataset.state = "error";
        if (label) label.textContent = "未找到可下载的媒体";
        return;
      }
      btn.dataset.state = "sending";
      if (label) label.textContent = "推送中…";
      const response = await sendIngest(target.url, target.mediaUrl);
      if (response && response.ok) {
        btn.dataset.state = "ok";
        btn.classList.add("is-ok");
        if (label) label.textContent = response.via === "eagle-api" ? "已交给 Eagle" : "已推送";
      } else {
        btn.dataset.state = "error";
        btn.classList.add("is-error");
        if (label) label.textContent = (response && response.error) || "推送失败";
      }
      setTimeout(() => {
        btn.dataset.state = "idle";
        btn.classList.remove("is-ok", "is-error");
        if (label) label.textContent = "保存到 Eagle";
        refreshSankakuButton();
      }, 2400);
    });

    wrap.appendChild(btn);
    shadow.appendChild(style);
    shadow.appendChild(wrap);
    document.body.appendChild(hostEl);
    return hostEl;
  }

  function pickSankakuMedia() {
    const candidates = [];
    for (const video of document.querySelectorAll("video")) {
      if (isVisible(video)) candidates.push(video);
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => areaOf(b) - areaOf(a));
    return candidates[0];
  }

  function resolveSankakuTarget() {
    const url = getSankakuPostUrl();
    if (!url) return null;
    const media = pickSankakuMedia();
    return { url, mediaUrl: media ? getSankakuMediaUrl(media) : null };
  }

  function refreshSankakuButton() {
    const target = resolveSankakuTarget();
    if (!target) {
      if (hostEl && hostEl.isConnected) hostEl.remove();
      return false;
    }
    ensureHost();
    return true;
  }

  /* ------------------------------------------------------------ scan */

  function scan(root) {
    const scope = root || document;
    if (SITE === "twitter") {
      const articles = scope.querySelectorAll('article[data-testid="tweet"]');
      let count = 0;
      for (const article of articles) {
        if (injectForTweet(article)) count++;
      }
      return count;
    }
    if (SITE === "sankaku") {
      return refreshSankakuButton() ? 1 : 0;
    }
    return 0;
  }

  let timer = null;
  function scheduleScan() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      scan();
    }, 300);
  }

  /* ------------------------------------------------------------ lan share menu */

  let pendingShareArticle = null;

  function getLanDevice() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ evdLanDevice: "" }, (values) => resolve((values && values.evdLanDevice) || ""));
      } catch (e) {
        resolve("");
      }
    });
  }

  /** 在推文的分享菜单里插入「分享到局域网设备」 */
  function injectLanShareMenuItem(menu) {
    if (!menu || menu.dataset.evdLanInjected === "1") return false;
    const article = pendingShareArticle;
    if (!article || !article.isConnected) return false;
    const url = getTweetUrl(article);
    if (!url) return false;

    menu.dataset.evdLanInjected = "1";
    const item = document.createElement("div");
    item.setAttribute("role", "menuitem");
    item.className = "evd-eagle-lan-share";
    item.textContent = "分享到局域网设备";
    item.style.cssText = [
      "display:flex",
      "align-items:center",
      "padding:12px 16px",
      "font-size:15px",
      "line-height:20px",
      "color:inherit",
      "cursor:pointer",
      "white-space:nowrap",
    ].join(";");
    item.addEventListener("mouseenter", () => {
      item.style.background = "rgba(255,255,255,0.03)";
    });
    item.addEventListener("mouseleave", () => {
      item.style.background = "transparent";
    });
    item.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const ip = await getLanDevice();
      if (!ip) {
        showToast("请先在扩展弹窗选择局域网设备");
        return;
      }
      let response = null;
      try {
        response = await chrome.runtime.sendMessage({ type: "lan-send", url, ip });
      } catch (e) {
        response = { ok: false, error: "扩展后台不可用" };
      }
      showToast(response && response.ok ? "已发送到 " + ip : (response && response.error) || "发送失败");
      try {
        document.body.click();
      } catch (e) {}
    });
    menu.appendChild(item);
    pendingShareArticle = null;
    return true;
  }

  function setupLanShareMenu() {
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (!target || !target.closest) return;
        const shareBtn = target.closest('[data-testid="share"]');
        if (!shareBtn) return;
        pendingShareArticle = shareBtn.closest('article[data-testid="tweet"]');
        setTimeout(() => {
          const menu = document.querySelector('[role="menu"]');
          if (menu) injectLanShareMenuItem(menu);
        }, 60);
      },
      true
    );

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!node || node.nodeType !== 1 || !pendingShareArticle) continue;
          const menu =
            node.matches && node.matches('[role="menu"]')
              ? node
              : node.querySelector && node.querySelector('[role="menu"]');
          if (menu) injectLanShareMenuItem(menu);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  let started = false;

  function start() {
    if (started) return;
    started = true;
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
    if (!SITE) return;
    scan();
    if (SITE === "twitter") {
      loadPushSettings();
      setupLanShareMenu();
      document.addEventListener("click", (event) => {
        handleActionClick(event).catch(() => {});
      }, true);
    }
    const observer = new MutationObserver(() => scheduleScan());
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
      if (SITE === "sankaku") refreshSankakuButton();
    }, 1200);
    window.addEventListener("popstate", () => scheduleScan());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.__EVD_TEST__ = {
    scan,
    start,
    handleActionClick,
    injectLanShareMenuItem,
    createLanActionButton,
    pushSettings,
    applyStoredSettings,
    injectForTweet,
    createActionButton,
    getTweetUrl,
    getMediaUrl,
    getMediaUrlFrom,
    tweetUrlForMedia,
    getSankakuPostUrl,
    getSankakuPostUrlFor,
    getSankakuMediaUrl,
    refreshSankakuButton,
    findSankakuSidebar,
    hostId: HOST_ID,
    buttonId: BTN_ID,
    site: SITE,
  };
})();
