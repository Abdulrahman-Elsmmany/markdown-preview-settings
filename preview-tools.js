(() => {
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

  enhanceCodeBlocks();
  new MutationObserver(enhanceCodeBlocks).observe(document.body, {
    childList: true,
    subtree: true
  });
})();
