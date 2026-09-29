// Pure helpers for text previews (kept free of React/Next imports so they
// are unit-testable).

export const PREVIEW_BYTES = 512 * 1024
export const MAX_CSV_ROWS = 200

const TEXT_EXT = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'csv',
  'tsv',
  'log',
  'xml',
  'yml',
  'yaml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'env',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'php',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'sql',
  'html',
  'htm',
  'css',
  'scss',
  'vue',
  'svelte',
  'gradle',
  'dockerfile',
  'makefile',
  'gitignore',
  'srt',
  'vtt',
  'svg',
])

export function ext(name: string): string {
  const base = name.toLowerCase().split('/').pop() ?? ''
  return base.includes('.') ? base.split('.').pop()! : base
}

export function isTextPreviewable(type: string, name: string): boolean {
  return (
    type.startsWith('text/') ||
    type === 'image/svg+xml' || // served as text: SVG can carry script
    /^application\/(json|xml|javascript|x-yaml|yaml|x-sh|sql|toml)/.test(
      type,
    ) ||
    TEXT_EXT.has(ext(name))
  )
}

// Minimal RFC 4180 CSV parser (quotes, escaped quotes, embedded newlines).
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      if (rows.length >= MAX_CSV_ROWS) return rows
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}
