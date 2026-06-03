const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

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
    setTimeout(callback) {
      callback();
    }
  }
};

vm.runInNewContext(fs.readFileSync("preview-tools.js", "utf8"), context);

assert.equal(pre.classList.contains("mdpt-code-block"), true);
assert.equal(pre.children.length, 1);
assert.equal(button.attributes["aria-label"], "Copy code");

(async () => {
  await button.listeners.click();
  assert.equal(copiedText, code.textContent);
  console.log("preview-tools tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
