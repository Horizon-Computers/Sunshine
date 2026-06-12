// Sunshine Reader — script injecté : extrait l'article et l'affiche dans
// une vue lecture épurée (shadow DOM). Réinjecté = bascule (ferme la vue).
(async () => {
  const existing = document.getElementById("sunshine-reader-host");
  if (existing) {
    existing.remove();
    document.documentElement.style.overflow = "";
    return;
  }

  const lib = await import(chrome.runtime.getURL("lib.js"));
  const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

  // --- Sélection du contenu principal ---
  function statsOf(el) {
    const paragraphs = el.querySelectorAll("p");
    let textLength = 0;
    for (const p of paragraphs) textLength += p.innerText.trim().length;
    let linkTextLength = 0;
    for (const a of el.querySelectorAll("p a")) {
      linkTextLength += a.innerText.trim().length;
    }
    return { textLength, linkTextLength, paragraphs: paragraphs.length };
  }

  const candidates = new Set(
    document.querySelectorAll(
      "article, main, [role='main'], [itemprop='articleBody'], " +
      ".post-content, .article-body, .entry-content, #content"));
  candidates.add(document.body);

  let best = document.body;
  let bestScore = -1;
  for (const el of candidates) {
    const score = lib.scoreCandidate(statsOf(el));
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  // --- Nettoyage du contenu ---
  function sanitize(node) {
    const clone = node.cloneNode(true);
    const walker = [clone];
    while (walker.length) {
      const current = walker.pop();
      for (const child of Array.from(current.children)) {
        if (!lib.KEEP_TAGS.has(child.tagName) &&
            !child.querySelector("p, h1, h2, h3, img")) {
          child.remove();
          continue;
        }
        for (const attr of Array.from(child.attributes)) {
          if (!lib.KEEP_ATTRIBUTES.has(attr.name)) {
            child.removeAttribute(attr.name);
          }
        }
        walker.push(child);
      }
    }
    return clone;
  }

  const content = sanitize(best);
  const words = lib.wordCount(content.innerText || "");
  const minutes = lib.readingTime(words);
  const title = lib.cleanTitle(document.title, location.hostname);

  // --- Vue lecture ---
  const host = document.createElement("div");
  host.id = "sunshine-reader-host";
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    .veil { position: fixed; inset: 0; z-index: 2147483646;
            overflow-y: auto; background: #FFF8EE; color: #3A2E1E; }
    .page { max-width: 680px; margin: 0 auto; padding: 56px 24px 80px;
            font-family: Georgia, "Times New Roman", serif;
            font-size: var(--size, 19px); line-height: 1.7; }
    .page.sans { font-family: "Segoe UI", Arial, sans-serif; }
    .meta { font-family: "Segoe UI", Arial, sans-serif; font-size: 13px;
            color: #8a7a62; margin-bottom: 22px; }
    h1.title { font-size: 1.7em; line-height: 1.25; margin: 0 0 6px; }
    .page img { max-width: 100%; height: auto; border-radius: 8px; }
    .page pre { overflow-x: auto; background: #f4ead9; padding: 12px;
                border-radius: 8px; font-size: .8em; }
    .page blockquote { border-left: 4px solid #E8A23C; margin-left: 0;
                       padding-left: 16px; color: #6B5536; }
    .page a { color: #C9842A; }
    .bar { position: fixed; top: 12px; right: 16px; z-index: 2147483647;
           display: flex; gap: 6px;
           font-family: "Segoe UI", Arial, sans-serif; }
    .bar button { border: none; border-radius: 8px; padding: 7px 11px;
                  background: #E8A23C; color: #fff; cursor: pointer;
                  font-size: 14px; }
    .bar button:hover { background: #C9842A; }`;

  const veil = document.createElement("div");
  veil.className = "veil";
  const bar = document.createElement("div");
  bar.className = "bar";
  const page = document.createElement("div");
  page.className = "page";

  const h1 = document.createElement("h1");
  h1.className = "title";
  h1.textContent = title;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent =
    `${location.hostname.replace(/^www\./, "")} · ` +
    t("minRead", [String(minutes)]);
  page.append(h1, meta, content);

  let size = 19;
  function makeButton(label, title, onClick) {
    const button = document.createElement("button");
    button.textContent = label;
    button.title = title;
    button.addEventListener("click", onClick);
    return button;
  }
  bar.append(
    makeButton("A−", t("smaller"), () => {
      size = Math.max(14, size - 2);
      page.style.setProperty("--size", `${size}px`);
    }),
    makeButton("A+", t("larger"), () => {
      size = Math.min(28, size + 2);
      page.style.setProperty("--size", `${size}px`);
    }),
    makeButton("Aa", t("toggleFont"), () => page.classList.toggle("sans")),
    makeButton("✕", t("close"), close),
  );

  function close() {
    host.remove();
    document.documentElement.style.overflow = "";
    removeEventListener("keydown", onKey, true);
  }
  function onKey(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  }
  addEventListener("keydown", onKey, true);

  veil.append(bar, page);
  shadow.append(style, veil);
  document.documentElement.appendChild(host);
  document.documentElement.style.overflow = "hidden";
})();
