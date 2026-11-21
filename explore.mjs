import { normalize, subsetValues } from "./search.mjs";
import {
  accessNames,
  byReleaseDate,
  coverageValue,
  datasetCard,
  detailLink,
  esc,
  headlineCount,
  icon,
  number,
  optionList,
  releaseDate,
  route,
} from "./ui.mjs";
import {
  clearExploreFilters,
  evaluateFilters,
  groups,
  indexCatalogue,
  toggleSelection,
} from "./explore-filters.mjs";

const PAGE_SIZE = 24;
const SHORT_LIST = 5;
const pageLink = (args) => esc(route("explore", args));
const valueLabel = (key, value) =>
  key === "access" ? accessNames[value] || value : value;

const searchIcon =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.4 4.4"/></svg>';
const filterIcon =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 6h7m4 0h7M3 12h2m4 0h12M3 18h11m4 0h3"/><circle cx="12" cy="6" r="2"/><circle cx="7" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>';

function tableRows(rows) {
  return `<div class="scroll-table"><table><thead><tr><th>Dataset</th><th>Imaging modalities</th><th>Tasks</th><th>Reported size</th></tr></thead>
  <tbody>${rows
    .map(
      ({
        record: r,
        subsets: s,
      }) => `<tr><td><a class="row-name" href="${detailLink(r.id)}">${icon(subsetValues(s, "modalities")[0])}<span><strong>${esc(r.name)}</strong>${releaseDate(r, "release-date compact")}</span></a>
  <div class="table-small-mode compact"><b>Modalities</b> ${coverageValue(r, s, "modalities")}</div>
  <div class="table-mobile-meta compact"><b>Tasks</b> ${coverageValue(r, s, "tasks", 3)}</div></td>
  <td>${coverageValue(r, s, "modalities")}</td><td>${coverageValue(r, s, "tasks", 3)}</td>
  <td class="size-cell">${s.length > 1 ? `<a href="${detailLink(r.id)}" aria-label="View subset counts for ${esc(r.name)}">${esc(headlineCount(s))}</a>` : esc(headlineCount(s))}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}

function optionRow(key, value) {
  const label = esc(valueLabel(key, value));
  const group = groups.find((group) => group.key === key).title;
  return `<li class="facet-option" data-value="${esc(value)}">
    <button type="button" class="include-option" data-direction="include" aria-pressed="false" aria-label="Include ${label} (${group})" title="Include ${label}"><span class="vote-mark" aria-hidden="true">✓</span><span>${label}</span></button>
    <span class="option-count" title="Distinct datasets matching the other filters"></span>
    <button type="button" class="exclude-option" data-direction="exclude" aria-pressed="false" aria-label="Exclude ${label} (${group})" title="Exclude datasets containing ${label}"><span aria-hidden="true">×</span></button>
  </li>`;
}

function facetGroup(group, values) {
  const { key, title } = group;
  const sorted = [...values].sort(
    ([a, ac], [b, bc]) =>
      bc - ac || valueLabel(key, a).localeCompare(valueLabel(key, b)),
  );
  return `<details class="facet-group" data-group="${key}" ${key === "modality" ? "open" : ""}>
    <summary><span>${title}</span><span class="selection-count" hidden></span></summary>
    <div class="facet-body">
      ${sorted.length > 15 ? `<input class="option-search" type="search" placeholder="Find a value…" aria-label="Search ${title.toLowerCase()} options">` : ""}
      <ul class="facet-options">${sorted.map(([v]) => optionRow(key, v)).join("")}</ul>
      <p class="no-options" hidden>No matching values.</p>
      <button type="button" class="more-options" hidden></button>
    </div></details>`;
}

