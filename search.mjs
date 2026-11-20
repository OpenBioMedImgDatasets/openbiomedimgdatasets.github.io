export const examples = [
  "Datasets to train lung cancer segmentation model from CT scans",
  "Give me dataset list to train heart segmentation models in various images",
  "Abdominal CT with pancreas masks and at least 1,000 scans",
];

export const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/tumour/g, "tumor")
    .replace(/haem/g, "hem")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export const unique = (values) => [...new Set(values.filter(Boolean))];
export const subsetValues = (subsets, field) =>
  unique(subsets.flatMap((subset) => subset[field] || []));
export const valuesOf = (item, field) => subsetValues(item.subsets, field);

export function collectionFeatures(record, taskSubsets = record.subsets) {
  const features = [];
  if (valuesOf(record, "modalities").length > 1) features.push("Multimodal");
  if (subsetValues(taskSubsets, "tasks").length > 1)
    features.push("Multiple tasks");
  return features;
}

export function componentTerms(record, subset, field) {
  const scopes = subset[field === "access" ? "accessScopes" : "licenseScopes"];
  const entries = record[field] || [];
  return scopes
    ? entries.filter((entry) => scopes.includes(entry.scope))
    : entries;
}

const modalityRules = [
  ["CT", /\b(ct|cta|computed tomography|cat scans?)\b/],
  ["MRI", /\b(mri|mr|cmr|mpmri|magnetic resonance)\b/],
  ["Ultrasound", /\b(ultrasound|sonograph\w*|echocardiogra\w*|echo|us)\b/],
  ["Pathology", /\b(pathology|histopatholog\w*|whole slide|wsi|histolog\w*)\b/],
  ["X-ray", /\b(x ray|xray|cxr|radiograph\w*)\b/],
  ["Microscopy", /\b(microscop\w*)\b/],
  ["Fundus", /\b(fundus)\b/],
  ["OCT", /\b(oct|optical coherence tomography)\b/],
  ["Endoscopy", /\b(endoscop\w*|colonoscop\w*)\b/],
  ["Dermoscopy", /\b(dermoscop\w*)\b/],
  ["PET", /\b(pet|positron emission)\b/],
  ["PET/CT", /\bpet ct\b/],
  ["Mammography", /\b(mammogra\w*)\b/],
  ["Whole-genome sequencing", /\b(wgs|whole genome sequencing)\b/],
  [
    "RNA sequencing",
    /\b(rna seq|rnaseq|rna sequencing|bulk transcriptomics)\b/,
  ],
  ["DNA methylation", /\b((?:dna )?methylation(?: arrays?)?)\b/],
  ["Spatial transcriptomics", /\b(spatial transcriptom\w*|visium)\b/],
  ["Spatial proteomics", /\b(spatial proteom\w*|geomx)\b/],
  [
    "Gene expression microarray",
    /\b(gene expression microarrays?|expression microarrays?)\b/,
  ],
  [
    "Clinical data",
    /\bclinical (data|tables?|records?|outcomes?|variables?|metadata)\b/,
  ],
  [
    "Radiology reports",
    /\b(?:(?:radiology|radiological|paired|free text) reports?|reports)\b/,
  ],
];
const taskRules = [
  ["Segmentation", /\b(segment\w*|masks?|contours?|delineat\w*)\b/],
  ["Classification", /\b(classif\w*|image level labels?)\b/],
  ["Detection", /\b(detect\w*|bounding box\w*)\b/],
  [
    "Report generation",
    /\b(report generation|generat\w* (?:radiology )?reports?|image to report|image to text)\b/,
  ],
  ["Registration", /\b(registrat\w*|registering)\b/],
  ["Tracking", /\btracking\b/],
  ["Clustering", /\b(cluster\w*|archetyp\w* analysis)\b/],
  [
    "Multi-omics integration",
    /\b(multi ?omics? integration|integrat\w* multi ?omics?)\b/,
  ],
  ["Survival prediction", /\b(survival prediction|predict\w* survival)\b/],
  [
    "Treatment response prediction",
    /\b(treatment response prediction|predict\w* treatment response)\b/,
  ],
  ["Landmark localization", /\blandmark locali[sz]ation\b/],
];
const anatomyRules = [
  [
    "Heart",
    /\b(heart|cardiac|myocard\w*|(?:left|right) ventric\w*|atrial?)\b/,
    /\b(heart|cardiac|myocard\w*|ventric\w*|atri\w*|lv|rv)\b/,
  ],
  [
    "Lung",
    /\b(lungs?|pulmonary|nsclc)\b/,
    /\b(lungs?|pulmonary|nsclc|bronch\w*)\b/,
  ],
  ["Abdomen", /\b(abdom\w*)\b/, /\b(abdom\w*)\b/],
  ["Pancreas", /\b(pancrea\w*)\b/, /\b(pancrea\w*)\b/],
  ["Kidney", /\b(kidneys?|renal)\b/, /\b(kidneys?|renal)\b/],
  ["Liver", /\b(liver|hepatic)\b/, /\b(liver|hepatic)\b/],
  ["Brain", /\b(brain|cerebral)\b/, /\b(brain|cerebr\w*)\b/],
  ["Prostate", /\b(prostat\w*)\b/, /\b(prostat\w*)\b/],
  [
    "Eye",
    /\b(eyes?|retina\w*|optic nerve)\b/,
    /\b(eyes?|retina\w*|optic\w*|ophthalm\w*)\b/,
  ],
  ["Breast", /\b(breasts?|mammary)\b/, /\b(breasts?|mammary)\b/],
  ["Spleen", /\b(spleen|splenic)\b/, /\b(spleen|splenic)\b/],
];
const units = {
  patient: "patients",
  participant: "participants",
  subject: "subjects",
  person: "people",
  people: "people",
  case: "cases",
  scan: "scans",
  volume: "volumes",
  image: "images",
  session: "sessions",
  slide: "slides",
  tile: "tiles",
  study: "studies",
  slice: "slices",
};
const ignored = new Set(
  "a all an and annotated annotation annotations are as at across available by can candidate candidates case cases cohort cohorts collection collections data dataset datasets different do does each find for from get give has have i image images imaging in include includes including into is labelled labeled list looking me medical model models modalities modality more multiple need needed of on only or paired pairs patient patients please public publicly require research return scans scan series sets show some studies study subjects that the their these to train training various want where which with would".split(
    " ",
  ),
);
const cancerTerms = /\b(cancers?|tumors?|carcinomas?|nsclc|malignan\w*)\b/;
const pediatrics =
  /\b(pediatric\w*|paediatric\w*|children|childhood|infants?|neonat\w*)\b/;
