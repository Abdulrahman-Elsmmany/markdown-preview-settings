const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const previewToolsScript = fs.readFileSync("preview-tools.js", "utf8");

function createClassList() {
  const values = new Set();

  return {
    add(value) {
      values.add(value);
    },
    contains(value) {
      return values.has(value);
    },
    toggle(value, enabled) {
      if (enabled) {
        values.add(value);
      } else {
        values.delete(value);
      }
    }
  };
}

const code = { textContent: "Write-Host \"copied exactly\"\n" };
const button = {
  addEventListener(event, listener) {
    this.listeners[event] = listener;
  },
  classList: createClassList(),
  listeners: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
  attributes: {}
};
const pre = {
  append(child) {
    this.children.push(child);
  },
  children: [],
  classList: createClassList(),
  querySelector(selector) {
    return selector === ":scope > code" ? code : undefined;
  }
};
let copiedText;

const context = {
  document: {
    body: {},
    createElement(tagName) {
      assert.equal(tagName, "button");
      return button;
    },
    getElementById() {
      return undefined;
    },
    querySelectorAll(selector) {
      assert.equal(selector, "pre");
      return [pre];
    }
  },
  MutationObserver: class {
    observe() {}
  },
  navigator: {
    clipboard: {
      async writeText(value) {
        copiedText = value;
      }
    }
  },
  window: {
    clearTimeout() {},
    setTimeout(callback) {
      callback();
    }
  }
};

vm.runInNewContext(previewToolsScript, context);

assert.equal(pre.classList.contains("mdpt-code-block"), true);
assert.equal(pre.children.length, 1);
assert.equal(button.attributes["aria-label"], "Copy code");

function createScrollContext() {
  const listeners = {};
  const storage = new Map();
  const source = "file:///workspace/guide.md";
  const storageKey = `mdpt-scroll:${source}`;

  storage.set(
    storageKey,
    JSON.stringify({
      max: 1000,
      progress: 0.42,
      updatedAt: Date.now(),
      y: 420
    })
  );

  const scrollWindow = {
    addEventListener(event, listener) {
      listeners[event] = listener;
    },
    clearTimeout() {},
    innerHeight: 1000,
    localStorage: {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, value);
      }
    },
    scrollTo(_x, y) {
      this.scrollY = y;
    },
    scrollX: 0,
    scrollY: 0,
    setTimeout(callback) {
      callback();
    }
  };

  return {
    context: {
      document: {
        body: {
          clientHeight: 2000,
          scrollHeight: 2000
        },
        documentElement: {
          scrollHeight: 2000
        },
        getElementById(id) {
          assert.equal(id, "vscode-markdown-preview-data");
          return {
            getAttribute(attributeName) {
              return attributeName === "data-settings"
                ? JSON.stringify({ source })
                : undefined;
            }
          };
        },
        querySelector(selector) {
          assert.equal(selector, ".markdown-body");
          return {};
        },
        querySelectorAll(selector) {
          assert.equal(selector, "pre");
          return [];
        }
      },
      MutationObserver: class {
        observe() {}
      },
      navigator: {},
      window: scrollWindow
    },
    listeners,
    storage,
    storageKey
  };
}

const scrollHarness = createScrollContext();
vm.runInNewContext(previewToolsScript, scrollHarness.context);

assert.equal(scrollHarness.context.window.scrollY, 420);

scrollHarness.context.window.scrollY = 640;
scrollHarness.listeners.scroll();

const savedScroll = JSON.parse(scrollHarness.storage.get(scrollHarness.storageKey));
assert.equal(savedScroll.y, 640);

(async () => {
  await button.listeners.click();
  assert.equal(copiedText, code.textContent);
  console.log("preview-tools tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
