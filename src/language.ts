import languageDataRaw from "./data/languages.json";
import { ngramsData, NgramsDataType } from "./ngrams";
import { IDetectionSettings } from "./interfaces/IDetectionSettings";
import { ILanguageData } from "./interfaces/ILanguageData";
import { scripts } from "./regex";
import { Diacritics } from "@the-horizon-dev/fast-diacritics";

const scriptKeys = Object.keys(scripts);

/**
 * Returns the default "undetermined" value.
 */
const und = (): [string, number][] => [["und", 1]];

/**
 * Class that implements language detection based on n‑grams.
 */
export class LanguageGuesser {
  private languagesAlpha3: Record<string, ILanguageData> = {};
  private languagesAlpha2: Record<string, ILanguageData> = {};

  constructor() {
    this.buildData();
  }

  /**
   * Extracts trigrams from the given string.
   * @param srcValue Input text.
   * @returns Array of trigrams.
   */
  static getTrigrams(srcValue: string): string[] {
    if (!srcValue) return [];
    // Remove diacritical marks using the Diacritics class
    const normalized = ` ${Diacritics.remove(srcValue)
      .replace(/[\u0021-\u0040]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()} `;
    if (normalized.length < 3) return [];
    const trigrams: string[] = [];
    for (let i = 0, len = normalized.length - 2; i < len; i++) {
      trigrams.push(normalized.substring(i, i + 3));
    }
    return trigrams;
  }

  /**
   * Converts a string into an ordered list of tuples (trigram, frequency).
   * @param value Text to analyze.
   * @returns List of tuples sorted in ascending order of frequency.
   */
  static asTuples(value: string): [string, number][] {
    const trigrams = LanguageGuesser.getTrigrams(value);
    const frequencyMap = trigrams.reduce((acc, trigram) => {
      acc[trigram] = (acc[trigram] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const tuples = Object.entries(frequencyMap);
    tuples.sort((a, b) => a[1] - b[1]);
    return tuples;
  }

  /**
   * Calculates the "distance" between extracted trigrams and a model.
   * Lower distance indicates a closer match.
   * @param trigrams List of trigrams with frequencies.
   * @param model N-gram model.
   * @returns A numerical distance.
   */
  static getDistance(
    trigrams: [string, number][],
    model: Record<string, number>
  ): number {
    return trigrams.reduce((distance, [trigram, freq]) => {
      return (
        distance +
        (trigram in model ? Math.abs(freq - model[trigram] - 1) : 300)
      );
    }, 0);
  }

  /**
   * Calculates the relative occurrence of a pattern in a string.
   * @param value Input text.
   * @param expression Regular expression.
   * @returns Proportion of occurrence.
   */
  static getOccurrence(value: string, expression: RegExp): number {
    const matches = value.match(expression);
    return value.length ? (matches?.length ?? 0) / value.length : 0;
  }

  /**
   * Checks if the majority of characters in the string are Latin.
   * @param value Input text.
   * @returns True if most characters are Latin.
   */
  static isLatin(value: string): boolean {
    const half = value.length / 2;
    const total = [...value].filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126;
    }).length;
    return total > half;
  }

  /**
   * Determines the script (character group) with the highest occurrence in the text.
   * @param value Input text.
   * @returns A tuple containing the identified script and its occurrence.
   */
  static getTopScript(value: string): [string, number] {
    if (value.length < 3) return ["und", 1];
    if (LanguageGuesser.isLatin(value)) return ["Latin", 1];
    let topScript = "";
    let topCount = -1;
    for (const key of scriptKeys) {
      const count = LanguageGuesser.getOccurrence(value, scripts[key]);
      if (count > topCount) {
        topCount = count;
        topScript = key;
        if (topCount === 1) return [topScript, topCount];
      }
    }
    return [topScript, topCount];
  }

  /**
   * Filters language models based on allow and deny lists.
   * @param languages The language models to filter.
   * @param allowList Allowed languages.
   * @param denyList Languages to ignore.
   * @returns Filtered language models.
   */
  static filterLanguages(
    languages: Record<string, Record<string, number>>,
    allowList: string[],
    denyList: string[]
  ): Record<string, Record<string, number>> {
    if (allowList.length === 0 && denyList.length === 0) return languages;
    const filtered: Record<string, Record<string, number>> = {};
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
   * Calculates distances between extracted trigrams and the n‑gram models of languages.
   * @param trigrams List of trigrams with frequencies.
   * @param srcLanguages N-gram models for a specific script.
   * @param options Optional detection settings.
   * @returns Sorted list of tuples [language, distance].
   */
  static getDistances(
    trigrams: [string, number][],
    srcLanguages: NgramsDataType[string],
    options: IDetectionSettings = {}
  ): [string, number][] {
    const { allowList = [], denyList = [] } = options;
    const filteredLanguages = LanguageGuesser.filterLanguages(
      srcLanguages,
      allowList,
      denyList
    );
    const distances: [string, number][] = [];
    Object.keys(filteredLanguages).forEach((lang) => {
      const model = filteredLanguages[lang];
      const distance = LanguageGuesser.getDistance(trigrams, model);
      distances.push([lang, distance]);
    });
    distances.sort((a, b) => a[1] - b[1]);
    return distances;
  }

  /**
   * Detects possible languages for the given text based on n‑grams.
   * @param srcValue Text to analyze.
   * @param settings Optional detection settings.
   * @returns Sorted list of tuples [language, score].
   */
  static detectAll(
    srcValue: string,
    settings: IDetectionSettings = {}
  ): [string, number][] {
    const minLength = settings.minLength ?? 10;
    if (!srcValue || srcValue.length < minLength) return und();

    // Limit analysis to the first 2048 characters for performance.
    const value = srcValue.substring(0, 2048);
    const [scriptId, scriptOccurrence] = LanguageGuesser.getTopScript(value);

    if (!(scriptId in ngramsData) && scriptOccurrence > 0.5) {
      if (settings.allowList?.includes(scriptId)) {
        return [[scriptId, 1]];
      }
      if (scriptId === "cmn" && settings.allowList?.includes("jpn")) {
        return [["jpn", 1]];
      }
      return [[scriptId, 1]];
    }

    if (ngramsData[scriptId]) {
      const tuples = LanguageGuesser.asTuples(value);
      const distances = LanguageGuesser.getDistances(
        tuples,
        ngramsData[scriptId],
        settings
      );
      if (distances.length > 0 && distances[0][0] === "und")
        return [[scriptId, 1]];

      const minDistance = distances[0][1];
      const maxDistance = value.length * 300 - minDistance;
      return distances.map(([lang, d]) => [
        lang,
        1 - ((d - minDistance) / maxDistance || 0),
      ]);
    }
    return [[scriptId, 1]];
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
      }
    );
  }