const directAccess =
  /\b(no registration|without registration|direct download|open download|no application|no login)\b/;
const multimodalTerms = /\bmulti ?modal(?:ity|ities)?\b/;
const multitaskTerms = /\b(?:multi ?tasks?|multiple tasks)\b/;
const multiomicsTerms = /\bmulti ?omics?\b/;
const sequenceTerms = /\b(?:multi ?(?:sequence|contrast|parametric)|mpmri)\b/;
const pairingTerms =
  /\b(?:paired|(?:patient |subject |specimen )?matched|co registered|co assayed)\b/;

export function iconFor(name) {
  const normalized = normalize(name);
  const match = modalityRules.find(([, regex]) => regex.test(normalized))?.[0];
  return (
    {
      CT: "ct",
      MRI: "mri",
      Ultrasound: "ultrasound",
      Pathology: "pathology",
      "X-ray": "xray",
      Microscopy: "microscopy",
      Fundus: "fundus",
      OCT: "oct",
      Endoscopy: "endoscopy",
      Dermoscopy: "dermoscopy",
      PET: "pet",
      Mammography: "xray",
    }[match] || "generic"
  );
}

function vocabularyRules(base, names) {
  const known = new Set(base.map(([name]) => name));
  return [
    ...base,
    ...names
      .filter((name) => !known.has(name) && normalize(name))
      .map((name) => [name, new RegExp("\\b" + normalize(name) + "\\b")]),
  ];
}

function matchedConcepts(text, rules) {
  const hits = rules.flatMap(([name, pattern]) =>
    [...text.matchAll(new RegExp(pattern.source, "g"))].map((match) => ({
      name,
      start: match.index,
      end: match.index + match[0].length,
    })),
  );
  // A specific phrase such as "cone-beam CT" denotes one modality. A separate
  // mention of CT elsewhere in the question still counts.
  return hits.filter(
    (hit) =>
      !hits.some(
        (other) =>
          other.start <= hit.start &&
          other.end >= hit.end &&
          other.end - other.start > hit.end - hit.start,
      ),
  );
}

