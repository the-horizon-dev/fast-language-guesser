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
    console.log(results);
    expect(hasPortuguese).toBeTruthy();
    expect(hasEnglish).toBeTruthy();
  });
});
