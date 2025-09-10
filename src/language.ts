import languageDataRaw from "./data/languages.json";
import { ngramsData } from "./ngrams.js";
import { IDetectionSettings } from "./interfaces/IDetectionSettings.js";
import { ILanguageData } from "./interfaces/ILanguageData.js";
import { scripts } from "./regex.js";
import { Tokenizer } from "@the-horizon-dev/fast-tokenizer";

const scriptKeys = Object.keys(scripts);

// A constant for missing trigram penalty.
const MISSING_TRIGRAM_PENALTY = 300;

// Returns the default "undetermined" value.
const und = (): [string, number][] => [["und", 1]];

/**
 * Class that implements language detection based on n‑grams.
 */
export class LanguageGuesser {
  private languagesAlpha3: Record<string, ILanguageData> = {};
  private languagesAlpha2: Record<string, ILanguageData> = {};

  // Precomputed trigram lookup maps:
  // modelIndexes[script][lang][trigram] = index
  private static modelIndexes: Record<
    string,
    Record<string, Record<string, number>>
  > = {};

  constructor() {
    this.buildData();
    LanguageGuesser.buildModelIndexes();
  }

  /**
   * Precomputes the lookup indexes for each language model.
   */
  private static buildModelIndexes(): void {
    if (Object.keys(LanguageGuesser.modelIndexes).length > 0) return;
    for (const script in ngramsData) {
      LanguageGuesser.modelIndexes[script] = {};
      for (const lang in ngramsData[script]) {
        const model = ngramsData[script][lang];
        LanguageGuesser.modelIndexes[script][lang] = model.reduce(
          (acc, trigram, i) => {
            acc[trigram] = i;
            return acc;
          },
          {} as Record<string, number>,
        );
      }
    }
  }

  /**
   * Transforms a list of language codes (alpha‑2 or alpha‑3) to alpha‑3 codes.
   * @param list List of language codes.
   * @returns List of alpha‑3 codes.
   */
  private transformCodeList(list: string[]): string[] {
    return list
      .map((code) =>
        code.length === 3 ? code : this.languagesAlpha2[code]?.alpha3 || "",
      )
      .filter(Boolean);
  }

  /**
   * Extracts trigrams from the input text.
   * @param inputText Text to process.
   * @returns An array of trigram strings.
   */
  static getTrigrams(inputText: string): string[] {
    if (!inputText) return [];
    // Use the tokenizer's getNGrams method requesting trigrams as joined strings.
    const ngrams = Tokenizer.getNGrams(inputText, 3, true);
    return ngrams as string[];
  }

