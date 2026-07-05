(() => {
  const SCROLL_STORAGE_PREFIX = "mdpt-scroll:";
  const MAX_SCROLL_AGE_MS = 1000 * 60 * 60 * 24 * 30;
  const RESTORE_SCROLL_ATTEMPTS = 8;
  const RESTORE_SCROLL_DELAY_MS = 80;
  const WAIT_FOR_MARKDOWN_BODY_ATTEMPTS = 25;
  const COPY_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8 7V3.75C8 2.78 8.78 2 9.75 2h8.5C19.22 2 20 2.78 20 3.75v10.5c0 .97-.78 1.75-1.75 1.75H15v3.25c0 .97-.78 1.75-1.75 1.75h-8.5C3.78 21 3 20.22 3 19.25V8.75C3 7.78 3.78 7 4.75 7H8Zm1.5 0h3.75c.97 0 1.75.78 1.75 1.75v5.75h3.25c.14 0 .25-.11.25-.25V3.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25V7Zm3.75 1.5h-8.5a.25.25 0 0 0-.25.25v10.5c0 .14.11.25.25.25h8.5c.14 0 .25-.11.25-.25V8.75a.25.25 0 0 0-.25-.25Z"/>
    </svg>`;
  const CHECK_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m9.55 17.6-5.2-5.2 1.4-1.4 3.8 3.78 8.7-8.68 1.4 1.42-10.1 10.08Z"/>
    </svg>`;

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();

    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy failed");
    }

    textarea.remove();
  }

  function updateButton(button, state) {
    button.classList.toggle("mdpt-copied", state === "copied");
    button.classList.toggle("mdpt-copy-failed", state === "failed");
    button.innerHTML = state === "copied" ? CHECK_ICON : COPY_ICON;
    button.title = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy code";
    button.setAttribute("aria-label", button.title);
  }

  function enhanceCodeBlock(pre) {
    if (pre.classList.contains("mdpt-code-block")) {
      return;
    }

    const code = pre.querySelector(":scope > code");
    if (!code) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mdpt-copy-button";
    updateButton(button, "idle");

    button.addEventListener("click", async () => {
      try {
        await writeClipboard(code.textContent);
        updateButton(button, "copied");
      } catch {
        updateButton(button, "failed");
      }

      window.setTimeout(() => updateButton(button, "idle"), 1600);
    });

    pre.classList.add("mdpt-code-block");
    pre.append(button);
  }

  function enhanceCodeBlocks() {
    document.querySelectorAll("pre").forEach(enhanceCodeBlock);
  }

  function getPreviewSettings() {
    const previewData = document.getElementById?.("vscode-markdown-preview-data");
    const rawSettings = previewData?.getAttribute?.("data-settings");

    if (!rawSettings) {
      return undefined;
    }

    try {
      return JSON.parse(rawSettings);
    } catch {
      return undefined;
    }
  }

  function getStorage() {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }

  function getScrollStorageKey(settings) {
    return typeof settings?.source === "string"
      ? `${SCROLL_STORAGE_PREFIX}${settings.source}`
      : undefined;
  }

  function getScrollMax() {
    const documentElement = document.documentElement;
    const documentHeight = Math.max(
      documentElement?.scrollHeight ?? 0,
      document.body?.scrollHeight ?? 0,
      document.body?.clientHeight ?? 0
    );

    return Math.max(0, documentHeight - (window.innerHeight || 0));
  }

  function readScrollSnapshot(storageKey) {
    const storage = getStorage();
    if (!storage) {
      return undefined;
    }

    try {
      const snapshot = JSON.parse(storage.getItem(storageKey));

      if (
        !Number.isFinite(snapshot?.updatedAt) ||
        Date.now() - snapshot.updatedAt > MAX_SCROLL_AGE_MS ||
        !Number.isFinite(snapshot?.y) ||
        !Number.isFinite(snapshot?.progress)
      ) {
        return undefined;
      }

      return snapshot;
    } catch {
      return undefined;
    }
  }

  function saveScrollSnapshot(storageKey) {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    const y = window.scrollY || window.pageYOffset || 0;
    const max = getScrollMax();
    const snapshot = {
      max,
      progress: max > 0 ? y / max : 0,
      updatedAt: Date.now(),
      y
    };

    try {
      storage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // Storage may be disabled for the webview.
    }
  }

  function resolveRestoreY(snapshot) {
    const max = getScrollMax();
    const savedMax = typeof snapshot.max === "number" ? snapshot.max : 0;
    const shouldUseProgress = savedMax > 0 && Math.abs(max - savedMax) > savedMax * 0.1;
    const y = shouldUseProgress ? snapshot.progress * max : snapshot.y;

    return Math.max(0, Math.min(max, y));
  }

  function restoreScrollSnapshot(storageKey, settings) {
    if (settings?.fragment) {
      return;
    }

    const snapshot = readScrollSnapshot(storageKey);
    if (!snapshot || snapshot.y <= 0) {
      return;
    }

    let restoreAttempts = 0;
    let bodyAttempts = 0;
    let lastTarget;

    const applyRestore = () => {
      const currentY = window.scrollY || window.pageYOffset || 0;
      if (lastTarget === undefined && currentY > 2) {
        return;
      }

      if (lastTarget !== undefined && Math.abs(currentY - lastTarget) > 24) {
        return;
      }

      const targetY = resolveRestoreY(snapshot);
      if (targetY > 2) {
        window.scrollTo(window.scrollX || 0, targetY);
        lastTarget = targetY;
      }

      restoreAttempts += 1;
      if (restoreAttempts < RESTORE_SCROLL_ATTEMPTS) {
        window.setTimeout(applyRestore, RESTORE_SCROLL_DELAY_MS);
      }
    };

    const waitForMarkdownBody = () => {
      if (document.querySelector?.(".markdown-body")) {
        window.setTimeout(applyRestore, RESTORE_SCROLL_DELAY_MS);
        return;
      }

      bodyAttempts += 1;
      if (bodyAttempts < WAIT_FOR_MARKDOWN_BODY_ATTEMPTS) {
        window.setTimeout(waitForMarkdownBody, RESTORE_SCROLL_DELAY_MS);
      }
    };

    waitForMarkdownBody();
  }

  function preservePreviewScroll() {
    const settings = getPreviewSettings();
    const storageKey = getScrollStorageKey(settings);

    if (!storageKey) {
      return;
    }

    let saveTimer;
    const scheduleSave = () => {
      if (saveTimer) {
        window.clearTimeout(saveTimer);
      }

      saveTimer = window.setTimeout(() => {
        saveTimer = undefined;
        saveScrollSnapshot(storageKey);
      }, 100);
    };

    window.addEventListener?.("scroll", scheduleSave, { passive: true });
    window.addEventListener?.("pagehide", () => saveScrollSnapshot(storageKey));
    window.addEventListener?.("beforeunload", () => saveScrollSnapshot(storageKey));
    restoreScrollSnapshot(storageKey, settings);
  }

  enhanceCodeBlocks();
  preservePreviewScroll();

  new MutationObserver(enhanceCodeBlocks).observe(document.body, {
    childList: true,
    subtree: true
  });
})();