  /**
   * Converts a list of allowed languages (alpha‑2 or alpha‑3 codes) to alpha‑3 codes.
   * @param allowList List of language codes.
   * @returns List of alpha‑3 codes.
   */
  private transformAllowList(allowList: string[]): string[] {
    return allowList
      .map((item) =>
        item.length === 3 ? item : this.languagesAlpha2[item]?.alpha3 || ""
      )
      .filter(Boolean);
  }

  /**
   * Guesses the languages for the provided text.
   * @param utterance Text to analyze.
   * @param allowList (Optional) List of allowed language codes (alpha‑2 or alpha‑3).
   * @param limit Maximum number of results to return.
   * @returns Array of objects containing alpha‑2, alpha‑3, language name, and score.
   */
  public guess(
    utterance: string,
    allowList: string[] = [],
    limit = 3
  ): Array<{ alpha3: string; alpha2: string; language: string; score: number }> {
    const options: IDetectionSettings = {
      minLength: utterance.length < 10 ? utterance.length : undefined,
      allowList: allowList.length > 0 ? this.transformAllowList(allowList) : undefined,
    };
    const scores = LanguageGuesser.detectAll(utterance, options);
    const results = scores
      .map(([alpha3, score]) => {
        const lang = this.languagesAlpha3[alpha3];
        return lang
          ? { alpha3: lang.alpha3, alpha2: lang.alpha2, language: lang.name, score }
          : null;
      })
      .filter(
        (item): item is { alpha3: string; alpha2: string; language: string; score: number } =>
          Boolean(item)
      );

    if (results.length === 0) {
      return [{ alpha3: "und", alpha2: "", language: "Undetermined", score: 0 }];
    }
    return results.slice(0, limit);
  }

  /**
   * Returns the best language guess for the provided text.
   * @param utterance Text to analyze.
   * @param allowList (Optional) List of allowed languages.
   * @returns Object with the best guess.
   */
  public guessBest(
    utterance: string,
    allowList: string[] = []
  ): { alpha3: string; alpha2: string; language: string; score: number } {
    const result = this.guess(utterance, allowList, 1)[0];
    return result || { alpha3: "und", alpha2: "", language: "Undetermined", score: 0 };
  }

  /**
   * Detects and aggregates language guesses for mixed-language texts.
   * This method first attempts to split the input text using sentence boundaries.
   * If only one (long) segment is produced (i.e. no clear punctuation separation),
   * it falls back to sliding window segmentation.
   * Then it runs detection on each segment/window (using multiple candidates)
   * and aggregates the results using a weighted average by segment/window length.
   *
   * @param utterance Text to analyze.
   * @param allowList (Optional) List of allowed language codes.
   * @param limit Maximum number of results to return.
   * @returns Array of objects containing alpha‑2, alpha‑3, language name, and aggregated score.
   */
  public guessMixed(
    utterance: string,
    allowList: string[] = [],
    limit = 3
  ): Array<{ alpha3: string; alpha2: string; language: string; score: number }> {
    // First, try to split the text on sentence boundaries.
    let segments = utterance.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 10);

    // If no segments were found, fallback to the whole utterance.
    if (segments.length === 0) {
      segments = [utterance];
    }
    // If only one long segment is produced, use sliding window segmentation.
    else if (segments.length === 1 && segments[0].length > 40) {
      const longSegment = segments[0];
      const windowSize = 40;
      const stepSize = 20;
      segments = [];
      for (let i = 0; i < longSegment.length; i += stepSize) {
        segments.push(longSegment.substring(i, i + windowSize));
      }
    }

    // Aggregate candidate scores across segments using multiple candidates per segment.
    // We use the `guess` method so that for each segment we capture more than just the best guess.
    const aggregated: Record<
      string,
      { totalScore: number; totalWeight: number; alpha2: string; alpha3: string; language: string }
    > = {};

    segments.forEach(segment => {
      // Get multiple candidates for this segment (up to 3).
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
    const results = Object.values(aggregated).map(entry => ({
      alpha2: entry.alpha2,
      alpha3: entry.alpha3,
      language: entry.language,
      score: entry.totalWeight ? entry.totalScore / entry.totalWeight : 0,
    }));

    // Sort by descending score and return the top `limit` results.
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}
