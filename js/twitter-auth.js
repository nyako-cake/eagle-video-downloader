/**
 * Twitter / X 账号凭证：保存 auth_token 与 ct0，并构造 x.com 内部接口所需的请求头。
 * 只保存在本机 localStorage。
 */

const { scopedKey } = require("./library-context");

const STORAGE_KEY = "eagle-video-downloader.twitterAuth";

// 公开的 Web 客户端 Bearer（网页端所有内部请求都用它）
const PUBLIC_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

function currentKey() {
  return scopedKey(STORAGE_KEY);
}

/** 旧版本把凭证存在全局 key 下，切换后首次读取时复制到当前资源库 */
function migrateLegacyKey(key) {
  try {
    if (key === STORAGE_KEY) return;
    if (localStorage.getItem(key) === null) {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy !== null) localStorage.setItem(key, legacy);
    }
  } catch (e) {
    // ignore
  }
}

function getStoredCookie() {
  try {
    const key = currentKey();
    migrateLegacyKey(key);
    return localStorage.getItem(key) || "";
  } catch (e) {
    return "";
  }
}

function setStoredCookie(value) {
  try {
    const key = currentKey();
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {
    // ignore storage failures
  }
}

/** 由两个输入框的值拼出内部保存的 cookie 串 */
function buildCookie(authToken, ct0) {
  const token = String(authToken || "").trim();
  const csrf = String(ct0 || "").trim();
  if (!token || !csrf) return "";
  return `auth_token=${token}; ct0=${csrf}`;
}

/** 从保存的 cookie 串里取出两个值 */
function splitCookie(raw) {
  const text = raw === undefined ? getStoredCookie() : String(raw || "");
  const map = {};
  text.split(/;\s*/).forEach((pair) => {
    const index = pair.indexOf("=");
    if (index <= 0) return;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (key && value) map[key] = value;
  });
  return { authToken: map.auth_token || "", ct0: map.ct0 || "", map };
}

function hasAuth(raw) {
  const parts = splitCookie(raw);
  return !!(parts.authToken && parts.ct0);
}

function getAuth(raw) {
  const parts = splitCookie(raw);
  if (!parts.authToken || !parts.ct0) return null;

  const cookie = `auth_token=${parts.authToken}; ct0=${parts.ct0}`;
  return {
    cookie,
    csrf: parts.ct0,
    headers: {
      cookie,
      authorization: "Bearer " + PUBLIC_BEARER,
      "x-csrf-token": parts.ct0,
      "x-twitter-auth-type": "OAuth2Session",
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en",
      "content-type": "application/json",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      accept: "application/json",
      referer: "https://x.com/",
    },
  };
}

module.exports = {
  getStoredCookie,
  setStoredCookie,
  buildCookie,
  splitCookie,
  hasAuth,
  getAuth,
};
