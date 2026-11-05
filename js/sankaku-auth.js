/**
 * Sankaku 账号凭证存储。
 *
 * 站点登录后把 accessToken 存在 cookie 里，前端每次请求都以
 * `Authorization: Bearer <accessToken>` 发送。插件允许用户把浏览器里的
 * accessToken（或整段 cookie）粘贴到设置中，这里负责保存与解析。
 */

const { scopedKey } = require("./library-context");

const STORAGE_KEY = "eagle-video-downloader.sankakuAuth";

function currentKey() {
  if (typeof localStorage === "undefined") return STORAGE_KEY;
  return scopedKey(STORAGE_KEY);
}

function migrateLegacyKey(key) {
  try {
    if (typeof localStorage === "undefined" || key === STORAGE_KEY) return;
    if (localStorage.getItem(key) === null) {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy !== null) localStorage.setItem(key, legacy);
    }
  } catch (e) {
    // ignore
  }
}

function getStoredAuth() {
  try {
    if (typeof localStorage === "undefined") return "";
    const key = currentKey();
    migrateLegacyKey(key);
    return localStorage.getItem(key) || "";
  } catch (e) {
    return "";
  }
}

function setStoredAuth(value) {
  try {
    if (typeof localStorage === "undefined") return;
    const key = currentKey();
    const text = String(value || "").trim();
    if (!text) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, text);
  } catch (e) {
    // ignore storage failures (private mode, quota, ...)
  }
}

/**
 * 从用户输入中解析 accessToken：
 * - 纯 token：原样返回
 * - cookie 串（accessToken=xxx; refreshToken=yyy）：抽出 accessToken
 */
function parseAccessToken(raw) {
  const text = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!text) return "";
  if (!text.includes("=")) return text;

  for (const part of text.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name === "accessToken" && value) return value;
  }
  return "";
}

function getAccessToken() {
  return parseAccessToken(getStoredAuth());
}

/**
 * 生成带登录态的请求头（未登录时返回基础头）。
 */
function buildAuthHeaders(baseHeaders) {
  const headers = { ...(baseHeaders || {}) };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

module.exports = {
  STORAGE_KEY,
  getStoredAuth,
  setStoredAuth,
  parseAccessToken,
  getAccessToken,
  buildAuthHeaders,
};
