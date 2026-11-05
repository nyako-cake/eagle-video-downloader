/**
 * 资源库上下文：插件窗口里可以拿到 eagle.library.path。
 * 账号、监控进度都按资源库分开存储，切换资源库时各自独立。
 */

function getLibraryPath() {
  try {
    if (typeof eagle !== "undefined" && eagle && eagle.library && eagle.library.path) {
      return String(eagle.library.path);
    }
  } catch (e) {
    // ignore
  }
  return "";
}

/** 把基础 key 变成按资源库隔离的 key；拿不到资源库时退回全局 key */
function scopedKey(base) {
  const libraryPath = getLibraryPath();
  if (!libraryPath) return base;
  return base + "::" + libraryPath.toLowerCase();
}

module.exports = {
  getLibraryPath,
  scopedKey,
};