function sizeGroup(units) {
  return `<details class="facet-group" data-group="size"><summary><span>Reported size</span><span class="selection-count" hidden></span></summary>
    <form class="size-filter"><label>Count unit<select name="unit">${optionList(units, "patients")}</select></label>
    <div class="size-bounds"><label>Minimum<input type="number" name="min" aria-label="Minimum reported total" min="0" step="1" placeholder="Any"></label>
      <label>Maximum<input type="number" name="max" aria-label="Maximum reported total" min="0" step="1" placeholder="Any"></label></div>
    <p class="size-error" role="status"></p></form></details>`;
}

function pageMarkup(index) {
  const railGroups = groups.map((group) =>
    facetGroup(group, index.options[group.key]),
  );
  railGroups.splice(
    groups.findIndex((g) => g.key === "access"),
    0,
    sizeGroup(index.units),
  );
  return `<div class="explore-page"><div class="explore-heading"><h1>Explore datasets</h1>
    <form class="explore-search" role="search" aria-label="Explore datasets">${searchIcon}<input name="q" type="search" aria-label="Search dataset names, anatomy and annotations" placeholder="Search datasets, anatomy or annotations"></form></div>
    <div class="explore-workspace">
      <aside class="explore-rail" aria-label="Dataset filters"><div class="filter-panel">
        <header class="filter-heading"><h2 id="filters-title">${filterIcon} Filters</h2><button type="button" class="filter-reset" data-reset>Reset</button><button type="button" class="drawer-close" aria-label="Close filters" data-close-filters>×</button></header>
        <p class="filter-hint"><b>✓</b> Include <span aria-hidden="true">·</span> <b>×</b> Exclude</p>
        <div class="filter-groups">${railGroups.join("")}</div>
        <div class="drawer-footer"><button type="button" class="button" data-close-filters></button></div></div></aside>
      <section class="explore-results" aria-label="Dataset results">
        <div class="explore-toolbar"><div class="result-total"><h2 tabindex="-1" aria-live="polite" aria-atomic="true"></h2>
          <button type="button" class="open-filters" aria-haspopup="dialog" aria-controls="explore-filter-dialog">${filterIcon} Filters<span></span></button></div>
          <div class="result-controls"><label for="explore-sort">Sort</label><select id="explore-sort" class="explore-sort" aria-label="Sort datasets"><option value="review">Reviewed first</option><option value="name">Name A–Z</option><option value="year">Newest first</option></select>
          <div class="view-toggle" aria-label="Results view"><a data-view="table">Table</a><a data-view="gallery">Gallery</a></div></div></div>
        <div class="filter-chips" aria-label="Active filters" hidden></div>
        <div class="explore-list"></div></section>
    </div><dialog id="explore-filter-dialog" class="filter-drawer" aria-labelledby="filters-title"></dialog></div>`;
}

function chip(label, accessible, attrs) {
  return `<button type="button" class="filter-chip" ${attrs} aria-label="Remove ${esc(accessible)}" title="Remove ${esc(accessible)}">${esc(label)} <span aria-hidden="true">×</span></button>`;
}

function sizeLabel(params) {
  const hasMin = params.min != null && params.min !== "";
  const hasMax = params.max != null && params.max !== "";
  if (!hasMin && !hasMax) return "";
  const bounds =
    hasMin && hasMax
      ? number(params.min) + "–" + number(params.max)
      : hasMin
        ? "≥ " + number(params.min)
        : "≤ " + number(params.max);
  return bounds + " " + (params.unit || "patients");
}

function syncOptions(group) {
  const { rows, filter, list, more, empty, active } = group;
  const query = normalize(filter?.value || "");
  const selected = new Set([...active.include, ...active.exclude]);
  const matching = [...rows].filter(
    ([value]) =>
      !query || normalize(valueLabel(group.key, value)).includes(query),
  );
  const visible = new Set(
    matching
      .filter(
        ([value], i) =>
          query || group.expanded || i < SHORT_LIST || selected.has(value),
      )
      .map(([v]) => v),
  );
  for (const [value, row] of rows) row.hidden = !visible.has(value);
  list.classList.toggle("scroll-options", visible.size > SHORT_LIST);
  empty.hidden = matching.length > 0;
  const rest = matching.length - visible.size;
  more.hidden =
    Boolean(query) ||
    (group.expanded ? matching.length <= SHORT_LIST : rest === 0);
  more.textContent = group.expanded ? "Show fewer" : "Show " + rest + " more";
  more.setAttribute("aria-expanded", String(group.expanded));
}

