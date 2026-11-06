// node js/twitter-name.import.test.js
// 在 Node 里给 plugin.js 造最小的宿主环境，验证「拼名 + 顺序持久化」这条链路。
const assert = require("assert");

global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] === undefined ? null : this.store[key];
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
};

global.document = {
  getElementById() {
    return null;
  },
  addEventListener() {},
  querySelectorAll() {
    return [];
  },
  createElement() {
    return {};
  },
  body: { appendChild() {} },
};

global.window = global;
function stub() {
  return new Proxy(function () {}, { get: () => stub(), apply: () => stub() });
}
global.eagle = stub();

const plugin = require("./plugin");

const tweet = {
  extractor: "twitter",
  id: "1789000000000000000",
  authorId: "44196397",
  authorScreenName: "nyako_cake",
  authorName: "Nyako",
  description: "今日份的猫 https://t.co/abc 好可爱",
  title: "今日份的猫 好可爱 - @nyako_cake",
};

// 默认任何字段都不勾：沿用适配器标题
assert.strictEqual(plugin.buildImportName(tweet), tweet.title);

// 勾选后按默认顺序拼名：默认是用户名在正文之前
plugin.setTwitterNamePref("screenName", true);
plugin.setTwitterNamePref("text", true);
assert.strictEqual(plugin.buildImportName(tweet), "@nyako_cake - 今日份的猫 好可爱");

// 把正文上移一格，顺序立刻生效（正文到用户名之前）
assert.deepStrictEqual(plugin.moveTwitterNameField("text", "up"), ["authorId", "tweetId", "text", "screenName", "name"]);
assert.strictEqual(plugin.buildImportName(tweet), "今日份的猫 好可爱 - @nyako_cake");
assert.deepStrictEqual(plugin.moveTwitterNameField("screenName", "down"), ["authorId", "tweetId", "text", "name", "screenName"]);
plugin.setTwitterNamePref("name", true);
assert.strictEqual(plugin.buildImportName(tweet), "今日份的猫 好可爱 - Nyako - @nyako_cake");

// 顺序越界不生效，返回 null 且不改动已保存的顺序
assert.strictEqual(plugin.moveTwitterNameField("authorId", "up"), null);
assert.strictEqual(plugin.moveTwitterNameField("screenName", "down"), null);

// 多图：同一份元信息按 (i/N) 区分
const multi = [1, 2].map((index) => plugin.buildImportName(tweet, { index, total: 2 }));
assert.deepStrictEqual(multi, ["今日份的猫 好可爱 - Nyako - @nyako_cake (1/2)", "今日份的猫 好可爱 - Nyako - @nyako_cake (2/2)"]);

// 非推特站点只追加序号
assert.strictEqual(
  plugin.buildImportName({ extractor: "youtube", title: "YouTube 视频" }, { index: 1, total: 2 }),
  "YouTube 视频 (1/2)"
);

// 写坏的顺序（重复项、未知字段）读取时被校正，不会把字段弄丢
global.localStorage.setItem(
  "eagle-video-downloader.twitterName",
  JSON.stringify({ text: true, order: ["screenName", "screenName", "bogus"] })
);
assert.deepStrictEqual(plugin.getTwitterNamePrefs().order, ["screenName", "authorId", "tweetId", "text", "name"]);

// ---------------- 注释规则 ----------------

// 默认一项都不勾：注释仍是推文正文原文（含 t.co 链接，和旧行为一致）
assert.strictEqual(plugin.buildImportAnnotation(tweet), "今日份的猫 https://t.co/abc 好可爱");

// 勾选后按注释规则拼接，不影响已保存的名字规则
plugin.setTwitterAnnotationPref("text", true);
plugin.setTwitterAnnotationPref("screenName", true);
assert.strictEqual(plugin.buildImportAnnotation(tweet), "@nyako_cake - 今日份的猫 好可爱");
assert.strictEqual(plugin.getTwitterNamePrefs().text, true);

// 注释与命名各存各的顺序
plugin.moveTwitterAnnotationField("text", "up");
assert.strictEqual(plugin.buildImportAnnotation(tweet), "今日份的猫 好可爱 - @nyako_cake");
assert.strictEqual(plugin.getTwitterNamePrefs().order.join(","), "screenName,authorId,tweetId,text,name");

// 注释越界同样返回 null
assert.strictEqual(plugin.moveTwitterAnnotationField("authorId", "up"), null);

// 非推特来源不受注释规则影响，仍写推文正文（description）
assert.strictEqual(
  plugin.buildImportAnnotation({ extractor: "youtube", description: "视频简介", title: "标题" }),
  "视频简介"
);

// 没有 description 时不会写空注释：仍由勾选到的字段拼出内容
assert.strictEqual(plugin.buildImportAnnotation({ extractor: "twitter", authorScreenName: "nyako_cake" }), "@nyako_cake");

console.log("twitter-name: plugin annotation checks passed");

// --------------- 标签规则 ----------------

// 默认一项都不勾：推特素材仍只有站点标签
assert.deepStrictEqual(plugin.buildImportTags(tweet), ["twitter"]);

// 勾选后：站点标签在前，勾选的字段各自成为一条标签排在后面
plugin.setTwitterTagsPref("screenName", true);
plugin.setTwitterTagsPref("text", true);
assert.deepStrictEqual(plugin.buildImportTags(tweet), ["twitter", "@nyako_cake", "今日份的猫 好可爱"]);

// 标签顺序独立于命名 / 注释两套顺序，调整后立即生效
assert.deepStrictEqual(plugin.moveTwitterTagsField("text", "up"), ["authorId", "tweetId", "text", "screenName", "name"]);
assert.deepStrictEqual(plugin.buildImportTags(tweet), ["twitter", "今日份的猫 好可爱", "@nyako_cake"]);
assert.strictEqual(plugin.getTwitterNamePrefs().order.join(","), "screenName,authorId,tweetId,text,name");
assert.strictEqual(plugin.getTwitterAnnotationPrefs().order.join(","), "authorId,tweetId,text,screenName,name");

// 与站点标签重名时不重复添加，大小写不敏感
plugin.setTwitterTagsPref("authorId", true);
assert.deepStrictEqual(plugin.buildImportTags({ ...tweet, tags: ["44196397"] }), ["44196397", "今日份的猫 好可爱", "@nyako_cake"]);
assert.deepStrictEqual(plugin.buildImportTags({ ...tweet, tags: ["@NYAKO_CAKE"] }), ["@NYAKO_CAKE", "44196397", "今日份的猫 好可爱"]);

// 标签越界调整返回 null
assert.strictEqual(plugin.moveTwitterTagsField("authorId", "up"), null);

// 总标签数不超过 30 个：站点标签 + 规则标签一起截断
const manyTagMeta = { ...tweet, tags: Array.from({ length: 28 }, (_, i) => `site${i}`) };
plugin.setTwitterTagsPref("tweetId", true);
assert.strictEqual(plugin.buildImportTags(manyTagMeta).length, 30, "tags are capped at 30");

// 非推特来源不受标签规则影响
assert.deepStrictEqual(plugin.buildImportTags({ extractor: "youtube", title: "视频" }), ["youtube"]);
assert.deepStrictEqual(plugin.buildImportTags({ extractor: "youtube", tags: ["#音乐"] }), ["音乐"]);

console.log("twitter-name: plugin import tags checks passed");

console.log("twitter-name: plugin import name and order checks passed");
