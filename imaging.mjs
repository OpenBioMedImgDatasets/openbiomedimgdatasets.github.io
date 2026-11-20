import modalities from "./imaging-modalities.json" with { type: "json" };

const names = new Map(modalities.map((name) => [name.toLowerCase(), name]));

export function imagingName(value) {
  return names.get(value.trim().toLowerCase());
}

// Browse uses image-bearing components. Dataset details and free-text search
// receive the complete source record, including its companion assays and signals.
export function imageComponents(record) {
  return record.subsets.flatMap((subset) => {
    const imaging = [
      ...new Set(subset.modalities.map(imagingName).filter(Boolean)),
    ];
    return imaging.length ? [{ ...subset, modalities: imaging }] : [];
  });
}
