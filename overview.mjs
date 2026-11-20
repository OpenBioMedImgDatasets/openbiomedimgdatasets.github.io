import { indexCatalogue } from "./explore-filters.mjs";
import {
  accessNames,
  byReleaseDate,
  coverageSummary,
  esc,
  icon,
  number,
  route,
} from "./ui.mjs";

export function latestReleases(records) {
  return records
    .filter((record) => Number.isInteger(record.year))
    .sort(byReleaseDate)
    .slice(0, 10);
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function newsDate(record) {
  const month = record.releaseMonth?.value;
  if (!month)
    return `<span class="release-date"><time datetime="${record.year}">${record.year}</time><small>Month unreported</small></span>`;
  const isoMonth = record.year + "-" + String(month).padStart(2, "0");
  return `<time class="release-date" datetime="${isoMonth}">${monthNames[month - 1]} ${record.year}</time>`;
}

function newsSection(records) {
  const rows = latestReleases(records).map((record) => {
    return `<li class="release-row">
      ${newsDate(record)}
      <div class="release-info"><a class="record-link" href="${esc(route("overview", { dataset: record.id }))}"><strong>${esc(record.name)}</strong></a>
      ${coverageSummary(record, record.subsets, true)}</div></li>`;
  });
  return `<section class="overview-section" aria-labelledby="news-title">
    <div class="section-head"><h2 id="news-title">News</h2><a href="${esc(route("explore", { sort: "year" }))}">All releases</a></div>
    <p class="section-note">Latest dataset releases by month and year.</p>
    ${rows.length ? `<ol class="release-list" aria-label="Latest dataset releases">${rows.join("")}</ol>` : '<p class="muted">No release years have been recorded.</p>'}
  </section>`;
}

const breakdowns = [
  {
    key: "modality",
    title: "Datasets by imaging modality",
    id: "browse-modalities",
    open: true,
  },
  { key: "task", title: "Datasets by task", id: "browse-tasks", open: true },
  { key: "anatomy", title: "Datasets by anatomy", id: "browse-anatomy" },
  { key: "access", title: "Datasets by access", id: "browse-access" },
];

function byDatasetCount([a, countA], [b, countB]) {
  return countB - countA || a.localeCompare(b, "en");
}

function statisticsSection(options, total) {
  const charts = breakdowns.map(({ key, title, id, open }) => {
    const categories = [...options[key]].sort(byDatasetCount);
    const rows = categories.map(([value, count]) => {
      const label =
        value === "Unreported"
          ? "Unreported in a subset"
          : (key === "access" && accessNames[value]) || value;
      const href = route("explore", { [key]: value });
      const share = total ? ((100 * count) / total).toFixed(2) : 0;
      return `<li><a class="distribution-row" href="${esc(href)}" aria-label="${esc(label)}, ${number(count)} ${count === 1 ? "dataset" : "datasets"}">
        <span>${esc(label)}</span><span class="distribution-track" aria-hidden="true" style="--share:${share}%"></span>
        <span class="distribution-count">${number(count)}</span></a></li>`;
    });
    return `<details class="distribution" id="${id}" ${open ? "open" : ""}>
      <summary><h3>${title}</h3></summary>
      ${rows.length ? `<ul class="distribution-list" aria-label="${title}">${rows.join("")}</ul>` : '<p class="muted">No values recorded.</p>'}
    </details>`;
  });
  return `<section class="overview-section" aria-labelledby="statistics-title">
    <div class="section-head"><h2 id="statistics-title">Statistics</h2></div>
    <p class="section-note">Each chart counts a dataset once per category covered by its images. Multimodal collections can also include images with companion data.</p>
    <div class="coverage-shortcuts">${Array.from(options.coverage, ([feature, count]) => `<a href="${esc(route("explore", { coverage: feature }))}">${number(count)} ${feature === "Multimodal" ? "multimodal datasets" : "datasets with multiple tasks"}</a>`).join("")}</div>
    <div class="distributions">${charts.join("")}</div>
  </section>`;
}

export function overviewPage(records) {
  const { entries, options } = indexCatalogue(records);
  const published = entries.map((entry) => entry.record);
  const featuredModalities = [...options.modality]
    .sort(byDatasetCount)
    .slice(0, 12);
  const reportedCount = (counts) =>
    counts.size - (counts.has("Unreported") ? 1 : 0);
  const metrics = [
    [published.length, "Datasets", route("explore")],
    [
      reportedCount(options.modality),
      "Imaging modalities",
      "#browse-modalities",
    ],
    [reportedCount(options.task), "Research tasks", "#browse-tasks"],
  ];
  return `<section class="hero"><div><h1>Biomedical image datasets</h1><p class="intro">Find imaging cohorts by modality, anatomy and annotation. Check case counts, data licenses and citations at the source.</p>
  <div class="actions"><a class="button" href="#explore">Explore datasets <span aria-hidden="true">→</span></a><a class="button alt" href="#search">Search by description</a></div></div>
  <div class="atlas"><div class="atlas-title"><h2>Browse imaging modalities</h2><span aria-hidden="true"></span></div><div class="atlas-grid">${featuredModalities.map(([name, count]) => `<a href="${esc(route("explore", { modality: name }))}">${icon(name, "atlas-icon")}<strong>${esc(name)}</strong><small>${number(count)} ${count === 1 ? "dataset" : "datasets"}</small></a>`).join("")}</div></div></section>
  <div class="stats">${metrics.map(([n, label, link]) => `<a class="stat" href="${esc(link)}"><b>${number(n)}</b><span>${label}</span></a>`).join("")}</div>
  <div class="overview-sections">${newsSection(published)}${statisticsSection(options, published.length)}</div>`;
}