function requiresAll(text, hits) {
  if (new Set(hits.map((hit) => hit.name)).size < 2) return false;
  const ordered = [...hits].sort((a, b) => a.start - b.start);
  return !ordered.some(
    (hit, i) =>
      i > 0 && /\bor\b/.test(text.slice(ordered[i - 1].end, hit.start)),
  );
}

function parseClause(raw, modeVocabulary, taskVocabulary) {
  const q = normalize(raw);
  const conceptText = q.replace(new RegExp(directAccess.source, "g"), (hit) =>
    " ".repeat(hit.length),
  );
  const modeHits = matchedConcepts(conceptText, modeVocabulary),
    taskHits = matchedConcepts(conceptText, taskVocabulary);
  const modalities = unique(modeHits.map((hit) => hit.name)),
    tasks = unique(taskHits.map((hit) => hit.name));
  const anatomy = anatomyRules
    .filter(([, test]) => test.test(q))
    .map(([name]) => name);
  const cancer = cancerTerms.test(q);
  const size = raw
    .toLowerCase()
    .match(
      /(at least|minimum(?: of)?|more than|over|at most|up to|less than|under|>=|<=|>|<)?\s*(\d[\d,]*)\s*(?:unique\s+)?(patients?|participants?|subjects?|people|persons?|cases?|scans?|volumes?|images?|sessions?|slides?|tiles?|studies|slices?)\b/,
    );
  const sizeRule = size
    ? {
        op: /^(less than|under|<)$/.test(size[1])
          ? "<"
          : /^(at most|up to|<=)$/.test(size[1])
            ? "≤"
            : /^(more than|over|>)$/.test(size[1])
              ? ">"
              : "≥",
        value: Number(size[2].replaceAll(",", "")),
        unit: units[size[3].replace(/s$/, "")] || size[3],
        annotated: /\b(masks?|contours?|labeled|labelled|annotated)\b/.test(q),
      }
    : null;
  const open = directAccess.test(q);
  const pediatric = pediatrics.test(q);
  const multimodal = multimodalTerms.test(q);
  const multitask = multitaskTerms.test(q);
  const multiomics = multiomicsTerms.test(q);
  const multisequence = sequenceTerms.test(q);
  const paired = pairingTerms.test(q) && modalities.length > 1;
  const allModes = requiresAll(q, modeHits);
  const allTasks = requiresAll(q, taskHits);
  const licenseText = q.match(
    /\bcc\s?(?:by(?: (?:nc|sa|nd)){0,2}|0)(?: [1-4] 0)?\b/,
  );
  const license = licenseText?.[0] || "";
  const diverse =
    /\b(various|different|multiple|across|several)\b/.test(q) &&
    /\b(modalit\w*|images?|imaging|scans?)\b/.test(q);
  const terms = unique(
    q.split(" ").filter((word) => word && !ignored.has(word)),
  );
  const letters = conceptText.split("");
  for (const hit of [...modeHits, ...taskHits])
    letters.fill(" ", hit.start, hit.end);
  let remainder = letters.join("");
  if (size) remainder = remainder.replace(normalize(size[0]), " ");
  if (license) remainder = remainder.replace(license, " ");
  for (const [, regex] of anatomyRules)
    remainder = remainder.replace(new RegExp(regex.source, "g"), " ");
  for (const regex of [
    cancerTerms,
    pediatrics,
    directAccess,
    multimodalTerms,
    multitaskTerms,
    multiomicsTerms,
    sequenceTerms,
    pairingTerms,
    /\b(?:both|plus)\b/,
  ])
    remainder = remainder.replace(new RegExp(regex.source, "g"), " ");
  const keywords = unique(
    remainder.split(/\s+/).filter((w) => w && !ignored.has(w)),
  );
  const labels = [
    ...modalities,
    ...tasks,
    ...anatomy,
    ...(multimodal ? ["Multimodal"] : []),
    ...(multitask ? ["Multiple tasks"] : []),
    ...(multisequence ? ["Multiple sequences"] : []),
    ...(multiomics && !tasks.includes("Multi-omics integration")
      ? ["Multi-omics"]
      : []),
    ...(paired ? ["Documented pairing"] : []),
    ...(cancer
      ? [
          tasks.includes("Segmentation") || tasks.includes("Detection")
            ? "Tumor target"
            : "Cancer cohort",
        ]
      : []),
    ...(pediatric ? ["Pediatric cohort"] : []),
    ...(license ? [license.toUpperCase()] : []),
    ...(open ? ["Direct download"] : []),
    ...(sizeRule
      ? [
          sizeRule.op +
            " " +
            sizeRule.value.toLocaleString() +
            " " +
            sizeRule.unit,
        ]
      : []),
    ...keywords,
  ];
  return {
    q,
    terms,
    keywords,
    modalities,
    tasks,
    anatomy,
    cancer,
    sizeRule,
    open,
    pediatric,
    multimodal,
    multitask,
    multiomics,
    multisequence,
    paired,
    allModes,
    allTasks,
    license,
    diverse,
    labels,
    training: /\b(train|training)\b/.test(q),
  };
}

