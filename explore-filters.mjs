import {
  collectionFeatures,
  componentTerms,
  meetsSize,
  normalize,
  unique,
} from "./search.mjs";
import { imageComponents, imagingName } from "./imaging.mjs";

const annotationFormats = [
  ["Segmentation masks", /\bmasks?\b|\bvoxel labels?\b|\bdicom seg\b/i],
  ["Contours", /\bcontours?\b|\brtstruct\b/i],
  ["Case or image labels", /\b(?:patient|subject|image|slide)-level\b/i],
  [
    "Points and landmarks",
    /\b(?:point marks?|landmarks?|centroid coordinates)\b/i,
  ],
  ["Bounding boxes", /\bbounding box(?:es)?\b/i],
  ["Surface meshes", /\b(?:surface meshes|surface mesh)\b/i],
  ["Reader ratings", /\bratings?\b|\breader assessments?\b/i],
  ["Paired reports", /\bpaired (?:radiology )?reports?\b/i],
];
const formatNames = new Set([
  ...annotationFormats.map(([name]) => name),
  "Other documented annotations",
  "Unreported",
]);

export const groups = [
  { key: "modality", title: "Imaging modality", field: "modalities" },
  { key: "task", title: "Research task", field: "tasks" },
  { key: "coverage", title: "Dataset coverage" },
  { key: "year", title: "Release year" },
  { key: "anatomy", title: "Anatomy", field: "anatomy" },
  { key: "target", title: "Labeled target", field: "targets" },
  { key: "annotation", title: "Annotation type", field: "annotations" },
  { key: "access", title: "Data access", component: true },
  { key: "license", title: "Reported data license", component: true },
];

const keys = new Set(groups.map((group) => group.key));
const subsetGroups = groups.filter((group) => group.field);
export function isFacetParameter(key) {
  return keys.has(key.replace(/^exclude\./, ""));
}

// Retain the stated license version. Fold only spelling variants of the same designation.
function licenseName(value) {
  if (!value) return "Unreported";
  const text = value.trim();
  if (/^cc(?:0|\s+zero)\b/i.test(text))
    return /1\.0/.test(text) ? "CC0 1.0" : "CC0";
  const match = text.match(
    /^cc[- ]+by((?:[- ]+(?:nc|sa|nd))*)(?:[- ]+(\d\.\d))?(?:\s+(?:license|\(version unspecified\)))?$/i,
  );
  if (!match) return text;
  const terms = ["NC", "ND", "SA"].filter((term) =>
    match[1].toUpperCase().includes(term),
  );
  return ["CC BY", ...terms].join("-") + (match[2] ? " " + match[2] : "");
}

function canonical(key, value) {
  if (key === "modality") return imagingName(value);
  if (key === "license") return licenseName(value);
  if (key === "target" || key === "anatomy")
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  return value;
}

function selected(params, key, facet) {
  return unique(
    [].concat(params[key] || []).map((value) => canonical(facet, value)),
  );
}

export function selections(params) {
  return Object.fromEntries(
    groups.map(({ key }) => {
      const exclude = selected(params, "exclude." + key, key);
      const include = selected(params, key, key).filter(
        (value) => !exclude.includes(value),
      );
      return [key, { include, exclude }];
    }),
  );
}

export function toggleSelection(params, key, value, direction) {
  const current = selections(params)[key];
  const next = { ...params };
  for (const side of ["include", "exclude"]) {
    const param = side === "include" ? key : "exclude." + key;
    const values = current[side].filter((v) => v !== value);
    if (side === direction && !current[side].includes(value))
      values.push(value);
    if (values.length) next[param] = values;
    else delete next[param];
  }
  delete next.p;
  return next;
}

export function clearExploreFilters(params) {
  return { view: params.view, sort: params.sort };
}