function updateGroup(group, active, counts, initial) {
  group.active = active;
  const selected = new Set([...active.include, ...active.exclude]);
  const badge = group.node.querySelector(".selection-count");
  badge.hidden = selected.size === 0;
  badge.textContent = selected.size;
  if (initial && selected.size) group.node.open = true;
  for (const value of selected) {
    if (group.rows.has(value)) continue;
    group.list.insertAdjacentHTML("beforeend", optionRow(group.key, value));
    const row = group.list.lastElementChild;
    row.dataset.extra = "true";
    group.rows.set(value, row);
  }
  for (const [value, row] of group.rows) {
    if (row.dataset.extra && !selected.has(value)) {
      row.remove();
      group.rows.delete(value);
      continue;
    }
    const isIncluded = active.include.includes(value),
      isExcluded = active.exclude.includes(value);
    const state = isIncluded ? "include" : isExcluded ? "exclude" : "";
    if (row.dataset.state !== state) {
      row.dataset.state = state;
      row
        .querySelector(".include-option")
        .setAttribute("aria-pressed", String(isIncluded));
      row
        .querySelector(".exclude-option")
        .setAttribute("aria-pressed", String(isExcluded));
    }
    const count = String(counts.get(value) || 0);
    const countNode = row.querySelector(".option-count");
    if (countNode.textContent !== count) countNode.textContent = count;
  }
  const ranked = [...group.rows].sort(
    ([a], [b]) =>
      (counts.get(b) || 0) - (counts.get(a) || 0) ||
      valueLabel(group.key, a).localeCompare(valueLabel(group.key, b)),
  );
  if (ranked.some(([, row], index) => group.list.children[index] !== row)) {
    group.rows = new Map(ranked);
    group.list.append(...group.rows.values());
  }
  syncOptions(group);
}

export function pagination(params, page, last) {
  const status = `<span class="page-status">Page ${number(page)} of ${number(last)}</span>`;
  if (last === 1) return `<div class="pages">${status}</div>`;
  const link = (target, label, attributes) =>
    `<a href="${pageLink({ ...params, p: target })}" data-page="${target}" ${attributes}>${label}</a>`;
  const links = [];
  if (page > 1) links.push(link(page - 1, "Previous", 'rel="prev"'));
  for (let target = 1; target <= last; target++) {
    const current = target === page ? ' aria-current="page"' : "";
    links.push(
      link(target, number(target), `aria-label="Page ${target}"${current}`),
    );
  }
  if (page < last) links.push(link(page + 1, "Next", 'rel="next"'));
  return `<nav class="pages" aria-label="Dataset pages">${status}<div class="page-links">${links.join("")}</div></nav>`;
}

function resultsHtml(rows, params, mode) {
  rows.sort((a, b) => {
    if (params.sort === "year") return byReleaseDate(a.record, b.record);
    if (
      params.sort !== "name" &&
      a.record.review.status !== b.record.review.status
    )
      return a.record.review.status === "curated" ? -1 : 1;
    return a.record.name.localeCompare(b.record.name);
  });
  if (!rows.length)
    return '<div class="empty"><h3>No datasets match these filters.</h3><p>Remove a selection or <button type="button" class="text-button" data-reset>reset filters</button>.</p></div>';
  const last = Math.ceil(rows.length / PAGE_SIZE);
  const page = Math.min(last, Math.max(1, Math.trunc(Number(params.p)) || 1));
  const displayRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const content =
    mode === "table"
      ? tableRows(displayRows)
      : `<div class="cards">${displayRows.map((x) => datasetCard(x.record, x.subsets)).join("")}</div>`;
  return content + pagination(params, page, last);
}

