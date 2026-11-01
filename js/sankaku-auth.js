/**
 * Sankaku 账号凭证存储。
 *
 * 站点登录后把 accessToken 存在 cookie 里，前端每次请求都以
 * `Authorization: Bearer <accessToken>` 发送。插件允许用户把浏览器里的
 * accessToken（或整段 cookie）粘贴到设置中，这里负责保存与解析。
 */

const STORAGE_KEY = "eagle-video-downloader.sankakuAuth";

function getStoredAuth() {
  try {
    if (typeof localStorage === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch (e) {
    return "";
  }
}

function setStoredAuth(value) {
  try {
    if (typeof localStorage === "undefined") return;
    const text = String(value || "").trim();
    if (!text) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, text);
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
