// node js/twitter-name.test.js
const assert = require("assert");
const { buildTwitterName, sanitizeName, appendPartSuffix, composeImportName, normalizeOrder, moveInOrder, getDefaultPrefs, FIELD_ORDER, FIELD_MAX_LENGTH, NAME_MAX_LENGTH } = require("./twitter-name");

const tweetMeta = {
  authorId: "44196397",
  id: "1789000000000000000",
  authorScreenName: "nyako_cake",
  authorName: "Nyako",
  description: "今日份的猫 https://t.co/abc123 好可爱",
  extractor: "twitter",
};

// 一个字段都没勾：返回空串，调用方回落到默认标题
assert.strictEqual(buildTwitterName(tweetMeta), "");
assert.strictEqual(
  buildTwitterName(tweetMeta, { authorId: false, tweetId: false, screenName: false, name: false, text: false }),
  ""
);

// 只勾用户名字段
assert.strictEqual(buildTwitterName(tweetMeta, { screenName: true }), "@nyako_cake");

// 只勾推文正文：t.co 短链去掉，空白折叠
assert.strictEqual(buildTwitterName(tweetMeta, { text: true }), "今日份的猫 好可爱");

// 前后两个字段按固定顺序拼接，与勾选顺序无关
assert.strictEqual(
  buildTwitterName(tweetMeta, { screenName: true, name: true }),
  "@nyako_cake - Nyako",
  "screenName comes before full name regardless of check order"
);

// 五项全开：固定顺序 作者ID → 推文ID → 用户名 → 正文 → 全名
assert.strictEqual(
  buildTwitterName(tweetMeta, { authorId: true, tweetId: true, screenName: true, name: true, text: true }),
  "44196397 - 1789000000000000000 - @nyako_cake - 今日份的猫 好可爱 - Nyako"
);

// 文件名非法字符被替换，不会留下冒号或斜杠
assert.strictEqual(sanitizeName("a/b:c*d?e\"f<g>h|i"), "a b c d e f g h i");
assert.strictEqual(buildTwitterName({ description: "标题/带:非法*字符" }, { text: true }), "标题 带 非法 字符");

// 超长正文按字段上限截断并补省略号
const longText = "猫".repeat(FIELD_MAX_LENGTH.text + 30);
const longName = buildTwitterName({ description: longText }, { text: true });
assert.strictEqual(longName.length, FIELD_MAX_LENGTH.text, "text field capped before joining");
assert(longName.endsWith("…"), "truncated field ends with ellipsis");

// 多字段拼接后超过总长度上限时按 NAME_MAX_LENGTH 截断
const manyFieldsMeta = {
  authorId: "1".repeat(40),
  id: "2".repeat(40),
  authorScreenName: "user",
  authorName: "N".repeat(60),
  description: "猫".repeat(100),
};
const capped = buildTwitterName(manyFieldsMeta, { authorId: true, tweetId: true, screenName: true, name: true, text: true });
assert.strictEqual(capped.length, NAME_MAX_LENGTH, "joined name capped at the total limit");

// yt-dlp 兜底元信息：没有作者数字 ID 时该字段不参与命名
assert.strictEqual(
  buildTwitterName(
    { id: "1789", uploader_id: "nyako_cake", uploader: "Nyako", description: "hi" },
    { authorId: true, tweetId: true, screenName: true }
  ),
  "1789 - @nyako_cake",
  "fallback metadata skips missing author id"
);

// 空元信息不拼出任何内容
assert.strictEqual(buildTwitterName(null, { text: true, name: true }), "");

// 用户名不会重复加 @
assert.strictEqual(buildTwitterName({ authorScreenName: "@nyako" }, { screenName: true }), "@nyako");

// 用户可调整顺序：拼名按 prefs.order，而不是默认顺序
assert.strictEqual(
  buildTwitterName(tweetMeta, { screenName: true, text: true, order: ["text", "tweetId", "screenName", "authorId", "name"] }),
  "今日份的猫 好可爱 - @nyako_cake",
  "order in prefs decides the join order"
);

