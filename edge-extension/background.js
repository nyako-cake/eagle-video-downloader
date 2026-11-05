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
  if (/^https:\/\/video\.twimg\.com\/.+/i.test(url)) return true;
  if (/^https:\/\/pbs\.twimg\.com\/.+/i.test(url)) return true;
  return /^https:\/\/(?:[a-z0-9-]+\.)*sankakucomplex\.com\/.+/i.test(url);
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

const EAGLE_SCRIPT_API = "http://127.0.0.1:41595/api/script/inject";
const PLUGIN_ID = "75328212-f4fd-4152-952d-26aa1bfcedf9";

const WAKE_SCRIPT = [
  "(function () {",
  "  try {",
  "    const path = require('path');",
  "    const fs = require('fs');",
  "    const dirs = [];",
  "    if (process.env.APPDATA) dirs.push(path.join(process.env.APPDATA, 'Eagle', 'Plugins', '" + PLUGIN_ID + "'));",
  "    if (process.env.HOME) {",
  "      dirs.push(path.join(process.env.HOME, 'Library', 'Application Support', 'Eagle', 'Plugins', '" + PLUGIN_ID + "'));",
  "      dirs.push(path.join(process.env.HOME, '.config', 'Eagle', 'Plugins', '" + PLUGIN_ID + "'));",
  "    }",
  "    const base = dirs.find((p) => fs.existsSync(path.join(p, 'manifest.json')));",
  "    if (!base) return;",
  "    const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));",
  "    const { ipcRenderer } = require('electron');",
  "    ipcRenderer.invoke('create-plugin-window', { plugin: { manifest: manifest, path: base }, args: {} });",
  "  } catch (e) {}",
  "})();",
].join("\n");

/** 通过 Eagle 本地 API 打开插件窗口，并等待桥接端口就绪 */
async function wakePlugin() {
  try {
    await fetchWithTimeout(
      EAGLE_SCRIPT_API,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: WAKE_SCRIPT }),
      },
      5000
    );
  } catch (e) {
    return false;
  }

  for (let i = 0; i < 12; i++) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      const response = await fetchWithTimeout(BRIDGE_PING, { method: "GET" }, 1500);
      if (response.ok) return true;
    } catch (e) {
      // keep waiting
    }
  }
  return false;
}

const BRIDGE_PEERS = "http://127.0.0.1:43110/peers";

function isPrivateIp(ip) {
  return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

/** 让本机插件扫描同网段内运行本插件的设备 */
async function getLanPeers() {
  const readPeers = async () => {
    const response = await fetchWithTimeout(BRIDGE_PEERS, { method: "GET" }, 25000);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error("bad-response");
    return Array.isArray(data.peers) ? data.peers : [];
  };

  try {
    return { ok: true, peers: await readPeers() };
  } catch (e) {
    // 本机插件没开时先唤醒，再读设备列表
    const woke = await wakePlugin();
    if (!woke) return { ok: false, error: "本机插件未运行，无法扫描局域网设备" };
    try {
      return { ok: true, peers: await readPeers() };
    } catch (e2) {
      return { ok: false, error: "读取设备列表失败" };
    }
  }
}

/** 只把链接发送到局域网设备，不在本机下载 */
async function sendToLan(url, ip) {
  if (!ip || !isPrivateIp(ip)) return { ok: false, error: "无效的局域网地址" };
  const isTweetUrl = /^https:\/\/(x|twitter|mobile\.twitter)\.com\//i.test(url);
  const isSankakuUrl = /^https:\/\/(?:[a-z0-9-]+\.)*sankaku(?:complex)?\.(?:app|com)\//i.test(url);
  if (!isTweetUrl && !isSankakuUrl) return { ok: false, error: "不支持的页面链接" };

  try {
    const response = await fetchWithTimeout(
      "http://" + ip + ":43110/ingest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      },
      8000
    );
    const data = await response.json().catch(() => null);
    if (response.ok && data && data.ok) return { ok: true };
    if (response.status === 503) return { ok: false, error: "目标设备插件未就绪" };
    return { ok: false, error: (data && data.error) || "发送失败" };
  } catch (e) {
    return { ok: false, error: "无法连接设备（请确认同网段且插件已打开）" };
  }
}

async function ingest(message) {
  const url = typeof message.url === "string" ? message.url.trim() : "";
  const mediaUrl = typeof message.mediaUrl === "string" ? message.mediaUrl.trim() : "";
  const isTweetUrl = /^https:\/\/(x|twitter|mobile\.twitter)\.com\//i.test(url);
  const isSankakuUrl = /^https:\/\/(?:[a-z0-9-]+\.)*sankaku(?:complex)?\.(?:app|com)\//i.test(url);
  if (!isTweetUrl && !isSankakuUrl) {
    return { ok: false, error: "不支持的页面链接" };
  }

  let pluginStatus = 0;
  let woke = false;
  try {
    const result = await pushToPlugin({ url, mediaUrl: mediaUrl || null });
    pluginStatus = result.status;
    if (result.status === 200 && result.data && result.data.ok) {
      return { ok: true, via: "plugin" };
    }
  } catch (e) {
    pluginStatus = 0;
  }

  // 插件窗口没开：先尝试唤醒，再重试一次
  if (pluginStatus === 0) {
    woke = await wakePlugin();
    if (woke) {
      try {
        const retry = await pushToPlugin({ url, mediaUrl: mediaUrl || null });
        pluginStatus = retry.status;
        if (retry.status === 200 && retry.data && retry.data.ok) {
          return { ok: true, via: "plugin" };
        }
      } catch (e) {
        pluginStatus = 0;
      }
    }
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
  if (woke) {
    return { ok: false, error: "已尝试唤醒 Eagle 插件但失败，请手动打开" };
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

  if (message.type === "lan-peers") {
    getLanPeers()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: (error && error.message) || "未知错误" }));
    return true;
  }

  if (message.type === "lan-send") {
    const url = typeof message.url === "string" ? message.url.trim() : "";
    const ip = typeof message.ip === "string" ? message.ip.trim() : "";
    sendToLan(url, ip)
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
