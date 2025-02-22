# fast-language-guesser

A high-performance TypeScript library for tokenizing text and performing natural language processing tasks—including sentiment analysis and language detection—across multiple languages.

## Features

- ✨ **Fast & Efficient** - Optimized for performance  
- 🎯 **Type-Safe** - Written in TypeScript with full type definitions  
- 🔧 **Zero Dependencies** - No external runtime dependencies  
- 🛡️ **Robust** - Comprehensive error handling and edge case coverage  
- 📦 **Lightweight** - Small bundle size  
- 🌐 **Multi-Language** - Support for multiple languages

## Installation

Install via npm:

```bash
npm install @the-horizon-dev/fast-language-guesser
```

## Usage

### Language Detection

Detect the language of a given text using n-grams and script analysis.

#### Example

```typescript
import { LanguageGuesser } from "@the-horizon-dev/fast-language-guesser";

// Create an instance of the language guesser.
const guesser = new LanguageGuesser();
const text = "Bonjour tout le monde";

// Guess the best language.
const bestGuess = guesser.guessBest(text);
console.log(bestGuess);
// {
//   alpha3: "fra",
//   alpha2: "fr",
//   language: "French",
//   score: 0.95
// }

// Guess multiple languages with scores.
const guesses = guesser.guess(text);
console.log(guesses);
// [
//   { alpha3: "fra", alpha2: "fr", language: "French", score: 0.95 },
//   { alpha3: "eng", alpha2: "en", language: "English", score: 0.05 }
// ]
```

## Contributing

Feel free to fork the repository and contribute by opening pull requests or issues.

## License

MIT
