// Languages offered for pastes, with the file extension used for downloads.
export const PASTE_LANGUAGES: Array<{
  id: string
  label: string
  ext: string
}> = [
  { id: 'text', label: 'Plain text', ext: 'txt' },
  { id: 'markdown', label: 'Markdown', ext: 'md' },
  { id: 'json', label: 'JSON', ext: 'json' },
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'bash', label: 'Shell', ext: 'sh' },
  { id: 'html', label: 'HTML', ext: 'html' },
  { id: 'css', label: 'CSS', ext: 'css' },
  { id: 'sql', label: 'SQL', ext: 'sql' },
  { id: 'yaml', label: 'YAML', ext: 'yaml' },
  { id: 'go', label: 'Go', ext: 'go' },
  { id: 'rust', label: 'Rust', ext: 'rs' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'c', label: 'C', ext: 'c' },
  { id: 'cpp', label: 'C++', ext: 'cpp' },
  { id: 'csharp', label: 'C#', ext: 'cs' },
  { id: 'php', label: 'PHP', ext: 'php' },
  { id: 'ruby', label: 'Ruby', ext: 'rb' },
]

export function languageInfo(id: string) {
  return PASTE_LANGUAGES.find((l) => l.id === id) ?? PASTE_LANGUAGES[0]
}
