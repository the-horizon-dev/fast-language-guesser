/**
 * Expressões regulares utilizadas para identificar scripts de escrita.
 * Utiliza Unicode property escapes para maior clareza e para evitar erros de ranges combinados.
 */
export const scripts: Record<string, RegExp> = {
  // Chinese, Japanese Kanji, and other Han characters.
  cmn: /\p{Script=Han}/gu,

  // Latin script (inclui letras latinas básicas e extendidas).
  Latin: /\p{Script=Latin}/gu,

  // Cyrillic script.
  Cyrillic: /\p{Script=Cyrillic}/gu,

  // Arabic script.
  Arabic: /\p{Script=Arabic}/gu,

  // Bengali script.
  ben: /\p{Script=Bengali}/gu,

  // Devanagari script.
  Devanagari: /\p{Script=Devanagari}/gu,

  // Japanese: Hiragana and Katakana (excluding Han which is covered in `cmn`).
  jpn: /(?:\p{Script=Hiragana}|\p{Script=Katakana})/gu,

  // Korean Hangul script.
  kor: /\p{Script=Hangul}/gu,

  // Telugu script.
  tel: /\p{Script=Telugu}/gu,

  // Tamil script.
  tam: /\p{Script=Tamil}/gu,

  // Gujarati script.
  guj: /\p{Script=Gujarati}/gu,

  // Kannada script.
  kan: /\p{Script=Kannada}/gu,

  // Malayalam script.
  mal: /\p{Script=Malayalam}/gu,

  // Myanmar script.
  Myanmar: /\p{Script=Myanmar}/gu,

  // Oriya (Odia) script.
  ori: /\p{Script=Oriya}/gu,

  // Punjabi: using Gurmukhi script.
  pan: /\p{Script=Gurmukhi}/gu,

  // Ethiopic script.
  Ethiopic: /\p{Script=Ethiopic}/gu,

  // Thai script.
  tha: /\p{Script=Thai}/gu,

  // Sinhala script.
  sin: /\p{Script=Sinhala}/gu,

  // Greek script.
  ell: /\p{Script=Greek}/gu,

  // Khmer script.
  khm: /\p{Script=Khmer}/gu,

  // Armenian script.
  hye: /\p{Script=Armenian}/gu,

  // Santali script.
  // Unicode names it as "Ol Chiki". If your engine supports it, you can use:
  sat: /\p{Script=Ol_Chiki}/gu,
  // Otherwise, you may revert to the numeric range:
  // sat: /[\u1C50-\u1C7F]/gu,

  // Tibetan script.
  bod: /\p{Script=Tibetan}/gu,

  // Hebrew script.
  Hebrew: /\p{Script=Hebrew}/gu,

  // Georgian script.
  kat: /\p{Script=Georgian}/gu,

  // Lao script.
  lao: /\p{Script=Lao}/gu,

  // Tifinagh script.
  zgh: /\p{Script=Tifinagh}/gu,

  // Yi script.
  iii: /\p{Script=Yi}/gu,

  // Avestan script.
  aii: /\p{Script=Avestan}/gu,
};
