import { route, activeRoute } from "./ui.mjs";
import { overviewPage } from "./overview.mjs";
import { mountExplore } from "./explore.mjs";
import { searchPage } from "./search-page.mjs";
import { renderRecord } from "./record.mjs";

const main = document.querySelector("main");
const detail = document.querySelector("dialog");
let records;
let currentItem;
let lastView;
let lastPage;
let explorer;

function navigateExplore(params, replace = false) {
  const hash = route("explore", params);
  if (hash === location.hash) return;
  if (replace) history.replaceState(null, "", hash);
  else history.pushState(null, "", hash);
  render();
}

function closeRecord() {
  const { page, params } = activeRoute();
  delete params.dataset;
  if (history.state?.openedFromCatalogue) history.back();
  else {
    history.replaceState(null, "", route(page, params));
    render();
  }
}

function render() {
  if (!records) return;
  const { page, params } = activeRoute();
  if (page === "explore") {
    const canonical = route(page, params);
    if (location.hash !== canonical)
      history.replaceState(history.state, "", canonical);
  }
  const { dataset, ...filters } = params;
  const viewKey = route(page, filters);
  if (viewKey !== lastView) {
    if (page === "explore") {
      explorer ??= mountExplore(main, records, navigateExplore);
      explorer.render(filters);
    } else {
      explorer?.destroy();
      explorer = null;
      main.innerHTML =
        page === "search" ? searchPage(records, params) : overviewPage(records);
    }
    for (const link of document.querySelectorAll(".site-head nav a")) {
      if (link.hash === "#" + page) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    document.title =
      {
        overview: "Overview",
        explore: "Explore datasets",
        search: "Search by description",
      }[page] + " · OpenBioMed Datasets";
    if (lastPage && lastPage !== page) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    lastView = viewKey;
    lastPage = page;
  }
  currentItem = dataset ? records.find((r) => r.id === dataset) : null;
  if (dataset) {
    detail.innerHTML = currentItem
      ? renderRecord(currentItem)
      : '<div class="dialog-inner"><h2 id="detail-title">Dataset unavailable</h2><p>This identifier is absent from the current catalogue.</p><button class="button" data-close>Return to catalogue</button></div>';
    if (!detail.open) detail.showModal();
    detail.scrollTop = 0;
  } else if (detail.open) detail.close();
}

document.addEventListener("click", (event) => {
  if (event.target.closest(".skip")) {
    event.preventDefault();
    main.focus();
    return;
  }
  const a = event.target.closest('a[href^="#"]');
  if (a && (a.hash === "#browse-tasks" || a.hash === "#browse-modalities")) {
    const chart = document.getElementById(a.hash.slice(1));
    if (
      chart &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      chart.open = true;
      chart.scrollIntoView();
      chart.querySelector("summary").focus({ preventScroll: true });
      return;
    }
  }
  if (
    a &&
    new URLSearchParams(a.hash.split("?")[1]).has("dataset") &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  ) {
    event.preventDefault();
    history.pushState({ openedFromCatalogue: true }, "", a.hash);
    render();
  }
});
main.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.id === "search-form") {
    event.preventDefault();
    const query = new FormData(form).get("q").trim();
    if (query) location.hash = route("search", { q: query });
  }
});
detail.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeRecord();
});
detail.addEventListener("click", async (event) => {
  if (event.target === detail || event.target.closest("[data-close]")) {
    closeRecord();
    return;
  }
  const jump = event.target.closest("[data-jump]");
  if (jump) {
    document
      .getElementById(jump.dataset.jump)
      ?.scrollIntoView({ block: "start" });
    return;
  }
  if (event.target.closest("[data-export]") && currentItem) {
    const { bibtex, ...metadata } = currentItem;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(metadata, null, 2) + "\n"], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = currentItem.id + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const button = event.target.closest("[data-copy-link],[data-copy-bib]");
  if (!button || !currentItem) return;
  const value = button.hasAttribute("data-copy-bib")
    ? currentItem.bibtex
    : location.href;
  try {
    await navigator.clipboard.writeText(value);
    button.textContent = "Copied ✓";
  } catch {
    const field = document.createElement("textarea");
    field.readOnly = true;
    field.value = value;
    button.after(field);
    field.select();
  }
});
window.addEventListener("hashchange", render);
window.addEventListener("popstate", () => {
  render();
});

try {
  const response = await fetch("./catalogue.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("Catalogue unavailable");
  records = await response.json();
  render();
} catch {
  main.innerHTML =
    '<div class="empty" role="alert"><h1>Catalogue unavailable</h1><p>The dataset index could not be loaded. <a href="">Reload this page</a> to try again.</p></div>';
}
