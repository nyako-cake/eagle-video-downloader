/* Eagle 视频下载助手 — 后台 service worker
 * 优先把链接推给本机 Eagle 插件（127.0.0.1:43110，走 yt-dlp 下载）；
 * 插件没开或未就绪时，退回到 Eagle 官方本地 API（127.0.0.1:41595）直接收直链。
 */

const BRIDGE_INGEST = "http://127.0.0.1:43110/ingest";
const BRIDGE_PING = "http://127.0.0.1:43110/ping";
const EAGLE_ADD_URL = "http://127.0.0.1:41595/api/item/addFromURL";

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 4000);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeDirectMedia(url) {
  if (typeof url !== "string") return false;
  return /^https:\/\/video\.twimg\.com\/.+/i.test(url);
}

async function pushToPlugin(payload) {
  const response = await fetchWithTimeout(
    BRIDGE_INGEST,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
    },
    4000
  );
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }
  return { status: response.status, data };
}

async function pushToEagleApi(mediaUrl, tweetUrl) {
  const body = {
    url: mediaUrl,
    name: "Twitter video",
    website: tweetUrl,
  };
  const response = await fetchWithTimeout(
    EAGLE_ADD_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    6000
  );
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }
  return { status: response.status, data };
}

async function ingest(message) {
  const url = typeof message.url === "string" ? message.url.trim() : "";
  const mediaUrl = typeof message.mediaUrl === "string" ? message.mediaUrl.trim() : "";
  if (!/^https:\/\/(x|twitter|mobile\.twitter)\.com\//i.test(url)) {
    return { ok: false, error: "不是有效的推文链接" };
  }

  let pluginStatus = 0;
  try {
    const result = await pushToPlugin({ url, mediaUrl: mediaUrl || null });
    pluginStatus = result.status;
    if (result.status === 200 && result.data && result.data.ok) {
      return { ok: true, via: "plugin" };
    }
  } catch (e) {
    pluginStatus = 0;
  }

  if (looksLikeDirectMedia(mediaUrl)) {
    try {
      const result = await pushToEagleApi(mediaUrl, url);
      if (result.status >= 200 && result.status < 300) {
        return { ok: true, via: "eagle-api" };
      }
    } catch (e) {
      // ignore, fall through to the error below
    }
  }

  if (pluginStatus === 503) {
    return { ok: false, error: "插件未就绪（依赖未安装）" };
  }
  return { ok: false, error: "请先打开 Eagle 插件" };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || sender.id !== chrome.runtime.id) return false;

  if (message.type === "ingest") {
    ingest(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: (error && error.message) || "未知错误" }));
    return true;
  }

  if (message.type === "ping") {
    (async () => {
      let plugin = { ok: false, ready: false };
      try {
        const response = await fetchWithTimeout(BRIDGE_PING, { method: "GET" }, 1500);
        const data = await response.json().catch(() => null);
        plugin = { ok: response.ok, ready: !!(data && data.ready) };
      } catch (e) {
        plugin = { ok: false, ready: false };
      }
      sendResponse({ ok: true, plugin });
    })();
    return true;
  }

  return false;
});
