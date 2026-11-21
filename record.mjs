import {
  accessNames,
  coverageSummary,
  esc,
  external,
  headlineCount,
  number,
  recordSource,
  releaseDate,
  reviewName,
} from "./ui.mjs";
import { componentTerms } from "./search.mjs";

function renderSubset(item, subset, showHeading = true) {
  const columns = [
    ["Data modalities", subset.modalities],
    ["Sequences or channels", subset.sequences || []],
    ["Anatomy", subset.anatomy],
    ["Conditions", subset.conditions],
    ["Tasks", subset.tasks],
    ["Annotation targets", subset.targets],
    ["Annotations", subset.annotations],
    [
      "Data access",
      subset.accessScopes
        ? componentTerms(item, subset, "access").map(
            (a) => accessNames[a.mode] + " · " + a.scope,
          )
        : [],
    ],
    [
      "Data license",
      subset.licenseScopes
        ? componentTerms(item, subset, "licenses").map(
            (l) => (l.name || "Unreported") + " · " + l.scope,
          )
        : [],
    ],
  ];
  const rows = subset.counts
    .map(
      (c) => `<tr><td><strong>${number(c.value)} ${esc(c.unit)}</strong></td>
    <td>${esc(c.scope)}<br>${[c.source, ...(c.additionalSources || [])].map((id) => recordSource(item, id)).join(" · ")}</td></tr>`,
    )
    .join("");
  return `<section class="subset">${showHeading ? `<h4>${esc(subset.name)}</h4>` : ""}
    ${subset.paired ? '<p class="paired-note">The source documents linkage between these modalities within this component.</p>' : ""}
    ${subset.availability === "unavailable" ? '<p class="gap-note">The provider lists this subset as unavailable.</p>' : ""}<dl>${columns
      .filter(([, v]) => v.length)
      .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v.join(", "))}</dd>`)
      .join("")}</dl>
    ${rows ? `<div class="scroll-table"><table><thead><tr><th>Reported count</th><th>Population or split</th></tr></thead><tbody>${rows}</tbody></table></div>` : "<p>Case count unreported for this subset.</p>"}
    <p>${subset.sources.map((id) => recordSource(item, id)).join(" · ")}</p></section>`;
}

export function renderRecord(item) {
  const terms = item.licenses
    .map(
      (l) =>
        `<div class="detail-pair"><strong>${l.url ? external(l.url, l.name || "Terms unreported") : esc(l.name || "Terms unreported")}</strong> · ${esc(l.scope)}<p>${esc(l.note)} ${recordSource(item, l.source)}</p></div>`,
    )
    .join("");
  const access = item.access
    .map(
      (a) =>
        `<div class="detail-pair"><strong>${esc(accessNames[a.mode])}</strong> · ${esc(a.scope)}<p>${esc(a.note)} ${external(a.url, "Access page")} · ${recordSource(item, a.source)}</p></div>`,
    )
    .join("");
  return `<div class="dialog-inner"><div class="dialog-bar"><span class="tag">${reviewName(item)}</span><button class="close" data-close autofocus>Close ×</button></div>
  <h2 id="detail-title">${esc(item.name)}</h2>
  <div class="meta-row">${[releaseDate(item), item.version ? esc("Version " + item.version) : "", esc(headlineCount(item.subsets))].filter(Boolean).join(" · ")}</div>
  ${coverageSummary(item)}
  <p>${esc(item.summary)}</p><div class="actions">${external(item.homepage, "Dataset source", "button")}<button class="button alt" data-copy-link>Copy record link</button><button class="button alt" data-export>Download metadata</button></div>
  ${item.aliases.length ? `<p class="compact">Also listed as ${esc(item.aliases.join(", "))}</p>` : ""}
  <div class="record-jumps"><button data-jump="record-cohort">Cohort &amp; labels</button><button data-jump="record-licenses">Data licenses</button><button data-jump="record-access">Access</button><button data-jump="record-citations">Citations (${item.citations.length})</button></div>
  <h3 id="record-cohort">Cohort and annotations</h3>${item.subsets.length === 1 ? renderSubset(item, item.subsets[0]) : '<p class="compact">Each component lists its own modalities, tasks and counts. Participants can appear in more than one component.</p>' + item.subsets.map((s, i) => `<details class="subset-block" ${i === 0 ? "open" : ""}><summary>${esc(s.name)}</summary>${renderSubset(item, s, false)}</details>`).join("")}
  <h3 id="record-licenses">Data licenses</h3>${terms || "<p>Data license unreported.</p>"}
  <h3 id="record-access">Data access</h3>${access || "<p>Access procedure unreported.</p>"}
  ${item.details.length ? `<h3>Additional details</h3>${item.details.map((d) => `<div class="detail-pair"><strong>${esc(d.label)}</strong><p>${esc(d.value)} ${recordSource(item, d.source)}</p></div>`).join("")}` : ""}
  <h3 id="record-citations">Citations</h3>${
    item.citations.length
      ? `<ul class="evidence-list">${item.citations.map((c) => `<li>${c.role === "paper" ? "Paper" : "Dataset"} · ${c.doi ? external("https://doi.org/" + c.doi, c.doi) : recordSource(item, c.source)}</li>`).join("")}</ul>
  <details><summary>View BibTeX (${item.citations.length})</summary><pre>${esc(item.bibtex)}</pre><button class="button alt" data-copy-bib>Copy BibTeX</button></details>`
      : "<p>BibTeX has not yet been verified.</p>"
  }
  ${item.review.unresolved.length ? `<div class="gap-note"><strong>Items to verify</strong><ul>${item.review.unresolved.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>` : ""}
  <h3>Sources</h3><ol class="evidence-list">${item.sources.map((s) => `<li>${external(s.url, s.title)}<br><span class="compact">${esc(s.locator)}</span></li>`).join("")}</ol>
  <p class="compact">${item.review.status === "curated" ? "Primary sources checked" : "Organizer sheet checked"} ${esc(item.review.checked)}.</p>
  <span id="copy-status" role="status" class="compact"></span></div>`;
}
