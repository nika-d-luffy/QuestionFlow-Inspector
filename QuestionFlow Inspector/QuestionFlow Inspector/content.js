// content.js
// Runs in ALL frames (main page + iframes) in MAIN world.
// Iframes intercept fetch and post the data up to the top window.
// Top window renders the overlay.

(function () {
  const TARGET_URLS = ["v2/getQuestionAt", "v2/answerQuestion"];
  const MSG_TYPE = "JI_QUESTION_DATA";
  const IS_TOP = window === window.top;

  // Stores the last captured question data — used when Alt+Shift+Q is pressed
  let lastData = null;

  // ─── Deep DOM Search (pierces shadow roots AND iframes) ───────────────────

  function deepQuery(root, selector) {
    if (!root) return null;

    const direct = root.querySelector(selector);
    if (direct) return direct;

    // search iframes
    for (const iframe of root.querySelectorAll("iframe")) {
      try {
        const found = deepQuery(iframe.contentDocument, selector);
        if (found) return found;
      } catch (e) {}
    }

    // search shadow roots
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) {
        const found = deepQuery(el.shadowRoot, selector);
        if (found) return found;
      }
    }

    return null;
  }

  // ─── Parse Helpers ────────────────────────────────────────────────────────

  function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    tmp.querySelectorAll("img").forEach(el => el.remove());
    return tmp.textContent.trim();
  }

  function parseCorrectIndices(interpretStr) {
    const re = /Option\s+(\d+?)(?=\s*(?:0\s+point|<br|\s*,|\s+and\b|\s+are\b|\s*$))/gi;
    const matches = [...interpretStr.matchAll(re)];
    return matches.map(m => parseInt(m[1], 10) - 1);
  }

  function extractQuestionData(json, url) {
    let component = null;
    if (url.includes("getQuestionAt")) {
      component = json.component;
    } else if (url.includes("answerQuestion")) {
      component = json.nextQuestion?.component;
    }
    if (!component) return null;

    const question = stripHtml(component.body || "");
    const items = component._items || [];
    const componentId = component._id;

    if (component._component === "objectMatching") {
      const correctAnswers = items
        .filter(i => i.question && i.answer)
        .map(i => `${i.question} → ${i.answer}`);
      return { question, correctAnswers, type: "objectMatching", componentId, items };
    }

    if (component._component !== "mcq") return null;

    const interpretvar = component._smvWiseScoring?.outcomes?.interpretvar;
    if (!interpretvar?.length) return { question, correctAnswers: [], type: "mcq", componentId, items };

    // Scan ALL interpretvar entries and pick the one with the most correct indices
    let correctIndices = [];
    for (const iv of interpretvar) {
      const indices = parseCorrectIndices(iv.interpret || "");
      if (indices.length > correctIndices.length) correctIndices = indices;
    }

    const correctAnswers = correctIndices
      .filter(i => i >= 0 && i < items.length)
      .map(i => items[i].text);

    return { question, correctAnswers, correctIndices, type: "mcq", componentId, items };
  }

  function isTarget(url) {
    return TARGET_URLS.some(t => url.includes(t));
  }

  // ─── Fetch/XHR Interceptors ───────────────────────────────────────────────

  const _fetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const response = await _fetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    if (isTarget(url)) {
      response.clone().json().then(json => {
        const data = extractQuestionData(json, url);
        if (data) dispatchData(data);
      }).catch(() => {});
    }
    return response;
  };

  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OrigXHR();
    let _url = "";
    const origOpen = xhr.open.bind(xhr);
    xhr.open = function (method, url, ...rest) {
      _url = url;
      return origOpen(method, url, ...rest);
    };
    xhr.addEventListener("readystatechange", function () {
      if (xhr.readyState !== 4 || !isTarget(_url)) return;
      try {
        const json = JSON.parse(xhr.responseText);
        const data = extractQuestionData(json, _url);
        if (data) dispatchData(data);
      } catch (_) {}
    });
    return xhr;
  }
  PatchedXHR.prototype = OrigXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;

  // ─── Data Dispatch ────────────────────────────────────────────────────────

  function dispatchData(data) {
    if (IS_TOP) {
      lastData = data;
      renderCard(data);
    } else {
      window.top.postMessage({ type: MSG_TYPE, data }, "*");
    }
  }

  if (IS_TOP) {
    window.addEventListener("message", e => {
      if (e.data?.type === MSG_TYPE) {
        lastData = e.data.data;
        renderCard(e.data.data);
      }
    });
  }

  // ─── Keyboard Shortcut: Alt+Shift+Q ──────────────────────────────────────

  if (IS_TOP) {
    window.addEventListener("keydown", e => {
      if (e.altKey && e.shiftKey && (e.key === "Q" || e.key === "q")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!lastData) {
          showToast("No answer captured yet — wait for the question to load.", "warn");
          return;
        }
        if (lastData.type === "objectMatching") {
          showToast("Matching question — auto-select not supported.", "warn");
          return;
        }
        autoClick(lastData);
      }
    }, true); // capture:true — always fires regardless of page focus
  }

  // ─── Auto-Click Logic ─────────────────────────────────────────────────────
  // Uses component ID + correct index to find labels by ID, same approach as
  // netacad-solver: #${componentId}-${index}-label then label.click()

  function autoClick(data) {
    if (!data.correctAnswers || data.correctAnswers.length === 0) {
      showToast("No correct answers found in captured data.", "warn");
      return;
    }

    if (!data.componentId || !data.correctIndices) {
      showToast("Missing component info — cannot auto-select.", "fail");
      return;
    }

    let clickedCount = 0;

    for (const index of data.correctIndices) {
      const labelId = `${data.componentId}-${index}-label`;
      const inputId = `${data.componentId}-${index}-input`;

      const label = deepQuery(document, `#${CSS.escape(labelId)}`);
      const input = deepQuery(document, `#${CSS.escape(inputId)}`);

      if (!label) {
        console.log("[JI] Could not find label for index", index, "id:", labelId);
        continue;
      }

      // If already checked, uncheck first (like netacad-solver does)
      if (input && input.checked) {
        label.click();
      }

      // Small stagger between clicks to avoid race conditions
      setTimeout(() => label.click(), 10 * clickedCount);
      clickedCount++;
    }

    if (clickedCount > 0) {
      showToast(`✓ Selected ${clickedCount} answer${clickedCount > 1 ? "s" : ""}`, "ok");
    } else {
      showToast("Could not find answer elements on page.", "fail");
    }
  }

  // ─── Toast Notification ───────────────────────────────────────────────────

  function showToast(msg, type = "ok") {
    const existing = document.getElementById("ji-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "ji-toast";
    const colors = { ok: "#56d364", warn: "#e5c07b", fail: "#e06c75" };
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 24px;
      background: #161822;
      border: 1px solid ${colors[type] || colors.ok};
      color: ${colors[type] || colors.ok};
      font-family: -apple-system, 'Segoe UI', sans-serif;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 8px;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      transition: opacity 0.3s;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, 2000);
    setTimeout(() => { toast.remove(); }, 2400);
  }

  // ─── Overlay UI ───────────────────────────────────────────────────────────

  const OVERLAY_ID = "ji-overlay";

  function ensureOverlay() {
    if (!IS_TOP) return;
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div id="ji-header">
        <span id="ji-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          Answer Helper
        </span>
        <div id="ji-actions">
          <button id="ji-close">✕</button>
        </div>
      </div>
      <div id="ji-body">
        <div id="ji-empty">Waiting for a question...</div>
      </div>
    `;
    document.body.appendChild(overlay);
    injectStyles();
    bindEvents(overlay);
  }

  function injectStyles() {
    if (document.getElementById("ji-styles")) return;
    const s = document.createElement("style");
    s.id = "ji-styles";
    s.textContent = `
      #ji-overlay {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 380px;
        max-height: 420px;
        background: #0f1117;
        border: 1px solid #2a2d3a;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(136,189,242,0.07);
        font-family: -apple-system, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #c9d1e0;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      #ji-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #161822;
        border-bottom: 1px solid #2a2d3a;
        border-radius: 14px 14px 0 0;
        cursor: grab;
        flex-shrink: 0;
      }
      #ji-header:active { cursor: grabbing; }
      #ji-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #88bdf2;
      }
      #ji-actions { display: flex; gap: 6px; }
      #ji-close {
        background: transparent;
        border: 1px solid #2a2d3a;
        color: #6a89a7;
        border-radius: 5px;
        padding: 2px 8px;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      }
      #ji-close:hover { border-color: #e06c75; color: #e06c75; }
      #ji-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        scrollbar-width: thin;
        scrollbar-color: #2a2d3a transparent;
      }
      #ji-body::-webkit-scrollbar { width: 3px; }
      #ji-body::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 2px; }
      #ji-empty {
        color: #384959;
        font-size: 12px;
        text-align: center;
        padding: 30px 0;
      }
      .ji-card {
        background: #161822;
        border: 1px solid #2a2d3a;
        border-radius: 10px;
        overflow: hidden;
      }
      .ji-q-label {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #6a89a7;
        padding: 8px 12px 4px;
        border-bottom: 1px solid #1e2030;
      }
      .ji-q-text {
        padding: 10px 12px;
        color: #c9d1e0;
        font-size: 12.5px;
        line-height: 1.6;
        border-bottom: 1px solid #1e2030;
      }
      .ji-answers-label {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #56d364;
        padding: 8px 12px 4px;
      }
      .ji-answer-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 12px;
        border-top: 1px solid #1a1d28;
      }
      .ji-check {
        width: 16px;
        height: 16px;
        background: #1a3a2a;
        border: 1px solid #56d36444;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
        color: #56d364;
        font-size: 9px;
      }
      .ji-answer-text {
        color: #a8e6b8;
        font-size: 12.5px;
        line-height: 1.5;
      }
      .ji-no-answer {
        padding: 8px 12px;
        color: #384959;
        font-size: 11px;
        font-style: italic;
      }
      .ji-shortcut-hint {
        padding: 8px 12px 10px;
        font-size: 10px;
        color: #384959;
        border-top: 1px solid #1a1d28;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .ji-shortcut-hint kbd {
        background: #1e2030;
        border: 1px solid #2a2d3a;
        border-radius: 3px;
        padding: 1px 5px;
        font-size: 9px;
        color: #88bdf2;
        font-family: inherit;
      }
      .ji-status {
        padding: 6px 12px 10px;
        font-size: 10px;
        color: #56d364;
        border-top: 1px solid #1a1d28;
      }
      .ji-status.ji-status-fail { color: #e06c75; }
      .ji-status.ji-status-warn { color: #e5c07b; }
    `;
    document.head.appendChild(s);
  }

  function bindEvents(overlay) {
    const header = overlay.querySelector("#ji-header");
    let dragging = false, ox = 0, oy = 0;
    header.addEventListener("mousedown", e => {
      dragging = true;
      ox = e.clientX - overlay.getBoundingClientRect().left;
      oy = e.clientY - overlay.getBoundingClientRect().top;
    });
    document.addEventListener("mousemove", e => {
      if (!dragging) return;
      overlay.style.right = "auto";
      overlay.style.bottom = "auto";
      overlay.style.left = (e.clientX - ox) + "px";
      overlay.style.top = (e.clientY - oy) + "px";
    });
    document.addEventListener("mouseup", () => { dragging = false; });
    overlay.querySelector("#ji-close").addEventListener("click", () => {
      overlay.style.display = "none";
    });
  }

  function renderCard(data) {
    if (!IS_TOP) return;
    ensureOverlay();
    const overlay = document.getElementById(OVERLAY_ID);
    overlay.style.display = "flex";

    const body = overlay.querySelector("#ji-body");

    const answersHtml = data.correctAnswers.length
      ? data.correctAnswers.map(ans => `
          <div class="ji-answer-item">
            <div class="ji-check">✓</div>
            <div class="ji-answer-text">${escHtml(ans)}</div>
          </div>`).join("")
      : `<div class="ji-no-answer">No correct answer found.</div>`;

    const hintHtml = data.type === "mcq" && data.correctAnswers.length
      ? `<div class="ji-shortcut-hint">Press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> to auto-select</div>`
      : data.type === "objectMatching"
      ? `<div class="ji-status ji-status-warn">⚠ Matching question — select manually</div>`
      : "";

    const card = document.createElement("div");
    card.className = "ji-card";
    card.innerHTML = `
      <div class="ji-q-label">Question</div>
      <div class="ji-q-text">${escHtml(data.question)}</div>
      <div class="ji-answers-label">✓ Correct Answer${data.correctAnswers.length > 1 ? "s" : ""}</div>
      ${answersHtml}
      ${hintHtml}
    `;

    body.innerHTML = "";
    body.appendChild(card);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  if (IS_TOP) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ensureOverlay);
    } else {
      ensureOverlay();
    }
  }
})();