// 顺序里只给了部分字段时，缺失字段按默认顺序补到末尾
assert.deepStrictEqual(normalizeOrder(["text", "screenName"]), ["text", "screenName", "authorId", "tweetId", "name"]);
assert.deepStrictEqual(normalizeOrder(["text", "text", "bogus"]), ["text", "authorId", "tweetId", "screenName", "name"]);
assert.deepStrictEqual(normalizeOrder(null), FIELD_ORDER.slice());
assert.deepStrictEqual(getDefaultPrefs().order, FIELD_ORDER.slice(), "default prefs carry the default order");

// 上移 / 下移一格，首行上移与末行下移越界返回 null
assert.deepStrictEqual(moveInOrder(FIELD_ORDER, "tweetId", "up"), ["tweetId", "authorId", "screenName", "text", "name"]);
assert.deepStrictEqual(moveInOrder(FIELD_ORDER, "name", "up"), ["authorId", "tweetId", "screenName", "name", "text"]);
assert.strictEqual(moveInOrder(FIELD_ORDER, "authorId", "up"), null, "first row cannot move up");
assert.strictEqual(moveInOrder(FIELD_ORDER, "name", "down"), null, "last row cannot move down");

// 调整顺序后，同名两字段的拼接顺序随之变化：把「推特全名」上移两次到用户名之前
const movedOnce = moveInOrder(FIELD_ORDER, "name", "up");
const movedTwice = moveInOrder(movedOnce, "name", "up");
assert.deepStrictEqual(movedTwice, ["authorId", "tweetId", "name", "screenName", "text"]);
assert.strictEqual(
  buildTwitterName(tweetMeta, { screenName: true, name: true, order: movedTwice }),
  "Nyako - @nyako_cake",
  "moving full name above username flips the joined order"
);

// 同一条推文多个文件：末尾追加 (i/N)，单个文件不加
assert.strictEqual(appendPartSuffix("名字", 2, 3, 150), "名字 (2/3)");
assert.strictEqual(appendPartSuffix("名字", 1, 1, 150), "名字");
assert.strictEqual(appendPartSuffix("名字", 0, 5, 150), "名字");
assert.strictEqual(appendPartSuffix("名字", 1, 0, 150), "名字");

// 加序号后仍受总长度上限约束
const suffixBase = "猫".repeat(NAME_MAX_LENGTH);
const suffixed = appendPartSuffix(suffixBase, 3, 4, NAME_MAX_LENGTH);
assert.strictEqual(suffixed.length, NAME_MAX_LENGTH, "suffix keeps the total length within the limit");
assert(suffixed.endsWith(" (3/4)"), "suffix is preserved at the end");

// 一推多图：同一份元信息生成的名称靠序号区分，三张图互不相同
const multiImageNames = [1, 2, 3].map((index) =>
  composeImportName(tweetMeta, { text: true }, { index, total: 3 }, "downloaded")
);
assert.strictEqual(multiImageNames[0], "今日份的猫 好可爱 (1/3)");
assert.strictEqual(multiImageNames[2], "今日份的猫 好可爱 (3/3)");
assert.strictEqual(new Set(multiImageNames).size, 3, "multi-image names are unique");

// 未勾选任何字段时沿用标题，同样带序号
assert.strictEqual(
  composeImportName(Object.assign({}, tweetMeta, { title: "正文 - @nyako_cake" }), {}, { index: 2, total: 2 }, "downloaded"),
  "正文 - @nyako_cake (2/2)"
);

// 非推特站点不受字段规则影响，只追加序号
assert.strictEqual(
  composeImportName({ extractor: "youtube", title: "YouTube 视频" }, { text: true }, { index: 1, total: 2 }, "downloaded"),
  "YouTube 视频 (1/2)"
);

// 单个文件不加序号
assert.strictEqual(composeImportName(tweetMeta, { text: true }, { index: 0, total: 0 }, "downloaded"), "今日份的猫 好可爱");

// 没有任何可用的名字时回落到兜底文案
assert.strictEqual(composeImportName({}, {}, null, "downloaded video"), "downloaded video");

console.log("twitter-name: buildTwitterName checks passed");
