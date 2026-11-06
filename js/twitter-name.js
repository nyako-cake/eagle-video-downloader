/**
 * 推特 / X 来源的导入素材命名。
 *
 * 按用户勾选的字段拼成 Eagle 素材名：推特 ID（作者数字 ID）、推文 ID、
 * 用户名、推文正文、推特全名，顺序固定并用「 - 」连接。
 * 一个字段都没勾时返回空串，交由调用方回落到默认标题（推文正文 - @用户名）。
 */

/** 各字段参与命名时的长度上限，避免正文过长把文件名撑爆 */
const FIELD_MAX_LENGTH = {
  authorId: 40,
  tweetId: 40,
  screenName: 40,
  name: 60,
  text: 100,
};

/** 默认全部不勾：不改变现有命名（推文正文 - @用户名） */
const DEFAULT_PREFS = {
  authorId: false,
  tweetId: false,
  screenName: false,
  name: false,
  text: false,
};

/** 字段拼接顺序固定，与勾选顺序无关：推特 ID → 推文 ID → 用户名 → 推文正文 → 推特全名 */
const FIELD_ORDER = ["authorId", "tweetId", "screenName", "text", "name"];

/** 拼接后的总长度上限 */
const NAME_MAX_LENGTH = 150;

function getDefaultPrefs() {
  return Object.assign({}, DEFAULT_PREFS);
}

/**
 * 清洗单个字段值：去 t.co 短链、折叠空白、超长截断
 * @param {*} raw
 * @param {number} maxLength
 * @returns {string}
 */
function cleanValue(raw, maxLength) {
  let value = String(raw == null ? "" : raw)
    .replace(/https:\/\/t\.co\/\S+/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return "";
  if (maxLength && value.length > maxLength) {
    value = value.slice(0, maxLength - 1).trimEnd() + "…";
  }
  return value;
}

/**
 * 去掉 Windows / macOS 文件名非法字符，并清理首尾的空格与点
 * @param {string} value
 * @returns {string}
 */
function sanitizeName(value) {
  return String(value == null ? "" : value)
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "");
}

/**
 * 从元信息里取五个字段的可写入值。
 * 视频走 yt-dlp 兜底时元信息只有 uploader / uploader_id，这里一并兼容。
 * @param {Object} metadata
 */
function fieldValues(metadata) {
  const meta = metadata || {};
  const screenName = String(meta.authorScreenName || meta.uploader_id || "").replace(/^@+/, "");
  return {
    authorId: cleanValue(meta.authorId, FIELD_MAX_LENGTH.authorId),
    tweetId: cleanValue(meta.id, FIELD_MAX_LENGTH.tweetId),
    screenName: screenName ? "@" + cleanValue(screenName, FIELD_MAX_LENGTH.screenName) : "",
    name: cleanValue(meta.authorName || meta.uploader, FIELD_MAX_LENGTH.name),
    text: cleanValue(meta.description, FIELD_MAX_LENGTH.text),
  };
}

/**
 * 生成推特素材名
 * @param {Object} metadata 下载元信息
 * @param {Object} prefs 勾选状态 { authorId, tweetId, screenName, name, text }
 * @returns {string} 空串表示未勾选任何字段，调用方应回落到默认标题
 */
function buildTwitterName(metadata, prefs) {
  const enabled = Object.assign(getDefaultPrefs(), prefs || {});
  const values = fieldValues(metadata);
  const parts = [];
  for (const field of FIELD_ORDER) {
    if (!enabled[field]) continue;
    const value = values[field];
    if (value) parts.push(value);
  }
  if (!parts.length) return "";
  const joined = sanitizeName(parts.join(" - "));
  return joined.length > NAME_MAX_LENGTH ? joined.slice(0, NAME_MAX_LENGTH).trimEnd() : joined;
}

module.exports = {
  DEFAULT_PREFS,
  FIELD_ORDER,
  FIELD_MAX_LENGTH,
  NAME_MAX_LENGTH,
  getDefaultPrefs,
  buildTwitterName,
  cleanValue,
  sanitizeName,
};
