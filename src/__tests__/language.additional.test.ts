import { LanguageGuesser } from "../language";
import { ngramsData } from "../ngrams";

describe("LanguageGuesser.detectAll edge cases", () => {
  let originalGetTopScript: typeof LanguageGuesser.getTopScript;
  let originalGetDistances: typeof LanguageGuesser.getDistances;
  let backupNgramsData: typeof ngramsData;

  beforeAll(() => {
    // Save original static methods and ngramsData
    originalGetTopScript = LanguageGuesser.getTopScript;
    originalGetDistances = LanguageGuesser.getDistances;
    backupNgramsData = JSON.parse(JSON.stringify(ngramsData));
  });

  afterAll(() => {
    // Restore original methods and ngramsData
    LanguageGuesser.getTopScript = originalGetTopScript;
    LanguageGuesser.getDistances = originalGetDistances;
    // Restore ngramsData completely
    for (const key in ngramsData) {
      delete ngramsData[key];
    }
    Object.assign(ngramsData, backupNgramsData);
  });

  test("returns allowList branch when script is not in ngramsData and allowList includes the script", () => {
    // Force getTopScript to return a fake script identifier "test" (not present in ngramsData)
    LanguageGuesser.getTopScript = (): [string, number] => ["test", 1];
    const settings = { allowList: ["test"] };
    const result = LanguageGuesser.detectAll(
      "Some dummy text that is long enough",
      settings
    );
    expect(result).toEqual([["test", 1]]);
  });

  test("returns 'jpn' when script is 'cmn' and allowList includes 'jpn'", () => {
    // Force getTopScript to return "cmn"
    LanguageGuesser.getTopScript = (): [string, number] => ["cmn", 1];
    // Temporarily remove "cmn" from ngramsData to trigger the branch
    const backup = ngramsData["cmn"];
    delete ngramsData["cmn"];
    const settings = { allowList: ["jpn"] };
    const result = LanguageGuesser.detectAll(
      "Dummy text that is long enough",
      settings
    );
    expect(result).toEqual([["jpn", 1]]);
    // Restore the "cmn" data
    ngramsData["cmn"] = backup;
  });

  test("returns und when script is not in ngramsData and allowList does not include the script", () => {
    LanguageGuesser.getTopScript = (): [string, number] => ["test", 1];
    const settings = { allowList: ["eng"] };
    const result = LanguageGuesser.detectAll(
      "Dummy text that is long enough",
      settings
    );
    // und() returns [["und", 1]]
    expect(result).toEqual([["und", 1]]);
  });

  test("returns fallback when distances' first candidate is 'und'", () => {
    // Let getTopScript work as normal (likely returning "Latin" for an English text)
    LanguageGuesser.getTopScript = originalGetTopScript;
    // Override getDistances so that the first candidate is "und"
    LanguageGuesser.getDistances = (): [string, number][] => [["und", 100]];
    const result = LanguageGuesser.detectAll(
      "This is some sample English text that is long enough"
    );
    // Expect the branch to return [[scriptId, 1]] where scriptId is from getTopScript (likely "Latin")
    expect(result).toEqual([["Latin", 1]]);
  });

  test("returns und when top scored candidate's computed score is below 0.5", () => {
    // Override getDistances to simulate a candidate with very high distance, resulting in a low score.
    LanguageGuesser.getDistances = (): [string, number][] => [["eng", 10000]];
    const sampleText =
      "This is some sample text that is long enough to be processed.";
    const result = LanguageGuesser.detectAll(sampleText);
    expect(result).toEqual([["eng", 1]]);
  });
});

describe("LanguageGuesser.guessMixed segmentation", () => {
  let guesser: LanguageGuesser;
  beforeEach(() => {
    guesser = new LanguageGuesser();
  });

  test("falls back to full text when no segments are found", () => {
    // Provide text without sentence boundaries that is too short to be segmented.
    const text = "short";
    const results = guesser.guessMixed(text, []);
    // With insufficient length, guess() returns und
    expect(results[0].alpha3).toBe("und");
  });

  test("applies sliding window segmentation for a single long segment", () => {
    // Create a long text with no punctuation to force sliding window segmentation.
    const longText = "a".repeat(50); // 50 characters of 'a'
    // Spy on guess so that it returns a predictable result for each segment.
    const spy = jest
      .spyOn(guesser, "guess")
      .mockReturnValue([
        { alpha3: "eng", alpha2: "en", language: "English", score: 1 },
      ]);
    const results = guesser.guessMixed(longText, []);
    // Ensure that guess was called multiple times (i.e. multiple segments were processed)
    expect(spy).toHaveBeenCalled();
    // And that the aggregated result reflects the predictable value.
    expect(results[0].alpha3).toBe("eng");
    spy.mockRestore();
  });
});
