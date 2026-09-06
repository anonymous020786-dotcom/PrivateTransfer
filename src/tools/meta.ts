// 15 browser-based utility tools. Metadata is server-safe (no client code) so
// it can power the /tools index, sitemap and per-tool metadata.

export type ToolMeta = {
  slug: string
  name: string
  description: string
  emoji: string
  category: string
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'password-generator',
    name: 'Password Generator',
    description:
      'Create strong, random passwords with custom length and character sets.',
    emoji: '🔑',
    category: 'Security',
  },
  {
    slug: 'qr-generator',
    name: 'QR Code Generator',
    description: 'Turn any text or link into a scannable QR code, instantly.',
    emoji: '🔳',
    category: 'Sharing',
  },
  {
    slug: 'file-hash',
    name: 'File & Text Checksum',
    description:
      'Compute SHA-256 / SHA-1 hashes of files or text to verify integrity.',
    emoji: '🧮',
    category: 'Security',
  },
  {
    slug: 'base64',
    name: 'Base64 Encode / Decode',
    description: 'Encode text to Base64 or decode it back, in your browser.',
    emoji: '🔤',
    category: 'Encoding',
  },
  {
    slug: 'url-encode',
    name: 'URL Encode / Decode',
    description: 'Percent-encode or decode URLs and query strings.',
    emoji: '🔗',
    category: 'Encoding',
  },
  {
    slug: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate cryptographically random v4 UUIDs in bulk.',
    emoji: '🆔',
    category: 'Generators',
  },
  {
    slug: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Pretty-print, minify and validate JSON.',
    emoji: '📦',
    category: 'Developer',
  },
  {
    slug: 'word-counter',
    name: 'Word & Character Counter',
    description: 'Count words, characters, sentences and reading time.',
    emoji: '📝',
    category: 'Text',
  },
  {
    slug: 'case-converter',
    name: 'Text Case Converter',
    description:
      'Convert text between UPPER, lower, Title, camelCase and more.',
    emoji: '🔠',
    category: 'Text',
  },
  {
    slug: 'lorem-ipsum',
    name: 'Lorem Ipsum Generator',
    description: 'Generate placeholder paragraphs, sentences or words.',
    emoji: '📃',
    category: 'Generators',
  },
  {
    slug: 'color-converter',
    name: 'Color Converter',
    description: 'Convert between HEX, RGB and HSL and preview the color.',
    emoji: '🎨',
    category: 'Design',
  },
  {
    slug: 'timestamp',
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps and human-readable dates.',
    emoji: '🕒',
    category: 'Developer',
  },
  {
    slug: 'slug-generator',
    name: 'Slug Generator',
    description: 'Turn any title into a clean, URL-safe slug.',
    emoji: '🐌',
    category: 'Text',
  },
  {
    slug: 'markdown-preview',
    name: 'Markdown Previewer',
    description: 'Write Markdown and see a live rendered preview.',
    emoji: '⬇️',
    category: 'Developer',
  },
  {
    slug: 'text-diff',
    name: 'Text Diff Checker',
    description: 'Compare two blocks of text and highlight line differences.',
    emoji: '🔍',
    category: 'Developer',
  },
  {
    slug: 'regex-tester',
    name: 'Regex Tester',
    description:
      'Test regular expressions against text and see all matches highlighted.',
    emoji: '🔎',
    category: 'Developer',
  },
  {
    slug: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode and inspect JWT header and payload without a secret.',
    emoji: '🪙',
    category: 'Security',
  },
  {
    slug: 'base-converter',
    name: 'Number Base Converter',
    description:
      'Convert numbers between binary, octal, decimal and hexadecimal.',
    emoji: '🔢',
    category: 'Developer',
  },
  {
    slug: 'unit-converter',
    name: 'Unit Converter',
    description:
      'Convert between temperature, length, weight and data-size units.',
    emoji: '📐',
    category: 'Utilities',
  },
  {
    slug: 'cron-parser',
    name: 'Cron Expression Parser',
    description: 'Enter a cron expression and get a plain-English description.',
    emoji: '⏰',
    category: 'Developer',
  },
  {
    slug: 'random-generator',
    name: 'Random Generator',
    description:
      'Roll dice, flip coins, pick random numbers or shuffle a list.',
    emoji: '🎲',
    category: 'Generators',
  },
  {
    slug: 'css-minifier',
    name: 'CSS Minifier',
    description: 'Strip comments and whitespace from CSS to reduce file size.',
    emoji: '🎨',
    category: 'Developer',
  },
  {
    slug: 'text-repeater',
    name: 'Text Repeater',
    description: 'Repeat any text N times with a custom separator.',
    emoji: '🔁',
    category: 'Text',
  },
  {
    slug: 'pomodoro',
    name: 'Pomodoro Timer',
    description: 'Focus/break countdown timer with Pomodoro technique presets.',
    emoji: '🍅',
    category: 'Utilities',
  },
  {
    slug: 'html-formatter',
    name: 'HTML Formatter',
    description: 'Beautify or minify HTML markup in your browser.',
    emoji: '🌐',
    category: 'Developer',
  },
]

export function getTool(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug)
}