export function parseQuery(raw, records = []) {
  const modeVocabulary = vocabularyRules(
    modalityRules,
    unique(records.flatMap((r) => valuesOf(r, "modalities"))),
  );
  const taskVocabulary = vocabularyRules(
    taskRules,
    unique(records.flatMap((r) => valuesOf(r, "tasks"))),
  );
  const parts = raw.split(/\b(?:preferably|ideally|with a preference for)\b/i);
  const required = parseClause(parts[0], modeVocabulary, taskVocabulary);
  if (parts.length === 1) return required;
  const preference = parseClause(
    parts.slice(1).join(" "),
    modeVocabulary,
    taskVocabulary,
  );
  return required.labels.length ? { ...required, preference } : preference;
}

export function meetsSize(count, rule) {
  const unit = normalize(count.unit).replace(
    /^(?:ct|mri?|pet|ultrasound) /,
    "",
  );
  const eligibleKind = rule.annotated
    ? count.kind === "annotated" ||
      (["total", "train"].includes(count.kind) &&
        /\b(mask|label|annotat|contour)/i.test(count.scope) &&
        !/\bunlabel/i.test(count.scope))
    : count.kind === "total";
  if (
    !eligibleKind ||
    unit !== normalize(rule.unit).replace(/^(?:ct|mri?|pet|ultrasound) /, "")
  )
    return false;
  return {
    ">": count.value > rule.value,
    "≥": count.value >= rule.value,
    "<": count.value < rule.value,
    "≤": count.value <= rule.value,
  }[rule.op];
}

function matchSubset(record, subset, query) {
  const access = componentTerms(record, subset, "access");
  const licenses = componentTerms(record, subset, "licenses");
  if (
    query.training &&
    (subset.availability === "unavailable" ||
      (access.length && access.every((a) => a.mode === "unavailable")))
  )
    return null;
  const modes = subset.modalities.map(normalize);
  if (query.multisequence && (subset.sequences?.length || 0) < 2) return null;
  if (
    query.paired &&
    (!subset.paired ||
      !query.modalities.every((name) => modes.includes(normalize(name))))
  )
    return null;
  if (
    query.modalities.length &&
    !query.modalities.some((name) => modes.includes(normalize(name)))
  )
    return null;
  if (
    query.tasks.length &&
    !query.tasks.some((task) => subset.tasks.includes(task))
  )
    return null;
  const segmenting =
    query.tasks.includes("Segmentation") &&
    subset.tasks.includes("Segmentation");
  const anatomyText = normalize(
    [...subset.anatomy, ...subset.targets, ...subset.conditions].join(" "),
  );
  const targetText = normalize(subset.targets.join(" "));
  for (const [name, , test] of anatomyRules) {
    if (!query.anatomy.includes(name)) continue;
    if (!test.test(anatomyText)) return null;
    if (
      name === "Heart" &&
      !/\b(heart|cardiac|chest|thoracic|myocard\w*|atrium|atrial|atria|lv|rv)\b/.test(
        anatomyText,
      )
    ) {
      // Ventricles also occur in the brain. Require a cardiac or thoracic context.
      return null;
    }
    if (name === "Heart" && segmenting && !test.test(targetText)) return null;
    if (
      ["Pancreas", "Kidney", "Liver", "Spleen"].includes(name) &&
      segmenting &&
      !test.test(targetText)
    )
      return null;
  }
  if (
    query.cancer &&
    !/\b(cancer\w*|tumor\w*|carcinoma\w*|malignan\w*|neoplasm\w*|glioma\w*|gtv)\b/.test(
      segmenting ||
        (query.tasks.includes("Detection") &&
          subset.tasks.includes("Detection"))
        ? targetText
        : anatomyText,
    )
  )
    return null;
  if (
    query.open &&
    !access.some((a) => a.mode === "open" && record.review.status === "curated")
  )
    return null;
  if (
    query.license &&
    !(
      record.review.status === "curated" &&
      licenses.length &&
      licenses.every((l) => {
        const name = normalize(l.name || "").replace(/^cc0/, "cc 0");
        const requested = query.license.replace(/^cc0/, "cc 0");
        return (
          name === requested || name.replace(/ [1-4] 0$/, "") === requested
        );
      })
    )
  )
    return null;
  if (
    query.sizeRule &&
    !subset.counts.some((c) => meetsSize(c, query.sizeRule))
  )
    return null;

  const text = normalize(
    [
      record.name,
      ...record.aliases,
      ...subset.modalities,
      ...subset.tasks,
      ...subset.targets,
      ...subset.anatomy,
      ...subset.conditions,
      ...subset.annotations,
      ...(subset.sequences || []),
      subset.name,
      record.subsets.length === 1 ? record.summary : "",
    ].join(" "),
  );
  const words = new Set(text.split(" "));
  if (
    query.pediatric &&
    !pediatrics.test(
      normalize(
        record.summary +
          " " +
          [...subset.conditions, ...subset.annotations].join(" "),
      ),
    )
  )
    return null;
  if (
    query.keywords.some(
      (word) => !words.has(word) && !(word.length > 3 && text.includes(word)),
    )
  )
    return null;
  const matchedTerms = query.terms.filter(
    (word) => words.has(word) || (word.length > 4 && text.includes(word)),
  );
  if (!query.labels.length && !matchedTerms.length) return null;
  return { subset, matchedTerms, text };
}