export function indexCatalogue(records) {
  const options = Object.fromEntries(groups.map((g) => [g.key, new Map()]));
  const units = new Set();
  const entries = records.flatMap((source) => {
    const imaging = imageComponents(source);
    if (!imaging.length) return [];
    const record = { ...source, subsets: imaging };
    const global = {
      coverage: collectionFeatures(source, imaging),
      year: [Number.isInteger(record.year) ? String(record.year) : "Unreported"],
    };
    const info = [record.name, ...record.aliases];
    if (source.subsets.length === 1) info.push(record.summary);
    const subsets = record.subsets.map((subset) => {
      const values = {
        access: unique(
          componentTerms(record, subset, "access").map((a) => a.mode),
        ),
        license: unique(
          componentTerms(record, subset, "licenses").map((l) =>
            licenseName(l.name),
          ),
        ),
      };
      if (!values.access.length) values.access.push("unreported");
      if (!values.license.length) values.license.push("Unreported");
      for (const { key, field } of subsetGroups) {
        if (key === "annotation") {
          const formats = annotationFormats
            .filter(([, rule]) => subset.annotations.some((t) => rule.test(t)))
            .map(([name]) => name);
          if (!formats.length) {
            formats.push(
              subset.annotations.length
                ? "Other documented annotations"
                : "Unreported",
            );
          }
          // Exact descriptions remain selectable from existing saved links.
          values.annotation = unique([...formats, ...subset.annotations]);
        } else {
          values[key] = unique(subset[field].map((v) => canonical(key, v)));
          if (!values[key].length) values[key].push("Unreported");
        }
      }
      for (const c of subset.counts) if (c.kind === "total") units.add(c.unit);
      const text = normalize(
        [
          ...info,
          subset.name,
          ...subset.targets,
          ...subset.anatomy,
          ...subset.conditions,
          ...subset.modalities,
          ...subset.annotations,
          ...subset.tasks,
          ...(subset.sequences || []),
        ].join(" "),
      );
      return { subset, values, text };
    });
    const all = { ...global };
    for (const { key, field, component } of groups) {
      if (field || component)
        all[key] = unique(subsets.flatMap((s) => s.values[key]));
      for (const value of all[key]) {
        if (key === "annotation" && !formatNames.has(value)) continue;
        const counts = options[key];
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
    return [{ record, subsets, all }];
  });
  return { entries, options, units: [...units].sort() };
}

function matchingRows(entries, active, params, ignoreKey) {
  const applied = groups.filter(
    (g) =>
      g.key !== ignoreKey &&
      (active[g.key].include.length || active[g.key].exclude.length),
  );
  const text = normalize(params.q).split(" ").filter(Boolean);
  const hasMin = params.min != null && params.min !== "";
  const hasMax = params.max != null && params.max !== "";
  const unit = params.unit || "patients";
  const included = (key, values) =>
    !active[key].include.length ||
    active[key].include.some((v) => values.includes(v));
  return entries.flatMap((entry) => {
    for (const { key, field, component } of applied) {
      if (active[key].exclude.some((v) => entry.all[key].includes(v)))
        return [];
      if (!field && !component && !included(key, entry.all[key])) return [];
    }
    const subsets = entry.subsets.filter((s) => {
      if (
        applied.some(
          (g) => (g.field || g.component) && !included(g.key, s.values[g.key]),
        )
      )
        return false;
      if (text.some((word) => !s.text.includes(word))) return false;
      if (!hasMin && !hasMax) return true;
      return s.subset.counts.some(
        (c) =>
          (!hasMin ||
            meetsSize(c, { unit, value: Number(params.min), op: "≥" })) &&
          (!hasMax ||
            meetsSize(c, { unit, value: Number(params.max), op: "≤" })),
      );
    });
    return subsets.length ? [{ entry, subsets }] : [];
  });
}

export function evaluateFilters(index, params) {
  const active = selections(params);
  const matches = matchingRows(index.entries, active, params);
  const counts = {};
  for (const { key, field, component } of groups) {
    // Ignore this facet's own selection when counting its available alternatives.
    const base =
      active[key].include.length || active[key].exclude.length
        ? matchingRows(index.entries, active, params, key)
        : matches;
    const options = new Map();
    for (const { entry, subsets } of base) {
      const values =
        field || component
          ? unique(subsets.flatMap((s) => s.values[key]))
          : entry.all[key];
      for (const value of values)
        options.set(value, (options.get(value) || 0) + 1);
    }
    counts[key] = options;
  }
  const rows = matches.map(({ entry, subsets }) => ({
    record: entry.record,
    subsets: subsets.map((s) => s.subset),
  }));
  return { rows, counts, active };
}