export function mountExplore(main, records, navigate) {
  const index = indexCatalogue(records);
  main.innerHTML = pageMarkup(index);
  const root = main.querySelector(".explore-page");
  const panel = root.querySelector(".filter-panel"),
    rail = root.querySelector(".explore-rail");
  const drawer = root.querySelector(".filter-drawer"),
    opener = root.querySelector(".open-filters");
  const chips = root.querySelector(".filter-chips"),
    size = root.querySelector(".size-filter");
  const search = root.querySelector(".explore-search input"),
    sort = root.querySelector(".explore-sort");
  const widgets = new Map(
    groups.map(({ key }) => {
      const node = panel.querySelector('[data-group="' + key + '"]');
      const list = node.querySelector("ul");
      return [
        key,
        {
          key,
          node,
          list,
          rows: new Map([...list.children].map((r) => [r.dataset.value, r])),
          filter: node.querySelector(".option-search"),
          more: node.querySelector(".more-options"),
          empty: node.querySelector(".no-options"),
          active: { include: [], exclude: [] },
          expanded: false,
        },
      ];
    }),
  );
  let params,
    initial = true;
  const mobile = window.matchMedia("(max-width: 639px)");
  const onBreakpoint = () => {
    if (!mobile.matches && drawer.open) drawer.close();
  };
  mobile.addEventListener("change", onBreakpoint);
  drawer.addEventListener("close", () => {
    rail.append(panel);
    if (mobile.matches) opener.focus({ preventScroll: true });
  });
  const setParams = (next, replace = false) =>
    navigate({ ...next, p: "" }, replace);

  function reset() {
    for (const widget of widgets.values()) {
      if (widget.filter) widget.filter.value = "";
      widget.expanded = false;
    }
    size.reset();
    size.elements.unit.value = "patients";
    size.querySelector(".size-error").textContent = "";
    navigate(clearExploreFilters(params));
  }

  function updateSize(replace = false) {
    const { min, max, unit } = size.elements;
    const error = size.querySelector(".size-error");
    const invalid = [min, max].some((input) => !input.validity.valid);
    error.textContent = invalid
      ? "Enter a whole number of zero or more."
      : min.value && max.value && Number(min.value) > Number(max.value)
        ? "Maximum must be at least the minimum."
        : "";
    for (const input of [min, max])
      input.setAttribute("aria-invalid", String(Boolean(error.textContent)));
    if (error.textContent) return;
    setParams(
      {
        ...params,
        min: min.value,
        max: max.value,
        unit: unit.value || "patients",
      },
      replace,
    );
  }

  root.addEventListener("click", (event) => {
    const pageAnchor = event.target.closest("a[data-page]");
    if (
      pageAnchor &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      navigate({ ...params, p: pageAnchor.dataset.page });
      const heading = root.querySelector(".result-total h2");
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: "start" });
      return;
    }
    const button = event.target.closest("button");
    if (!button) {
      if (event.target === drawer) drawer.close();
      return;
    }
    if (button === opener) {
      drawer.append(panel);
      drawer.showModal();
      return;
    }
    if (button.hasAttribute("data-close-filters")) {
      drawer.close();
      return;
    }
    if (button.hasAttribute("data-reset")) {
      reset();
      return;
    }
    if (button.hasAttribute("data-clear-size")) {
      setParams({ ...params, min: "", max: "", unit: "" });
      return;
    }
    if (button.matches(".more-options")) {
      const widget = widgets.get(button.closest("[data-group]").dataset.group);
      widget.expanded = !widget.expanded;
      syncOptions(widget);
      return;
    }
    if (button.dataset.direction) {
      const key = button.closest("[data-group]").dataset.group,
        value = button.closest("[data-value]").dataset.value;
      setParams(toggleSelection(params, key, value, button.dataset.direction));
    }
  });
  root.addEventListener("input", (event) => {
    const input = event.target;
    if (input === search && !event.isComposing)
      setParams({ ...params, q: search.value }, true);
    if (size.contains(input) && input.type === "number") updateSize(true);
    if (input.matches(".option-search"))
      syncOptions(widgets.get(input.closest("[data-group]").dataset.group));
  });
  root.addEventListener("change", (event) => {
    if (size.contains(event.target)) updateSize();
    else if (event.target === sort) setParams({ ...params, sort: sort.value });
  });
  root.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target === size) updateSize();
    else if (event.target.matches(".explore-search"))
      setParams({ ...params, q: search.value });
  });

  function render(next) {
    params = next;
    const { rows, counts, active } = evaluateFilters(index, params);
    const applied = [];
    for (const { key, title } of groups) {
      updateGroup(widgets.get(key), active[key], counts[key], initial);
      for (const side of ["include", "exclude"])
        for (const value of active[key][side]) {
          const label = valueLabel(key, value);
          const caption =
            key === "anatomy"
              ? "Anatomy · " + label
              : key === "target"
                ? "Target · " + label
                : label;
          applied.push(
            chip(
              (side === "exclude" ? "− " : "✓ ") + caption,
              (side === "exclude" ? "excluded " : "included ") +
                label +
                " (" +
                title +
                ")",
              `data-group="${key}" data-value="${esc(value)}" data-direction="${side}"`,
            ),
          );
        }
    }
    const range = sizeLabel(params),
      sizeGroup = size.closest("details"),
      sizeCount = sizeGroup.querySelector(".selection-count");
    sizeCount.hidden = !range;
    sizeCount.textContent = range ? "1" : "";
    if (initial && range) sizeGroup.open = true;
    if (range) applied.push(chip(range, "size filter", "data-clear-size"));
    if (search.value !== (params.q || "")) search.value = params.q || "";
    for (const name of ["min", "max", "unit"]) {
      const expected = params[name] || (name === "unit" ? "patients" : "");
      if (
        name === "unit" &&
        ![...size.elements.unit.options].some((o) => o.value === expected)
      )
        size.elements.unit.add(new Option(expected, expected));
      if (size.elements[name].value !== expected)
        size.elements[name].value = expected;
    }
    size.querySelector(".size-error").textContent = "";
    for (const name of ["min", "max"])
      size.elements[name].removeAttribute("aria-invalid");
    const wasChip = chips.contains(document.activeElement);
    chips.hidden = !applied.length;
    chips.innerHTML = applied.join("");
    if (wasChip)
      (chips.querySelector("button") || search).focus({ preventScroll: true });
    panel.querySelector("[data-reset]").disabled = !(
      applied.length ||
      params.q ||
      params.unit
    );
    opener.querySelector("span").textContent = applied.length
      ? " (" + applied.length + ")"
      : "";
    const total =
      number(rows.length) + (rows.length === 1 ? " dataset" : " datasets");
    root.querySelector(".result-total h2").textContent = total;
    panel.querySelector(".drawer-footer button").textContent = "Show " + total;
    sort.value = params.sort || "review";
    const mode = params.view === "gallery" ? "gallery" : "table";
    for (const link of root.querySelectorAll("[data-view]")) {
      const selected = link.dataset.view === mode;
      link.href = route("explore", {
        ...params,
        view: link.dataset.view,
        p: "",
      });
      link.classList.toggle("selected", selected);
      if (selected) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
    root.querySelector(".explore-list").innerHTML = resultsHtml(
      rows,
      params,
      mode,
    );
    initial = false;
  }
  return {
    render,
    destroy() {
      mobile.removeEventListener("change", onBreakpoint);
      if (drawer.open) drawer.close();
    },
  };
}
