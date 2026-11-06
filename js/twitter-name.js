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

/** 字段拼接顺序，用户可在设置页用上下箭头调整 */
const FIELD_ORDER = ["authorId", "tweetId", "screenName", "text", "name"];

/** 默认拼接顺序：推特 ID → 推文 ID → 用户名 → 推文正文 → 推特全名 */
const DEFAULT_ORDER = FIELD_ORDER.slice();

/**
 * 校正用户保存的顺序：丢掉不认识的字段与重复项，再把漏掉的字段按默认顺序补到末尾，
 * 保证返回一个包含全部字段的完整顺序。
 * @param {Array} order
 * @returns {string[]}
 */
function normalizeOrder(order) {
  const result = [];
  if (Array.isArray(order)) {
    for (const field of order) {
      if (FIELD_ORDER.includes(field) && !result.includes(field)) result.push(field);
    }
  }
  for (const field of FIELD_ORDER) {
    if (!result.includes(field)) result.push(field);
  }
  return result;
}

/** 拼接后的总长度上限 */
const NAME_MAX_LENGTH = 150;

function getDefaultPrefs() {
  return Object.assign({ order: DEFAULT_ORDER.slice() }, DEFAULT_PREFS);
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
 * @param {Object} prefs 勾选状态 { authorId, tweetId, screenName, text, name, order }
 * @returns {string} 空串表示未勾选任何字段，调用方应回落到默认标题
 */
function buildTwitterName(metadata, prefs) {
  const enabled = Object.assign(getDefaultPrefs(), prefs || {});
  const values = fieldValues(metadata);
  const parts = [];
  for (const field of normalizeOrder(enabled.order)) {
    if (!enabled[field]) continue;
    const value = values[field];
    if (value) parts.push(value);
  }
  if (!parts.length) return "";
  const joined = sanitizeName(parts.join(" - "));
  return joined.length > NAME_MAX_LENGTH ? joined.slice(0, NAME_MAX_LENGTH).trimEnd() : joined;
}

/**
 * 同一条推文有多个文件（多图 / 多视频）时，在名称末尾追加「 (i/N)」，
 * 避免同一份元信息生成完全相同的名称而互相覆盖。
 * @param {string} name
 * @param {number} index 第几个，1 起
 * @param {number} total 总个数
 * @param {number} [limit] 总长度上限，默认 NAME_MAX_LENGTH
 * @returns {string}
 */
function appendPartSuffix(name, index, total, limit) {
  const idx = Number(index) || 0;
  const all = Number(total) || 0;
  if (all <= 1 || idx <= 0) return name;
  const suffix = ` (${idx}/${all})`;
  const max = Number(limit) || NAME_MAX_LENGTH;
  const base = String(name == null ? "" : name)
    .slice(0, Math.max(1, max - suffix.length))
    .trimEnd();
  return base + suffix;
}

/**
 * 把某个字段在顺序里上移或下移一格
 * @param {string[]} order
 * @param {string} field
 * @param {"up"|"down"} direction
 * @returns {string[]|null} 越界或字段不存在时返回 null
 */
function moveInOrder(order, field, direction) {
  const list = normalizeOrder(order);
  const index = list.indexOf(field);
  const target = index + (direction === "up" ? -1 : 1);
  if (index < 0 || target < 0 || target >= list.length) return null;
  const moved = list[target];
  list[target] = list[index];
  list[index] = moved;
  return list;
}

/**
 * 组装最终导入名：推特按勾选字段拼名，否则用适配器标题，再按 (i/N) 追加序号。
 * @param {Object} metadata
 * @param {Object} prefs
 * @param {{index: number, total: number}} [part]
 * @param {string} [fallbackTitle] 没有标题时的兜底文案
 * @returns {string}
 */
function composeImportName(metadata, prefs, part, fallbackTitle) {
  const meta = metadata || {};
  const isTwitter = String(meta.extractor || "").toLowerCase() === "twitter";
  const composed = isTwitter ? buildTwitterName(meta, prefs) : "";
  const base = composed || meta.title || fallbackTitle || "";
  const limit = composed ? NAME_MAX_LENGTH : 180;
  return appendPartSuffix(base, part && part.index, part && part.total, limit);
}

module.exports = {
  DEFAULT_PREFS,
  FIELD_ORDER,
  DEFAULT_ORDER,
  FIELD_MAX_LENGTH,
  NAME_MAX_LENGTH,
  getDefaultPrefs,
  normalizeOrder,
  moveInOrder,
  buildTwitterName,
  appendPartSuffix,
  composeImportName,
  cleanValue,
  sanitizeName,
};