function matchingComponents(record, subsets, query) {
  const features = collectionFeatures(record);
  if (query.multimodal && !features.includes("Multimodal")) return [];
  if (query.multitask && !features.includes("Multiple tasks")) return [];
  if (query.multiomics) {
    const modes = valuesOf(record, "modalities").map(normalize).join(" ");
    const layers = [
      /genom|genotyp/,
      /rna|transcriptom|expression microarray/,
      /proteom/,
      /methylation|epigenom/,
      /metabolom/,
    ];
    if (layers.filter((layer) => layer.test(modes)).length < 2) return [];
  }
  const matches = subsets
    .map((s) => matchSubset(record, s, query))
    .filter(Boolean);
  if (
    query.allModes &&
    query.modalities.some(
      (mode) => !matches.some((m) => m.subset.modalities.includes(mode)),
    )
  )
    return [];
  if (
    query.allTasks &&
    query.tasks.some(
      (task) => !matches.some((m) => m.subset.tasks.includes(task)),
    )
  )
    return [];
  return matches;
}

export function findDatasets(records, raw) {
  const query = parseQuery(raw, records);
  if (!query.q || (!query.labels.length && !query.terms.length))
    return { query, results: [] };
  const results = [];
  for (const record of records) {
    const matches = matchingComponents(record, record.subsets, query);
    if (!matches.length) continue;
    const named = [record.name, record.id, ...record.aliases]
      .map(normalize)
      .some((s) => s && (query.q === s || query.q.includes(s)));
    const preferred =
      query.preference &&
      matchingComponents(
        record,
        matches.map((m) => m.subset),
        query.preference,
      ).length > 0;
    const dedicated = query.anatomy.some((area) =>
      matches.some((m) => m.subset.anatomy.includes(area)),
    );
    const score =
      (named ? 100 : 0) +
      (record.review.status === "curated" ? 15 : 0) +
      (preferred ? 8 : 0) +
      (dedicated ? 3 : 0) +
      Math.max(...matches.map((m) => m.matchedTerms.length)) +
      (query.diverse
        ? unique(matches.flatMap((m) => m.subset.modalities)).length
        : 0);
    results.push({
      record,
      subsets: matches.map((m) => m.subset),
      score,
      matchedTerms: unique(matches.flatMap((m) => m.matchedTerms)),
    });
  }
  results.sort(
    (a, b) => b.score - a.score || a.record.name.localeCompare(b.record.name),
  );
  return { query, results };
}
