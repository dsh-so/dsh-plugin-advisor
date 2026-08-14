import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tokenize, score, findMatches } from '../src/match.ts'
import type { IndexEntry } from '../src/match.ts'

const mk = (partial: Partial<IndexEntry> & { id: string }): IndexEntry => ({
  name: partial.id,
  description: '',
  stars: 0,
  topics: [],
  install: 'dsh plugin --profile web add ' + partial.id,
  url: 'https://www.dsh.so/plugins/' + partial.id + '/',
  ...partial,
})

test('tokenize splits and lowercases', () => {
  assert.deepEqual(tokenize('Vision OCR screenshots!'), ['vision', 'ocr', 'screenshots'])
  assert.deepEqual(tokenize('中文 测试'), ['中文', '测试'])
})

test('empty tokens fall back to top stars', () => {
  const a = mk({ id: 'a', stars: 5 })
  const b = mk({ id: 'b', stars: 50 })
  const r = findMatches([a, b], '   ', 1)
  assert.equal(r[0].id, 'b')
})

test('name hit ranks above description hit', () => {
  const named = mk({ id: 'dsh-vision', name: 'dsh-vision', description: 'OCR image understanding', stars: 10, topics: ['vision'] })
  const desc = mk({ id: 'other', name: 'other', description: 'a vision toolkit for agents', stars: 100, topics: [] })
  const r = findMatches([desc, named], 'vision', 2)
  assert.equal(r[0].id, 'dsh-vision') // name+topics beats stars-only description
})

test('topic hit counts', () => {
  const t = mk({ id: 'mem', name: 'dsh-memory', description: 'persistent memory', stars: 1, topics: ['knowledge'] })
  assert.ok(score(t, ['memory']) > score(t, ['nope']))
})

test('limit respected and empty result', () => {
  const a = mk({ id: 'a', description: 'terminal tui' })
  const r = findMatches([a], 'unrelated', 5)
  assert.equal(r.length, 0)
  const r2 = findMatches([a, mk({ id: 'b', description: 'terminal' })], 'terminal', 1)
  assert.equal(r2.length, 1)
})

test('query matching is case-insensitive', () => {
  const a = mk({ id: 'dsh-browser', name: 'dsh-browser', description: 'Browser bridge' })
  assert.ok(findMatches([a], 'BROWSER', 5).length === 1)
})
