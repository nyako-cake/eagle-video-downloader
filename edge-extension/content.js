/* Eagle 视频下载助手 — X / Twitter 内容脚本
 * 在每条含视频/动图的推文媒体下方插入一个「保存到 Eagle」按钮，
 * 点击后把推文链接（以及可选的直链）推送给本机 Eagle 插件。
 */
(function () {
  "use strict";

  const WRAP_CLASS = "evd-eagle-wrap";
  const BTN_CLASS = "evd-eagle-btn";
  const INJECTED_FLAG = "evdInjected";

  function textOf(el) {
    return (el && el.textContent ? el.textContent : "").trim();
  }

  /** 从推文 article 里找出这条推文的永久链接 */
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

  /** 视频/动图的直链（拿不到就返回 null，插件仍可按推文链接下载） */
  function getMediaUrl(article) {
    const video = article && article.querySelector("video");
    if (!video) return null;
    const src = video.currentSrc || video.src || "";
    if (/^https:\/\/video\.twimg\.com\//i.test(src)) return src;
    const source = video.querySelector("source[src]");
    const sourceSrc = source ? source.getAttribute("src") || "" : "";
    return /^https:\/\/video\.twimg\.com\//i.test(sourceSrc) ? sourceSrc : null;
  }

  function findMediaContainer(article) {
    const video = article.querySelector("video");
    if (!video) return null;
    return (
      video.closest('[data-testid="videoPlayer"]') ||
      video.closest('[data-testid="tweetPhoto"]') ||
      video.closest('[data-testid="tweetVideo"]') ||
      video
    );
  }

  /** 把按钮插到媒体块下方（跳过外层的 <a>，避免点击触发跳转） */
  function insertAfterMedia(article, wrap) {
    const container = findMediaContainer(article);
    if (!container) return false;
    let anchor = container;
    while (anchor.parentElement && anchor.parentElement.tagName === "A") {
      anchor = anchor.parentElement;
    }
    const parent = anchor.parentElement;
    if (!parent) return false;
    parent.insertBefore(wrap, anchor.nextSibling);
    return true;
  }

  function createButton(tweetUrl, mediaUrl) {
    const wrap = document.createElement("div");
    wrap.className = WRAP_CLASS;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = BTN_CLASS;
    btn.innerHTML = '<span class="evd-eagle-icon" aria-hidden="true">&#8681;</span><span class="evd-eagle-label">保存到 Eagle</span>';
    btn.title = "把这条推文推送到 Eagle 视频下载器";
    btn.dataset.state = "idle";

    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (btn.dataset.state === "sending") return;
      const label = btn.querySelector(".evd-eagle-label");

      btn.dataset.state = "sending";
      if (label) label.textContent = "推送中…";
      let response = null;
      try {
        response = await chrome.runtime.sendMessage({ type: "ingest", url: tweetUrl, mediaUrl: mediaUrl || null });
      } catch (e) {
        response = { ok: false, error: "扩展后台不可用" };
      }

      if (response && response.ok) {
        btn.dataset.state = "ok";
        if (label) label.textContent = response.via === "eagle-api" ? "已交给 Eagle" : "已推送";
        btn.classList.add("is-ok");
      } else {
        btn.dataset.state = "error";
        if (label) label.textContent = (response && response.error) || "推送失败";
        btn.classList.add("is-error");
      }
      setTimeout(() => {
        btn.dataset.state = "idle";
        btn.classList.remove("is-ok", "is-error");
        if (label) label.textContent = "保存到 Eagle";
      }, 2600);
    });

    wrap.appendChild(btn);
    return wrap;
  }

  function injectForArticle(article) {
    if (!article || article.dataset[INJECTED_FLAG] === "1") return false;
    if (article.querySelector("." + BTN_CLASS)) {
      article.dataset[INJECTED_FLAG] = "1";
      return false;
    }
    const tweetUrl = getTweetUrl(article);
    if (!tweetUrl) return false;
    const wrap = createButton(tweetUrl, getMediaUrl(article));
    if (!insertAfterMedia(article, wrap)) return false;
    article.dataset[INJECTED_FLAG] = "1";
    return true;
  }

  function scan(root) {
    const scope = root || document;
    const articles = scope.querySelectorAll('article[data-testid="tweet"]');
    let count = 0;
    for (const article of articles) {
      if (injectForArticle(article)) count++;
    }
    return count;
  }

  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scan();
    }, 300);
  }

  function start() {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
    scan();
    const observer = new MutationObserver(() => scheduleScan());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  // 便于自动化测试；正常使用时只是挂在 window 上的几个纯函数
  window.__EVD_TEST__ = { scan, injectForArticle, getTweetUrl, getMediaUrl, createButton };
})();
