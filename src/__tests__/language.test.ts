import { LanguageGuesser } from "../language";

describe("LanguageGuesser", () => {
  let guesser: LanguageGuesser;

  beforeEach(() => {
    guesser = new LanguageGuesser();
  });

  test("should return a best guess for English", () => {
    const result = guesser.guessBest("This is a sample sentence written in English.");
    expect(result.language.toLowerCase()).toContain("english");
  });

  test("should return a guess for Spanish", () => {
    const result = guesser.guessBest("Esta es una oración de ejemplo en español.", ["es", "eng"]);
    expect(result.language.toLowerCase()).toContain("spanish");
  });

  test("should return 'und' for text too short", () => {
    const result = guesser.guess("Hi", [], 1);
    // For very short texts, expect the language to be undetermined
    expect(result[0].alpha3).toBe("und");
  });

  test("should handle mixed language input", () => {
    const mixedText = "Este é um exemplo de frase em Português com um little bit of English embedded.";
    const results = guesser.guessMixed(mixedText, ["por", "eng"]);
    // Expect that both Portuguese and English are detected in the mix.
    const hasPortuguese = results.some((r) => r.language.toLowerCase().includes("portuguese"));
    const hasEnglish = results.some((r) => r.language.toLowerCase().includes("english"));
    expect(hasPortuguese).toBeTruthy();
    expect(hasEnglish).toBeTruthy();
  });
});

describe("LanguageGuesser static methods", () => {
  // Test for getTrigrams: Check if the function returns the expected trigrams
  test("getTrigrams should extract correct trigrams", () => {
    // Using a simple word. The process adds a space at the beginning and end.
    // Example: "Hello" becomes " hello " which is 7 characters long.
    // Expected trigrams: " he", "hel", "ell", "llo", "lo "
    const input = "Hello";
    const trigrams = LanguageGuesser.getTrigrams(input);
    expect(trigrams).toEqual([" he", "hel", "ell", "llo", "lo "]);
  });

  // Test for asTuples: Ensure frequency counting and sorting are working
  test("asTuples should return sorted frequency tuples", () => {
    // For a controlled input, we can compare the computed tuples.
    // Note that normalization adds spaces and lowercases the input.
    const input = "aaa";
    // Normalized: " aaa " -> characters: " ", "a", "a", "a", " "
    // Generated trigrams:
    // index 0: " aa"
    // index 1: "aaa"
    // index 2: "aa " 
    // Frequency: each trigram appears once.
    const tuples = LanguageGuesser.asTuples(input);
    // Since all frequencies are equal (1), the sorted order is based on their order in the object.
    expect(tuples).toHaveLength(3);
    expect(tuples).toEqual([
      [" aa", 1],
      ["aaa", 1],
      ["aa ", 1],
    ]);
  });

  // Test getDistance: Provide a dummy model and known trigrams
  test("getDistance should calculate correct distance", () => {
    // Dummy trigrams: each tuple is [trigram, frequency]
    const trigrams: [string, number][] = [
      ["abc", 2],
      ["def", 3],
    ];
    // Dummy model: only contains "abc" and "def"
    // Calculation:
    // For "abc": Math.abs(2 - (2) - 1) = Math.abs(-1) = 1
    // For "def": Math.abs(3 - (1) - 1) = Math.abs(1) = 1
    // Total distance = 2
    const dummyModel = {
      abc: 2,
      def: 1,
    };
    const distance = LanguageGuesser.getDistance(trigrams, dummyModel);
    expect(distance).toBe(2);
  });

  // Test getOccurrence: Validate occurrence calculation
  test("getOccurrence should compute proportion of matches", () => {
    const text = "aaabbb";
    // Regex that matches "a" characters
    const regex = /a/g;
    // There are 3 matches in a 6-character string: 3/6 = 0.5
    const occurrence = LanguageGuesser.getOccurrence(text, regex);
    expect(occurrence).toBeCloseTo(0.5);
  });

  // Test isLatin: Ensure it identifies predominantly Latin texts
  test("isLatin should return true for Latin text", () => {
    expect(LanguageGuesser.isLatin("Hello, world!")).toBe(true);
  });

  test("isLatin should return false for non-Latin text", () => {
    // Cyrillic text: "Привет" (Hello in Russian)
    expect(LanguageGuesser.isLatin("Привет")).toBe(false);
  });

  // Test getTopScript: Check for Latin and non-Latin texts
  test("getTopScript should return 'Latin' for Latin text", () => {
    const result = LanguageGuesser.getTopScript("This is a test.");
    expect(result[0]).toBe("Latin");
  });

  test("getTopScript should return a non-Latin script for non-Latin text", () => {
    // Chinese text; expecting the script to be identified as "cmn"
    const result = LanguageGuesser.getTopScript("你好世界"); // "Hello, World" in Chinese
    expect(result[0]).toBe("cmn");
  });

  // Test filterLanguages: Validate filtering based on allow and deny lists
  test("filterLanguages should filter languages correctly", () => {
    const dummyLanguages = {
      eng: { a: 1 },
      spa: { a: 2 },
      fre: { a: 3 },
    };

    // When allowList is provided, only those languages should be included.
    let filtered = LanguageGuesser.filterLanguages(dummyLanguages, ["eng", "spa"], []);
    expect(Object.keys(filtered).sort()).toEqual(["eng", "spa"]);

    // When denyList is provided, the languages in the deny list are removed.
    filtered = LanguageGuesser.filterLanguages(dummyLanguages, [], ["spa"]);
    expect(Object.keys(filtered).sort()).toEqual(["eng", "fre"]);

    // When both allowList and denyList are provided, allowList takes precedence but denied languages are removed.
    filtered = LanguageGuesser.filterLanguages(dummyLanguages, ["eng", "spa"], ["spa"]);
    expect(Object.keys(filtered)).toEqual(["eng"]);
  });

  // Test getDistances: Using dummy n-gram models and trigrams.
  test("getDistances should compute and sort distances", () => {
    // Dummy n-gram data for two languages.
    const dummyLanguages = {
      lang1: { abc: 2, def: 3 },
      lang2: { abc: 1, xyz: 4 },
    };

    // Create dummy trigrams.
    const trigrams: [string, number][] = [
      ["abc", 2],
      ["def", 3],
      ["xyz", 1],
    ];

    const distances = LanguageGuesser.getDistances(trigrams, dummyLanguages, {});
    // Expect distances to be sorted ascending by their computed distance.
    expect(distances.length).toBe(2);
    expect(distances[0][1]).toBeLessThanOrEqual(distances[1][1]);
  });

  // Test detectAll: For texts with insufficient length, expect "und"
  test("detectAll should return und for text shorter than minLength", () => {
    const result = LanguageGuesser.detectAll("short", { minLength: 10 });
    expect(result[0][0]).toBe("und");
  });
});
