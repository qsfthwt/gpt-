chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" }, () => {});
});

async function postToPage(tabId, msg) {
  try {
    await chrome.tabs.sendMessage(tabId, msg);
  } catch (_) {}
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/png";
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

async function cropPng(dataUrl, rect, dpr) {
  const img = await createImageBitmap(dataUrlToBlob(dataUrl));
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    Math.floor(rect.left * dpr),
    Math.floor(rect.top * dpr),
    Math.floor(rect.width * dpr),
    Math.floor(rect.height * dpr),
    0, 0, w, h
  );
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const ab = await blob.arrayBuffer();
  return "data:image/png;base64," + arrayBufferToBase64(ab);
}

async function callOpenAI({ apiKey, prefix, imageDataUrl, page }) {
  const body = {
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: `${prefix}\n\n页面：${page.title}\n${page.url}` },
          { type: "input_image", image_url: imageDataUrl }
        ]
      }
    ]
  };

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) throw new Error(await resp.text());
  const json = await resp.json();

  return json.output_text ||
    json.output?.flatMap(o => o.content || [])
      ?.filter(c => c.type === "output_text")
      ?.map(c => c.text)
      ?.join("\n") ||
    JSON.stringify(json, null, 2);
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  (async () => {
    if (msg.type !== "SELECTION_DONE") return;
    const tabId = sender.tab.id;
    try {
      await postToPage(tabId, { type: "STATUS", text: "截图中..." });
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
      await postToPage(tabId, { type: "STATUS", text: "裁剪中..." });
      const cropped = await cropPng(dataUrl, msg.rect, msg.dpr);

      const { prefix = "", apiKey = "" } = await chrome.storage.local.get(["prefix", "apiKey"]);
      if (!apiKey) throw new Error("未设置 API Key");

      await postToPage(tabId, { type: "STATUS", text: "发送给 GPT..." });
      const text = await callOpenAI({ apiKey, prefix, imageDataUrl: cropped, page: msg.page });

      await chrome.storage.local.set({
        lastResult: text,
        lastError: "",
        lastTime: Date.now(),
        lastPage: msg.page
      });

      await postToPage(tabId, { type: "GPT_RESULT", text });
      await postToPage(tabId, { type: "STATUS", text: "完成" });
    } catch (e) {
      await chrome.storage.local.set({ lastError: String(e) });
      await postToPage(tabId, { type: "GPT_ERROR", error: String(e) });
    }
  })();
});