import { describe, it, expect } from 'vitest'
import { parseCsv } from '../../src/utils/textPreview'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, embedded delimiters and newlines', () => {
    const csv = 'a,b,c\r\n1,"x, y","He said ""hi"""\n2,"multi\nline",\n'
    expect(parseCsv(csv)).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', 'He said "hi"'],
      ['2', 'multi\nline', ''],
    ])
  })

  it('supports TSV and a trailing row without newline', () => {
    expect(parseCsv('a\tb\n1\t2', '\t')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})
