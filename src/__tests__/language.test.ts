import { LanguageGuesser } from "../language";

describe("LanguageGuesser", () => {
  let guesser: LanguageGuesser;

  beforeEach(() => {
    guesser = new LanguageGuesser();
  });

  test("should return a best guess for English", () => {
    const result = guesser.guessBest(
      "This is a sample sentence written in English.",
    );
    expect(result.language.toLowerCase()).toContain("english");
  });

  test("should return a guess for Spanish", () => {
    const result = guesser.guessBest(
      "Esta es una oración de ejemplo en español.",
      ["es", "eng"],
    );
    expect(result.language.toLowerCase()).toContain("spanish");
  });

  test("should return 'und' for text too short", () => {
    const result = guesser.guess("Hi", [], 1);
    expect(result[0].alpha3).toBe("und");
  });

  test("should handle mixed language input", () => {
    const mixedText =
      "Este é um exemplo de frase em Português com um little bit of English embedded.";
    const results = guesser.guessMixed(mixedText, ["por", "eng"]);
    const hasPortuguese = results.some((r) =>
      r.language.toLowerCase().includes("portuguese"),
    );
    const hasEnglish = results.some((r) =>
      r.language.toLowerCase().includes("english"),
    );
    expect(hasPortuguese).toBeTruthy();
    expect(hasEnglish).toBeTruthy();
  });
});

describe("LanguageGuesser static methods", () => {
  test("getTrigrams should extract correct trigrams", () => {
    const input = "Hello";
    const trigrams = LanguageGuesser.getTrigrams(input);
    expect(trigrams).toEqual([" he", "hel", "ell", "llo", "lo "]);
  });

  test("asTuples should return sorted frequency tuples", () => {
    const input = "aaa";
    const tuples = LanguageGuesser.asTuples(input);
    expect(tuples).toHaveLength(3);
    expect(tuples).toEqual([
      [" aa", 1],
      ["aaa", 1],
      ["aa ", 1],
    ]);
  });

  test("getDistance should calculate correct distance", () => {
    const trigrams: [string, number][] = [
      ["abc", 2],
      ["def", 3],
    ];
    const model = ["abc", "def"];
    const distance = LanguageGuesser.getDistance(trigrams, model);
    expect(distance).toBe(2);
  });

  test("getOccurrence should compute proportion of matches", () => {
    const text = "aaabbb";
    const regex = /a/g;
    const occurrence = LanguageGuesser.getOccurrence(text, regex);
    expect(occurrence).toBeCloseTo(0.5);
  });

  test("isLatin should return true for Latin text", () => {
    expect(LanguageGuesser.isLatin("Hello, world!")).toBe(true);
  });

  test("isLatin should return false for non-Latin text", () => {
    expect(LanguageGuesser.isLatin("Привет")).toBe(false);
  });

  test("getTopScript should return 'Latin' for Latin text", () => {
    const result = LanguageGuesser.getTopScript("This is a test.");
    expect(result[0]).toBe("Latin");
  });

  test("getTopScript should return a non-Latin script for non-Latin text", () => {
    const result = LanguageGuesser.getTopScript("你好世界");
    expect(result[0]).toBe("cmn");
  });

  test("filterLanguages should filter languages correctly", () => {
    const dummyLanguages = {
      eng: ["a", "b"],
      spa: ["c", "d"],
      fre: ["e", "f"],
    };

    let filtered = LanguageGuesser.filterLanguages(
      dummyLanguages,
      ["eng", "spa"],
      [],
    );
    expect(Object.keys(filtered).sort()).toEqual(["eng", "spa"]);

    filtered = LanguageGuesser.filterLanguages(dummyLanguages, [], ["spa"]);
    expect(Object.keys(filtered).sort()).toEqual(["eng", "fre"]);

    filtered = LanguageGuesser.filterLanguages(
      dummyLanguages,
      ["eng", "spa"],
      ["spa"],
    );
    expect(Object.keys(filtered)).toEqual(["eng"]);
  });

  test("getDistances should compute and sort distances", () => {
    const dummyLanguages = {
      lang1: ["abc", "def"],
      lang2: ["abc", "xyz"],
    };

    const trigrams: [string, number][] = [
      ["abc", 2],
      ["def", 3],
      ["xyz", 1],
    ];

    const distances = LanguageGuesser.getDistances(
      trigrams,
      dummyLanguages,
      {},
    );
    expect(distances.length).toBe(2);
    expect(distances[0][1]).toBeLessThanOrEqual(distances[1][1]);
  });

  test("detectAll should return und for text shorter than minLength", () => {
    const result = LanguageGuesser.detectAll("short", { minLength: 10 });
    expect(result[0][0]).toBe("und");
  });
});

describe("LanguageGuesser instance methods", () => {
  let guesser: LanguageGuesser;

  beforeEach(() => {
    guesser = new LanguageGuesser();
  });

  test("should transform allow list correctly", () => {
    const allowList = ["eng", "es"];
    const transformed = guesser["transformCodeList"](allowList);
    expect(transformed).toEqual(["eng", "spa"]);
  });

  test("should guess language with allow list", () => {
    const result = guesser.guess(
      "This is a test and is basically my life.",
      ["eng", "por"],
      1,
    );
    expect(result[0].alpha3).toBe("eng");
  });

  test("should guess language with deny list", () => {
    const result = guesser.guess("Esta es una prueba.", [], 1);
    expect(result[0].alpha3).toBe("spa");
  });

  test("should return undetermined for unknown language", () => {
    const result = guesser.guess("これはテストです。", ["eng", "spa"], 1);
    expect(result[0].alpha3).toBe("und");
  });

  test("should handle empty input gracefully", () => {
    const result = guesser.guess("", [], 1);
    expect(result[0].alpha3).toBe("und");
  });

  test("should handle long input efficiently", () => {
    const longText = "a".repeat(5000);
    const result = guesser.guess(longText, [], 1);
    expect(result[0].alpha3).toBe("por");
  });

  test("should guess mixed languages correctly", () => {
    const mixedText = "Hello, this is a test. Hola, esto es una prueba.";
    const results = guesser.guessMixed(mixedText, ["eng", "spa"], 2);
    expect(results.length).toBe(2);
    expect(results[0].alpha3).toBe("spa");
    expect(results[1].alpha3).toBe("eng");
  });
});
