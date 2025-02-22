import { scripts } from "../regex";

describe("Regex Patterns", () => {
  test("should match Chinese characters", () => {
    const text = "你好";
    expect(scripts.cmn.test(text)).toBe(true);
  });

  test("should match Latin characters", () => {
    const text = "Hello";
    expect(scripts.Latin.test(text)).toBe(true);
  });

  test("should match Cyrillic characters", () => {
    const text = "Привет";
    expect(scripts.Cyrillic.test(text)).toBe(true);
  });

  test("should match Arabic characters", () => {
    const text = "مرحبا";
    expect(scripts.Arabic.test(text)).toBe(true);
  });

  test("should match Bengali characters", () => {
    const text = "বাংলা";
    expect(scripts.ben.test(text)).toBe(true);
  });
});
