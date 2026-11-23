import { examples, findDatasets, meetsSize, unique } from "./search.mjs";
import { imagingName } from "./imaging.mjs";
import {
  detailLink,
  coverageSummary,
  esc,
  headlineCount,
  icon,
  number,
  recordSource,
  reviewName,
  route,
} from "./ui.mjs";

function resultCard(result, query, chosenModality) {
  const { record } = result;
  const subsets = chosenModality
    ? result.subsets.filter((s) =>
        s.modalities.some((value) => imagingName(value) === chosenModality),
      )
    : result.subsets;
  const modes = unique(subsets.flatMap((s) => s.modalities));
  const targets = unique(subsets.flatMap((s) => s.targets));
  const counts = subsets.flatMap((s) => s.counts);
  const count = query.sizeRule
    ? counts.find((c) => meetsSize(c, query.sizeRule))
    : counts.find((c) => c.kind === "train") ||
      counts.find((c) => c.kind === "annotated");
  const sourceId = count?.source || subsets[0]?.sources[0];
  return `<article class="result"><div class="result-head"><div class="row-name">${icon(modes[0])}<h3><a href="${detailLink(record.id)}">${esc(record.name)}</a></h3></div><span class="tag">${reviewName(record)}</span></div>
  ${coverageSummary(record, subsets, true)}
  <p><strong>Targets</strong> ${esc(targets.join(", ") || "Unreported")}</p>
  <div class="pills"><strong class="compact">${esc(count ? number(count.value) + " " + count.unit + " · " + count.scope : headlineCount(subsets))}</strong></div>
  <div class="result-controls" style="margin-top:8px">${recordSource(record, sourceId)}<a class="source" href="${detailLink(record.id)}">View record →</a></div></article>`;
}

export function searchPage(records, params) {
  const raw = params.q || "";
  const { query, results } = findDatasets(records, raw);
  const examplesHtml = examples
    .map(
      (e, i) =>
        `<a href="${esc(route("search", { q: e }))}">${["Lung cancer segmentation on CT", "Heart segmentation across modalities", "Pancreas masks in 1,000+ CT scans"][i]} ↗</a>`,
    )
    .join("");
  let body = "";
  if (raw.trim()) {
    const labels = query.labels.length ? query.labels : query.terms;
    const imageGroups = query.diverse
      ? results.map((r) =>
          unique(r.subsets.flatMap((s) => s.modalities.map(imagingName))),
        )
      : [];
    const groups = imageGroups.every((modes) => modes.length)
      ? unique(imageGroups.flat())
      : [];
    body = `<div class="interpret"><span>${query.labels.length ? "Recognized requirements" : "Search terms"}</span>${labels.map((l) => `<span class="chip">${esc(l)}</span>`).join("")}</div>`;
    if (query.preference?.labels.length)
      body += `<div class="interpret"><span>Preferences</span>${query.preference.labels.map((l) => `<span class="chip">${esc(l)}</span>`).join("")}</div>`;
    if (results.length) {
      body += `<div class="section-head search-heading"><h2>${number(results.length)} candidate ${results.length === 1 ? "dataset" : "datasets"}</h2></div>`;
      if (groups.length) {
        body += groups
          .map((m) => {
            const entries = results.filter((_, i) =>
              imageGroups[i].includes(m),
            );
            return `<h3 class="group-title">${esc(m)} · ${entries.length}</h3><div class="list">${entries.map((r) => resultCard(r, query, m)).join("")}</div>`;
          })
          .join("");
      } else {
        body += `<div class="list">${results.map((r) => resultCard(r, query)).join("")}</div>`;
      }
    } else {
      body += `<div class="empty"><h3>No documented match in this catalogue.</h3><p>${query.sizeRule ? "Try a smaller minimum or change the count unit if your study permits it." : "Edit the modality, annotation target or task, or browse the available records."} <a href="#explore">Explore datasets →</a></p></div>`;
    }
  }
  return `<div class="page-intro"><h1>Search by description</h1><p class="intro">Describe the images and labels you need. Search matches your request to records in the curated lists and links each candidate to its evidence.</p></div>
  <div class="search-notice" role="note">Under development</div>
  <form id="search-form" class="search-form"><label for="request">What data do you need?</label><textarea id="request" name="q" rows="3" required placeholder="e.g. Chest CT scans with primary lung tumor masks">${esc(raw)}</textarea>
  <div class="actions"><button type="submit" class="button">Find datasets <span aria-hidden="true">→</span></button></div></form>
  <div class="examples" aria-label="Example searches">${examplesHtml}</div>${body}`;
}
