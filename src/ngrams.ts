import ngramData from "./data/ngrams.json";

// A type that represents a single language’s n‑gram value,
// which may either be a string (pipe-separated) or a mapping.
type NgramValue = string | Record<string, number>;

/**
 * Parses a pipe-separated n‑gram string into a mapping.
 * Each token is trimmed and then assigned an index (starting at 0).
 * @param value A pipe‑separated string of n‑grams.
 * @returns A mapping from each n‑gram to its index.
 */
function parseNgramValue(value: NgramValue): Record<string, number> {
  if (typeof value === "string") {
    const parts = value
      .split("|")
      .map(part => part.trim())
      .filter(Boolean);
    const mapping: Record<string, number> = {};
    parts.forEach((ngram, index) => {
      mapping[ngram] = index;
    });
    return mapping;
  }
  return value;
}

/**
 * Raw n‑gram data.
 * Here you can use the compact string format for each language.
 */
export const rawNgramsData: Record<string, Record<string, NgramValue>> = ngramData;

/**
 * Process raw n‑gram data and build the n‑grams mapping.
 */
export const ngramsData: Record<string, Record<string, Record<string, number>>> = {};
for (const script in rawNgramsData) {
  ngramsData[script] = {};
  for (const lang in rawNgramsData[script]) {
    ngramsData[script][lang] = parseNgramValue(rawNgramsData[script][lang]);
  }
}

export type NgramsDataType = typeof ngramsData;
