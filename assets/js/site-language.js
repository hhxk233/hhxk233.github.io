/* English is the default. Only an explicit language choice is persisted. */
(() => {
  "use strict";

  const STORAGE_KEY = "yuheng-site-language";
  const script = document.currentScript;
  const dictionaryUrl = script?.dataset.translationsUrl || new URL("../json/site-translations.json", script.src).href;
  const ignored = 'script, style, noscript, pre, code, kbd, samp, math, svg, textarea, [translate="no"], .MathJax, .katex, #site-language-toggle';
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const originalTitle = document.title;
  let dictionary;
  let language = "en";
  let observer;
  let scheduled = false;

  try {
    if (localStorage.getItem(STORAGE_KEY) === "zh") language = "zh";
  } catch (_) {
    // Storage can be disabled; the current page can still switch languages.
  }

  const normalize = (value) => value.replace(/\s+/g, " ").trim();

  function translate(value) {
    const key = normalize(value);
    if (language === "en" || !key) return value;
    let translated = dictionary.text[key];
    if (!translated) {
      for (const entry of dictionary.patterns || []) {
        const pattern = new RegExp(entry.match);
        if (pattern.test(key)) {
          translated = key.replace(pattern, entry.zh);
          break;
        }
      }
    }
    if (!translated) return value;
    return value.match(/^\s*/)[0] + translated + value.match(/\s*$/)[0];
  }

  function updateAttribute(element, attribute, marker) {
    if (!element.hasAttribute(attribute)) return;
    let attributes = originalAttributes.get(element);
    if (!attributes) {
      attributes = new Map();
      originalAttributes.set(element, attributes);
    }
    if (!attributes.has(attribute)) attributes.set(attribute, element.getAttribute(attribute));
    const original = attributes.get(attribute);
    const keyed = element.dataset[marker];
    const value = keyed && dictionary.keys[keyed] ? dictionary.keys[keyed][language] : translate(original);
    if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
  }

  function updatePage() {
    if (!dictionary) return;
    observer?.disconnect();

    // Markers belong on text-only leaves, keeping links, icons, and equations intact.
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const entry = dictionary.keys[element.dataset.i18n];
      if (!entry || element.children.length || element.closest(ignored)) return;
      if (element.textContent !== entry[language]) element.textContent = entry[language];
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest(ignored) || parent.closest("[data-i18n]")) continue;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const value = translate(originalText.get(node));
      if (node.nodeValue !== value) node.nodeValue = value;
    }

    document.querySelectorAll("[aria-label], [title], [placeholder], img[alt]").forEach((element) => {
      if (element.closest(ignored)) return;
      updateAttribute(element, "aria-label", "i18nAriaLabel");
      updateAttribute(element, "title", "i18nTitle");
      updateAttribute(element, "placeholder", "i18nPlaceholder");
      updateAttribute(element, "alt", "i18nAlt");
    });

    document.documentElement.lang = language === "zh" ? "zh-Hans" : "en";
    document.documentElement.dataset.language = language;
    document.title = originalTitle.split(" | ").map(translate).join(" | ");
    const button = document.getElementById("site-language-toggle");
    if (button) {
      const action = language === "zh" ? "Switch to English" : "切换为中文 / Switch to Chinese";
      button.setAttribute("aria-label", action);
      button.setAttribute("title", action);
      button.setAttribute("aria-pressed", String(language === "zh"));
      button.querySelectorAll("[data-language-choice]").forEach((choice) => {
        choice.classList.toggle("is-active", choice.dataset.languageChoice === language);
      });
    }
    observer?.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  async function start() {
    try {
      const response = await fetch(dictionaryUrl);
      if (!response.ok) throw new Error("Translation data unavailable");
      dictionary = await response.json();
      if (!dictionary.text || !dictionary.keys) throw new Error("Invalid translation data");
    } catch (_) {
      // Keep the complete English source usable if the optional dictionary fails.
      document.documentElement.lang = "en";
      const button = document.getElementById("site-language-toggle");
      if (button) {
        button.disabled = true;
        button.title = "Chinese translation is temporarily unavailable";
      }
      return;
    }

    observer = new MutationObserver((mutations) => {
      // Dynamic chart and search content can arrive after the initial page render.
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") originalText.delete(mutation.target);
      });
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        updatePage();
      });
    });
    document.getElementById("site-language-toggle")?.addEventListener("click", () => {
      language = language === "en" ? "zh" : "en";
      try {
        localStorage.setItem(STORAGE_KEY, language);
      } catch (_) {
        // The deliberate selection still applies to this page.
      }
      updatePage();
      document.dispatchEvent(new CustomEvent("site-language-change", { detail: { language } }));
    });
    updatePage();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
