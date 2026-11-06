// node js/twitter-tags.test.js
const assert = require("assert");
const { SITE_TAG, buildTwitterTags, cleanValue, FIELD_MAX_LENGTH } = require("./twitter-tags");

const tweetMeta = {
  authorId: "44196397",
  id: "1789000000000000000",
  authorScreenName: "nyako_cake",
  authorName: "Nyako",
  description: "今日份的猫 https://t.co/abc123 好可爱",
  extractor: "twitter",
};

// 默认勾选：站点标识 + 推文 ID + 用户名
assert.deepStrictEqual(
  buildTwitterTags(tweetMeta),
  [SITE_TAG, "1789000000000000000", "@nyako_cake"],
  "default prefs should keep site tag, tweet id and @handle"
);

// 传入不完整的偏好对象时，其余字段回落到默认值
assert.deepStrictEqual(buildTwitterTags(tweetMeta, {}), [SITE_TAG, "1789000000000000000", "@nyako_cake"]);

// 全部关闭：只保留站点标识，不因为这次改动额外写入标签
assert.deepStrictEqual(
  buildTwitterTags(tweetMeta, { authorId: false, tweetId: false, screenName: false, name: false, text: false }),
  [SITE_TAG],
  "all unchecked keeps only the site tag"
);

// 五项全开：t.co 短链被去掉，正文折叠空白
assert.deepStrictEqual(
  buildTwitterTags(tweetMeta, { authorId: true, tweetId: true, screenName: true, name: true, text: true }),
  [SITE_TAG, "44196397", "1789000000000000000", "@nyako_cake", "Nyako", "今日份的猫 好可爱"],
  "all checked writes five fields, t.co link removed"
);

// 正文超长按上限截断并补省略号
const longText = "猫".repeat(FIELD_MAX_LENGTH.text + 30);
const longTags = buildTwitterTags({ description: longText }, { text: true });
assert.strictEqual(longTags.length, 2, "site tag + text tag");
assert.strictEqual(longTags[1].length, FIELD_MAX_LENGTH.text, "text tag capped at the configured length");
assert(longTags[1].endsWith("…"), "truncated text tag ends with ellipsis");

// 多行正文合并为单行
assert.strictEqual(cleanValue("第一行\n第二行\t第三行"), "第一行 第二行 第三行");

// yt-dlp 兜底元信息：没有作者数字 ID 时该字段不参与标签，用户名取自 uploader_id
assert.deepStrictEqual(
  buildTwitterTags(
    { id: "1789", uploader_id: "nyako_cake", uploader: "Nyako", description: "hi" },
    { authorId: true, tweetId: true, screenName: true, name: true }
  ),
  [SITE_TAG, "1789", "@nyako_cake", "Nyako"],
  "fallback metadata skips missing author id and uses uploader fields"
);

// 空元信息只写站点标识
assert.deepStrictEqual(buildTwitterTags(null, { text: true, name: true }), [SITE_TAG]);

// 用户名不会重复加 @
assert.strictEqual(
  buildTwitterTags({ authorScreenName: "@nyako" }, { screenName: true })[1],
  "@nyako"
);

console.log("twitter-tags: buildTwitterTags checks passed");
