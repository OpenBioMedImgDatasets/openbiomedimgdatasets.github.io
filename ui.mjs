import { iconFor, subsetValues, unique, valuesOf } from "./search.mjs";
import { isFacetParameter } from "./explore-filters.mjs";
import { imagingName } from "./imaging.mjs";

export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const number = (value) => Number(value).toLocaleString("en-US");
export const reviewName = (item) =>
  item.review.status === "curated" ? "Source-reviewed" : "From organizer sheet";
export const accessNames = {
  open: "Direct download",
  registration: "Registration",
  application: "Application",
  mixed: "Mixed access",
  unreported: "Access unverified",
  unavailable: "Files unavailable",
};
export const icon = (modality, css = "icon-box") =>
  `<span class="${css}"><img width="40" height="40" alt="" src="assets/icons/${iconFor(modality)}.svg"></span>`;
export function external(url, label, css = "") {
  if (!/^https?:\/\//i.test(url || "")) return esc(label);
  return `<a class="${css}" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
}
export function route(page, values = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    for (const entry of [].concat(value))
      if (entry !== null && entry !== undefined && entry !== "")
        params.append(key, entry);
  return "#" + page + (params.size ? "?" + params : "");
}
export function activeRoute(fragment = location.hash) {
  const hash = fragment.slice(1);
  const q = hash.indexOf("?");
  const name = q < 0 ? hash : hash.slice(0, q);
  const pairs = new URLSearchParams(q < 0 ? "" : hash.slice(q + 1));
  const params = Object.fromEntries(pairs);
  if (name === "explore") {
    delete params.review;
    delete params["exclude.review"];
    for (const key of Object.keys(params)) {
      if (!isFacetParameter(key)) continue;
      let values = pairs.getAll(key);
      if (key === "modality" || key === "exclude.modality")
        values = unique(values.map(imagingName));
      if (values.length) params[key] = values.length === 1 ? values[0] : values;
      else delete params[key];
    }
  }
  return {
    page: ["overview", "explore", "search"].includes(name) ? name : "overview",
    params,
  };
}
export function detailLink(id) {
  const { page, params } = activeRoute();
  return esc(route(page, { ...params, dataset: id }));
}
export function byReleaseDate(a, b) {
  return (
    (b.year ?? 0) - (a.year ?? 0) ||
    (b.releaseMonth?.value ?? 0) - (a.releaseMonth?.value ?? 0) ||
    a.name.localeCompare(b.name, "en") ||
    a.id.localeCompare(b.id, "en")
  );
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function releaseDate({ year, releaseMonth }, classes = "release-date") {
  const className = esc(classes);
  if (!Number.isInteger(year))
    return `<span class="${className}">Release date unreported</span>`;

  const month = releaseMonth?.value;
  const monthName = monthNames[month - 1];
  if (!monthName)
    return `<span class="${className}"><time datetime="${year}">${year}</time><small>Month unreported</small></span>`;

  const isoMonth = `${year}-${String(month).padStart(2, "0")}`;
  return `<time class="${className}" datetime="${isoMonth}">${monthName} ${year}</time>`;
}

export function headlineCount(subsets) {
  if (subsets.length > 1) return number(subsets.length) + " subsets";
  const total = subsets.flatMap((s) =>
    s.counts.filter((c) => c.kind === "total"),
  );
  const count =
    total.find((c) =>
      ["patients", "participants", "subjects", "people"].includes(c.unit),
    ) ||
    total[0] ||
    subsets.flatMap((s) => s.counts)[0];
  if (!count) return "Count unreported";
  return `${number(count.value)} ${count.unit}`;
}
function valueList(values, field, limit) {
  const visible = values.slice(0, limit);
  const extra = values.slice(limit);
  const noun =
    extra.length === 1
      ? { modalities: "modality", tasks: "task", sequences: "sequence" }[field]
      : field;
  return (
    esc(visible.join(", ")) +
    (extra.length
      ? `<details class="coverage-expand"><summary>${extra.length} more ${noun}</summary><span>${esc(extra.join(", "))}</span></details>`
      : "")
  );
}

export function coverageValue(item, subsets, field, limit = Infinity) {
  const matched = subsetValues(subsets, field);
  const other = valuesOf(item, field).filter(
    (value) => !matched.includes(value),
  );
  return (
    (matched.length
      ? valueList(matched, field, limit)
      : "Unreported for this component") +
    (other.length
      ? `<div class="coverage-other"><b>Elsewhere in this dataset</b> ${valueList(other, field, limit)}</div>`
      : "")
  );
}

export function coverageSummary(item, subsets = item.subsets, compact = false) {
  const modes = valuesOf(item, "modalities"),
    tasks = valuesOf(item, "tasks");
  const sequences = valuesOf(item, "sequences");
  const same =
    modes.length === subsetValues(subsets, "modalities").length &&
    tasks.length === subsetValues(subsets, "tasks").length;
  if (
    compact &&
    same &&
    modes.length <= 1 &&
    tasks.length <= 1 &&
    sequences.length < 2
  )
    return `<div class="coverage-summary">${esc([...modes, ...tasks].join(" · "))}</div>`;
  const modeLabel = modes.length > 1 ? "Multimodal" : "Modality";
  return `<div class="coverage-summary"><div><b>${modeLabel}</b> ${coverageValue(item, subsets, "modalities")}</div>
    <div><b>${tasks.length === 1 ? "Task" : "Tasks"}</b> ${coverageValue(item, subsets, "tasks", compact ? 3 : Infinity)}</div>
    ${sequences.length > 1 ? `<div><b>Sequences / channels</b> ${coverageValue(item, subsets, "sequences", compact ? 3 : Infinity)}</div>` : ""}</div>`;
}

export function datasetCard(item, subsets = item.subsets) {
  return `<article class="card"><div class="card-top">${icon(subsetValues(subsets, "modalities")[0])}${releaseDate(item, "release-date compact")}</div>
    <h3><a class="record-link" href="${detailLink(item.id)}">${esc(item.name)}</a></h3><p>${esc(item.summary)}</p>
    ${coverageSummary(item, subsets, true)}<div class="card-foot"><strong>${esc(headlineCount(subsets))}</strong></div></article>`;
}
export function recordSource(item, id) {
  const source = item.sources.find((s) => s.id === id);
  return source ? external(source.url, source.title, "source") : "";
}
export function optionList(values, current, all) {
  return (
    (all ? `<option value="">${esc(all)}</option>` : "") +
    unique(values)
      .map(
        (v) =>
          `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(v)}</option>`,
      )
      .join("")
  );
}