  /**
   * Converts input text into sorted frequency tuples (trigram, frequency).
   * @param inputText Text to analyze.
   * @returns Sorted tuples in ascending order by frequency.
   */
  static asTuples(inputText: string): [string, number][] {
    const trigrams = LanguageGuesser.getTrigrams(inputText);
    const frequencyMap = trigrams.reduce(
      (acc, trigram) => {
        acc[trigram] = (acc[trigram] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const tuples = Object.entries(frequencyMap);
    tuples.sort((a, b) => a[1] - b[1]);
    return tuples;
  }

  /**
   * Calculates the distance between extracted trigrams and a language model.
   * Uses a precomputed lookup (if provided) for performance.
   * @param trigrams List of (trigram, frequency) tuples.
   * @param model N-gram model.
   * @param modelIndex (Optional) Precomputed lookup mapping for the model.
   * @returns Numerical distance value.
   */
  static getDistance(
    trigrams: [string, number][],
    model: string[],
    modelIndex?: Record<string, number>,
  ): number {
    if (!modelIndex) {
      modelIndex = model.reduce(
        (acc, trigram, i) => {
          acc[trigram] = i;
          return acc;
        },
        {} as Record<string, number>,
      );
    }
    return trigrams.reduce((distance, [trigram, freq]) => {
      const rank = modelIndex[trigram];
      if (rank === undefined) {
        return distance + MISSING_TRIGRAM_PENALTY;
      } else {
        return distance + Math.abs(freq - rank) / 2;
      }
    }, 0);
  }

  /**
   * Computes the relative occurrence of a pattern in the input text.
   * @param inputText Text to search.
   * @param expression Regular expression pattern.
   * @returns Proportion of matches.
   */
  static getOccurrence(inputText: string, expression: RegExp): number {
    const matches = inputText.match(expression);
    return inputText.length ? (matches?.length ?? 0) / inputText.length : 0;
  }

  /**
   * Checks if most characters in the text are Latin.
   * @param inputText Text to analyze.
   * @returns True if the majority of characters are Latin.
   */
  static isLatin(inputText: string): boolean {
    if (!inputText) return false;
    const latinMatches = inputText.match(scripts.Latin) || [];
    const letterMatches = inputText.match(/\p{Letter}/gu) || [];
    if (letterMatches.length === 0) return false;
    return latinMatches.length > letterMatches.length / 2;
  }

  /**
   * Determines the most prominent script in the text.
   * @param inputText Text to analyze.
   * @returns A tuple of [script identifier, occurrence count].
   */
  static getTopScript(inputText: string): [string, number] {
    if (inputText.length < 3) return ["und", 1];
    if (LanguageGuesser.isLatin(inputText)) return ["Latin", 1];
    let topScript = "";
    let topCount = -1;
    for (const key of scriptKeys) {
      const count = LanguageGuesser.getOccurrence(inputText, scripts[key]);
      if (count > topCount) {
        topCount = count;
        topScript = key;
        if (topCount === 1) return [topScript, topCount];
      }
    }
    return [topScript, topCount];
  }

  /**
   * Filters language models based on allowed and denied language lists.
   * @param languages Language models to filter.
   * @param allowList Allowed language codes.
   * @param denyList Denied language codes.
   * @returns Filtered language models.
   */
  static filterLanguages(
    languages: Record<string, string[]>,
    allowList: string[],
    denyList: string[],
  ): Record<string, string[]> {
    if (allowList.length === 0 && denyList.length === 0) return languages;
    const filtered: Record<string, string[]> = {};
    Object.keys(languages).forEach((lang) => {
      if (
        (allowList.length === 0 || allowList.includes(lang)) &&
        !denyList.includes(lang)
      ) {
        filtered[lang] = languages[lang];
      }
    });
    return filtered;
  }

  /**
   * Computes and sorts distances between extracted trigrams and language models.
   * @param trigrams List of (trigram, frequency) tuples.
   * @param srcLanguages N-gram models for a specific script.
   * @param options Optional detection settings.
   * @param modelIndexesForScript (Optional) Precomputed indexes for the script.
   * @returns Sorted list of [language, distance] tuples.
   */
  static getDistances(
    trigrams: [string, number][],
    srcLanguages: Record<string, string[]>,
    options: IDetectionSettings = {},
    modelIndexesForScript?: Record<string, Record<string, number>>,
  ): [string, number][] {
    const { allowList = [], denyList = [] } = options;
    const filteredLanguages = LanguageGuesser.filterLanguages(
      srcLanguages,
      allowList,
      denyList,
    );
    const distances: [string, number][] = [];
    Object.keys(filteredLanguages).forEach((lang) => {
      const model = filteredLanguages[lang];
      const modelIndex = modelIndexesForScript
        ? modelIndexesForScript[lang]
        : undefined;
      const distance = LanguageGuesser.getDistance(trigrams, model, modelIndex);
      distances.push([lang, distance]);
    });
    distances.sort((a, b) => a[1] - b[1]);
    return distances;
  }

  /**
   * Detects possible languages for the given text based on n‑grams.
   * @param inputText Text to analyze.
   * @param settings Optional detection settings.
   * @returns Sorted list of [language, score] tuples.
   */
  static detectAll(
    inputText: string,
    settings: IDetectionSettings = {},
  ): [string, number][] {
    const minLength = settings.minLength ?? 10;
    if (!inputText || inputText.length < minLength) return und();
    // Limit analysis to the first 2048 characters for performance.
    const text = inputText.substring(0, 2048);
    // Ensure model indexes are initialized for static usage.
    LanguageGuesser.buildModelIndexes();
    const [scriptId, scriptOccurrence] = LanguageGuesser.getTopScript(text);
    if (!(scriptId in ngramsData) && scriptOccurrence > 0.5) {
      if (settings.allowList) {
        if (settings.allowList.includes(scriptId)) {
          return [[scriptId, 1]];
        }
        if (scriptId === "cmn" && settings.allowList.includes("jpn")) {
          return [["jpn", 1]];
        }
        return und();
      }
      return [[scriptId, 1]];
    }
    if (ngramsData[scriptId]) {
      const tuples = LanguageGuesser.asTuples(text);
      const distances = LanguageGuesser.getDistances(
        tuples,
        ngramsData[scriptId],
        settings,
        LanguageGuesser.modelIndexes[scriptId],
      );
      if (distances.length > 0 && distances[0][0] === "und")
        return [[scriptId, 1]];
      const minDistance = distances[0][1];
      const maxDistance = text.length * MISSING_TRIGRAM_PENALTY - minDistance;
      const denom = Math.max(1, maxDistance);
      const scored = distances.map(([lang, d]) => [
        lang,
        1 - ((d - minDistance) / denom || 0),
      ]) as [string, number][];
      if (scored.length === 0 || scored[0][1] < 0.5) {
        return und();
      }
      return scored;
    }
    return und();
  }

  /**
   * Builds language data from the JSON file.
   */
  private buildData(): void {
    (languageDataRaw as [string, string, string][]).forEach(
      ([alpha2, alpha3, name]) => {
        const langData: ILanguageData = { alpha2, alpha3, name };
        this.languagesAlpha3[alpha3] = langData;
        this.languagesAlpha2[alpha2] = langData;
      },
    );
  }

  /**
   * Guesses the languages for the provided text.
   * @param utterance Text to analyze.
   * @param allowList (Optional) List of allowed language codes (alpha‑2 or alpha‑3).
   * @param limit Maximum number of results to return.
   * @param denyList (Optional) List of languages to ignore.
   * @returns Array of objects containing alpha‑2, alpha‑3, language name, and score.
   */
  public guess(
    utterance: string,
    allowList: string[] = [],
    limit = 3,
    denyList: string[] = [],
  ): Array<{
    alpha3: string;
    alpha2: string;
    language: string;
    score: number;
  }> {
    const options: IDetectionSettings = {
      allowList:
        allowList.length > 0 ? this.transformCodeList(allowList) : undefined,
      denyList:
        denyList.length > 0 ? this.transformCodeList(denyList) : undefined,
    };
    const scores = LanguageGuesser.detectAll(utterance, options);
    const results = scores
      .map(([alpha3, score]) => {
        const lang = this.languagesAlpha3[alpha3];
        return lang
          ? {
              alpha3: lang.alpha3,
              alpha2: lang.alpha2,
              language: lang.name,
              score,
            }
          : null;
      })
      .filter(
        (
          item,
        ): item is {
          alpha3: string;
          alpha2: string;
          language: string;
          score: number;
        } => Boolean(item),
      );
    if (results.length === 0) {
      return [
        { alpha3: "und", alpha2: "", language: "Undetermined", score: 0 },
      ];
    }
    return results.slice(0, limit);
  }

  /**
   * Returns the best language guess for the provided text.
   * @param utterance Text to analyze.
   * @param allowList (Optional) List of allowed language codes.
   * @returns Object with the best guess.
   */
  public guessBest(
    utterance: string,
    allowList: string[] = [],
  ): { alpha3: string; alpha2: string; language: string; score: number } {
    const result = this.guess(utterance, allowList, 1)[0];
    return (
      result || {
        alpha3: "und",
        alpha2: "",
        language: "Undetermined",
        score: 0,
      }
    );
  }

  /**
   * Detects and aggregates language guesses for mixed-language texts.
   * Splits text using sentence boundaries or (if needed) sliding window segmentation.
   * @param utterance Text to analyze.
   * @param allowList (Optional) List of allowed language codes.
   * @param limit Maximum number of results to return.
   * @param segmentationOptions Optional segmentation parameters (windowSize, stepSize).
   * @returns Array of objects containing alpha‑2, alpha‑3, language name, and aggregated score.
   */
  public guessMixed(
    utterance: string,
    allowList: string[] = [],
    limit = 3,
    segmentationOptions?: { windowSize?: number; stepSize?: number },
  ): Array<{
    alpha3: string;
    alpha2: string;
    language: string;
    score: number;
  }> {
    // First, attempt to split the text on sentence boundaries.
    let segments = utterance
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 10);
    // Fallback if no segments or a single long segment is produced.
    if (segments.length === 0) {
      segments = [utterance];
    } else if (segments.length === 1 && segments[0].length > 40) {
      const longSegment = segments[0];
      const windowSize = segmentationOptions?.windowSize ?? 40;
      const stepSize = segmentationOptions?.stepSize ?? 20;
      segments = [];
      for (let i = 0; i < longSegment.length; i += stepSize) {
        segments.push(longSegment.substring(i, i + windowSize));
      }
    }
    // Aggregate candidate scores across segments using a weighted average.
    const aggregated: Record<
      string,
      {
        totalScore: number;
        totalWeight: number;
        alpha2: string;
        alpha3: string;
        language: string;
      }
    > = {};
    segments.forEach((segment) => {
      const candidates = this.guess(segment, allowList, 3);
      const weight = segment.length;
      candidates.forEach(({ alpha3, alpha2, language, score }) => {
        if (!aggregated[alpha3]) {
          aggregated[alpha3] = {
            totalScore: 0,
            totalWeight: 0,
            alpha2,
            alpha3,
            language,
          };
        }
        aggregated[alpha3].totalScore += score * weight;
        aggregated[alpha3].totalWeight += weight;
      });
    });
    // Compute weighted average scores.
    const results = Object.values(aggregated).map((entry) => ({
      alpha2: entry.alpha2,
      alpha3: entry.alpha3,
      language: entry.language,
      score: entry.totalWeight ? entry.totalScore / entry.totalWeight : 0,
    }));
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}
