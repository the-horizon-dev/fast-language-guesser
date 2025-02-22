import { parseNgramValue, rawNgramsData, ngramsData } from "../ngrams";

describe("Ngrams", () => {
  test("should parse pipe-separated n-gram string into an array of tokens", () => {
    const value = "a|b|c";
    const result = parseNgramValue(value);
    expect(result).toEqual(["a", "b", "c"]);
  });

  test("should return the same array if input is already an array", () => {
    const value = ["a", "b", "c"];
    const result = parseNgramValue(value);
    expect(result).toEqual(value);
  });

  test("should process raw n-gram data correctly", () => {
    const script = Object.keys(rawNgramsData)[0];
    const lang = Object.keys(rawNgramsData[script])[0];
    expect(ngramsData[script][lang]).toEqual(
      parseNgramValue(rawNgramsData[script][lang])
    );
  });
});
