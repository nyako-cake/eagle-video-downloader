/**
 * 推特 / X 来源自动标签。
 *
 * 按用户勾选的字段生成 Eagle 标签：站点标识 twitter 始终写入，
 * 作者数字 ID / 推文 ID / 用户名 / 推特全名 / 推文正文由开关控制。
 * 推文正文会去掉 t.co 短链并压缩空白，超长时截断，避免生成难以检索的超长标签。
 */

const SITE_TAG = "twitter";

/** 各字段的标签长度上限：标识类字段保持原样，正文按可检索性截断 */
const FIELD_MAX_LENGTH = {
  authorId: 40,
  tweetId: 40,
  screenName: 40,
  name: 60,
  text: 120,
};

/** 默认只开「用户名」与「推文 ID」，其余字段按需勾选 */
const DEFAULT_PREFS = {
  authorId: false,
  tweetId: true,
  screenName: true,
  name: false,
  text: false,
};

/** 标签写入顺序固定，与勾选状态无关 */
const FIELD_ORDER = ["authorId", "tweetId", "screenName", "name", "text"];

function getDefaultPrefs() {
  return Object.assign({}, DEFAULT_PREFS);
}

/**
 * 清洗标签值：去 t.co 短链、折叠空白，超长截断并补省略号
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
 * 生成推特素材的 Eagle 标签
 * @param {Object} metadata 下载元信息
 * @param {Object} prefs 勾选状态 { authorId, tweetId, screenName, name, text }
 * @returns {string[]}
 */
function buildTwitterTags(metadata, prefs) {
  const enabled = Object.assign(getDefaultPrefs(), prefs || {});
  const values = fieldValues(metadata);
  const tags = [SITE_TAG];
  for (const field of FIELD_ORDER) {
    if (!enabled[field]) continue;
    const value = values[field];
    if (value && !tags.includes(value)) tags.push(value);
  }
  return tags.slice(0, 30);
}

module.exports = {
  SITE_TAG,
  DEFAULT_PREFS,
  FIELD_ORDER,
  FIELD_MAX_LENGTH,
  getDefaultPrefs,
  buildTwitterTags,
  cleanValue,
};
