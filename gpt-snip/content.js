// =========================
// GPT Snip content.js
// 精致暗黑常驻面板 + 选区截图 + 可拖动 + 可调大小
// =========================

let panelRoot = null;

// ---------- draggable ----------
function makeDraggable(container, handle) {
  let dragging = false;
  let sx = 0, sy = 0;
  let startLeft = 0, startTop = 0;

  handle.addEventListener("mousedown", (e) => {
    // 如果点到按钮，不触发拖动
    const t = e.target;
    if (t && (t.tagName === "BUTTON" || t.closest("button"))) return;

    dragging = true;
    sx = e.clientX;
    sy = e.clientY;
    const rect = container.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    container.style.left = `${startLeft + dx}px`;
    container.style.top = `${startTop + dy}px`;
    container.style.right = "auto";
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
  });
}

// ---------- resizable ----------
function enableResizable(container, handle) {
  if (!handle) return;

  let resizing = false;
  let sx = 0, sy = 0;
  let startW = 0, startH = 0;

  const MIN_W = 320;
  const MIN_H = 260;

  handle.addEventListener("mousedown", (e) => {
    resizing = true;
    sx = e.clientX;
    sy = e.clientY;
    const rect = container.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener("mousemove", (e) => {
    if (!resizing) return;

    const dx = e.clientX - sx;
    const dy = e.clientY - sy;

    let w = startW + dx;
    let h = startH + dy;

    // 限制最大值避免拖出屏幕太离谱
    const maxW = Math.min(window.innerWidth - 24, 960);
    const maxH = Math.min(window.innerHeight - 24, 960);

    w = Math.max(MIN_W, Math.min(maxW, w));
    h = Math.max(MIN_H, Math.min(maxH, h));

    container.style.width = `${Math.round(w)}px`;
    container.style.height = `${Math.round(h)}px`;
  });

  window.addEventListener("mouseup", async () => {
    if (!resizing) return;
    resizing = false;

    // 记住窗口大小（可选但推荐）
    try {
      const rect = container.getBoundingClientRect();
      await chrome.storage.local.set({
        panelSize: { w: Math.round(rect.width), h: Math.round(rect.height) }
      });
    } catch (_) {}
  });
}

// ---------- panel helpers ----------
function panelSetStatus(text) {
  if (!panelRoot) return;
  const el = panelRoot.querySelector("#status");
  if (el) el.textContent = text || "";
}

function panelSetResult(text) {
  if (!panelRoot) return;
  const el = panelRoot.querySelector("#result");
  if (el) el.textContent = text || "";
}

function createPanel() {
  panelRoot = document.createElement("div");
  panelRoot.id = "__gpt_snip_panel__";
  panelRoot.style.cssText = `
    position: fixed;
    right: 12px;
    top: 12px;
    width: 360px;
    height: 520px;
    z-index: 2147483647;
    background: #111;
    color: #fff;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  panelRoot.innerHTML = `
    <div id="hdr" style="
      padding: 10px 12px;
      display:flex;
      align-items:center;
      gap:10px;
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      border-bottom: 1px solid rgba(255,255,255,0.08);
      cursor: move;
      user-select: none;
    ">
      <div style="font-weight:700; font-size:18px; letter-spacing:.2px;">GPT Snip 面板</div>
      <div style="margin-left:auto; display:flex; gap:8px;">
        <button id="clear" style="
          padding:6px 10px;
          border-radius: 10px;
          border:1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color:#fff;
          cursor:pointer;
        ">清空</button>
        <button id="close" style="
          padding:6px 10px;
          border-radius: 10px;
          border:1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color:#fff;
          cursor:pointer;
        ">关闭</button>
      </div>
    </div>

    <div style="padding: 12px; display:flex; flex-direction:column; gap:10px;">
      <div>
        <div style="font-size:12px; opacity:.9; margin-bottom:6px;">前缀</div>
        <textarea id="prefix" style="
          width:100%;
          height:64px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.35);
          color: #fff;
          padding: 10px;
          outline: none;
          resize: none;
          box-sizing: border-box;
        " placeholder="比如：请总结图片内容，并指出关键点..."></textarea>
      </div>

      <div>
        <div style="font-size:12px; opacity:.9; margin-bottom:6px;">OpenAI API Key</div>
        <input id="apiKey" type="password" style="
          width:100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.35);
          color: #fff;
          padding: 10px;
          outline: none;
          box-sizing: border-box;
        " placeholder="sk-..." />
      </div>

      <button id="start" style="
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.08);
        color: #fff;
        cursor: pointer;
        font-weight: 650;
      ">选区截图并发给 GPT</button>

      <div id="status" style="font-size:12px; opacity:.85; min-height: 16px;"></div>
    </div>

    <pre id="result" style="
      margin: 0;
      padding: 12px;
      flex: 1;
      overflow: auto;
      white-space: pre-wrap;
      font-size: 12px;
      line-height: 1.35;
      background: rgba(0,0,0,0.25);
      border-top: 1px solid rgba(255,255,255,0.08);
    "></pre>

    <!-- 右下角调整大小把手 -->
    <div id="resizeHandle" title="拖拽调整大小" style="
      position: absolute;
      right: 6px;
      bottom: 6px;
      width: 16px;
      height: 16px;
      cursor: nwse-resize;
      border-right: 2px solid rgba(255,255,255,0.35);
      border-bottom: 2px solid rgba(255,255,255,0.35);
      border-radius: 2px;
      opacity: .9;
    "></div>
  `;

  document.documentElement.appendChild(panelRoot);

  makeDraggable(panelRoot, panelRoot.querySelector("#hdr"));
  enableResizable(panelRoot, panelRoot.querySelector("#resizeHandle"));

  // 读取配置 + 上次结果 + 记住的面板大小
  chrome.storage.local.get(
    ["prefix", "apiKey", "lastResult", "lastError", "lastTime", "lastPage", "panelSize"],
    (d) => {
      if (!panelRoot) return;

      if (d.panelSize?.w && d.panelSize?.h) {
        panelRoot.style.width = `${d.panelSize.w}px`;
        panelRoot.style.height = `${d.panelSize.h}px`;
      }

      panelRoot.querySelector("#prefix").value = d.prefix || "";
      panelRoot.querySelector("#apiKey").value = d.apiKey || "";

      if (d.lastError) {
        panelSetStatus("出错");
        panelSetResult(d.lastError);
      } else if (d.lastResult) {
        const head = d.lastPage ? `页面：${d.lastPage.title}\n${d.lastPage.url}\n\n` : "";
        panelSetStatus(d.lastTime ? `上次结果：${new Date(d.lastTime).toLocaleString()}` : "上次结果");
        panelSetResult(head + d.lastResult);
      } else {
        panelSetStatus("准备就绪");
        panelSetResult("");
      }
    }
  );

  // 清空
  panelRoot.querySelector("#clear").addEventListener("click", async () => {
    panelSetStatus("");
    panelSetResult("");
    await chrome.storage.local.set({ lastResult: "", lastError: "" });
  });

  // 关闭
  panelRoot.querySelector("#close").addEventListener("click", () => {
    panelRoot.remove();
    panelRoot = null;
  });

  // 开始选区：保存配置，然后进入选区模式
  panelRoot.querySelector("#start").addEventListener("click", async () => {
    const prefix = panelRoot.querySelector("#prefix").value || "";
    const apiKey = panelRoot.querySelector("#apiKey").value || "";
    await chrome.storage.local.set({ prefix, apiKey });

    panelSetStatus("进入选区模式...");
    startSelectMode();
  });
}

function togglePanel() {
  if (panelRoot) {
    panelRoot.remove();
    panelRoot = null;
  } else {
    createPanel();
  }
}

// =========================
// 选区截图 UI（拖拽框选）
// =========================

let overlay = null;
let box = null;
let startX = 0, startY = 0;
let selecting = false;

function cleanupSelectUI() {
  overlay?.remove();
  overlay = null;
  box = null;
  selecting = false;
}

function startSelectMode() {
  cleanupSelectUI();

  overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483647;
    background: rgba(0,0,0,0.18);
    cursor: crosshair;
  `;

  box = document.createElement("div");
  box.style.cssText = `
    position: fixed;
    border: 2px solid #00aaff;
    background: rgba(0,170,255,0.16);
    display: none;
    border-radius: 6px;
  `;

  overlay.appendChild(box);
  document.documentElement.appendChild(overlay);

  overlay.addEventListener("mousedown", (e) => {
    selecting = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = "0px";
    box.style.height = "0px";
    box.style.display = "block";
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!selecting) return;
    const x = e.clientX;
    const y = e.clientY;
    const left = Math.min(startX, x);
    const top = Math.min(startY, y);
    const width = Math.abs(x - startX);
    const height = Math.abs(y - startY);

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
  });

  overlay.addEventListener("mouseup", (e) => {
    if (!selecting) return;
    selecting = false;

    const x = e.clientX;
    const y = e.clientY;
    const left = Math.min(startX, x);
    const top = Math.min(startY, y);
    const width = Math.abs(x - startX);
    const height = Math.abs(y - startY);

    cleanupSelectUI();

    // ✅ content.js 唯一允许发送的消息：选区完成
    chrome.runtime.sendMessage({
      type: "SELECTION_DONE",
      rect: { left, top, width, height },
      dpr: window.devicePixelRatio || 1,
      page: { url: location.href, title: document.title }
    });
  });

  // ESC 取消（只做 UI 清理，不发消息）
  window.addEventListener(
    "keydown",
    function escListener(ev) {
      if (ev.key === "Escape") {
        cleanupSelectUI();
        panelSetStatus("已取消选区");
        window.removeEventListener("keydown", escListener);
      }
    }
  );
}

// =========================
// 接收 background 消息：只更新面板，不发送消息
// =========================

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "TOGGLE_PANEL") {
    togglePanel();
    return;
  }

  if (!panelRoot) return;

  if (msg?.type === "STATUS") {
    panelSetStatus(msg.text || "");
  } else if (msg?.type === "GPT_RESULT") {
    panelSetResult(msg.text || "");
  } else if (msg?.type === "GPT_ERROR") {
    panelSetStatus("出错");
    panelSetResult(msg.error || "");
  }
});
