/* Eagle 视频下载助手 — 弹窗状态 */
async function refresh() {
  const dot = document.getElementById("pluginDot");
  const text = document.getElementById("pluginText");
  dot.className = "dot";
  text.textContent = "检测中…";

  let result = null;
  try {
    result = await chrome.runtime.sendMessage({ type: "ping" });
  } catch (e) {
    result = null;
  }

  if (result && result.plugin && result.plugin.ok) {
    if (result.plugin.ready) {
      dot.className = "dot ok";
      text.textContent = "已连接";
    } else {
      dot.className = "dot warn";
      text.textContent = "已连接（依赖未就绪）";
    }
    return;
  }
  dot.className = "dot err";
  text.textContent = "未连接";
}

document.getElementById("refresh").addEventListener("click", refresh);
refresh();
