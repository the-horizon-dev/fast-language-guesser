import ngramData from "./data/ngrams.json";

// A type that represents a single language’s n‑gram value,
// which may either be a pipe‑separated string or an array of tokens.
type NgramValue = string | string[];

/**
 * Parses a pipe‑separated n‑gram string into an array of tokens.
 * Each token is trimmed.
 * @param value A pipe‑separated string of n‑grams.
 * @returns An array of n‑gram tokens.
 */
export function parseNgramValue(value: NgramValue): string[] {
  if (typeof value === "string") {
    return value
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return value;
}

/**
 * Raw n‑gram data.
 * The compact string format (or an already prepared array) is used for each language.
 */
export const rawNgramsData: Record<
  string,
  Record<string, NgramValue>
> = ngramData;

/**
 * Processes raw n‑gram data and builds the n‑grams mapping.
 * (Each language’s n‑gram model is an array of tokens.)
 */
export const ngramsData: Record<string, Record<string, string[]>> = {};
for (const script in rawNgramsData) {
  ngramsData[script] = {};
  for (const lang in rawNgramsData[script]) {
    ngramsData[script][lang] = parseNgramValue(rawNgramsData[script][lang]);
  }
}

export type NgramsDataType = typeof ngramsData;
