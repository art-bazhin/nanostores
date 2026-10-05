import { readFile, readdir, writeFile } from 'node:fs/promises'

import { transform } from 'esbuild'
import { createScanner, SyntaxKind } from 'typescript/unstable/ast'

// One mapping for every module and declaration. Append new internal keys here.
let keys = [
  'value',
  'updated',
  'notified',
  'version',
  'firstSource',
  'lastTarget',
  'equal',
  'cursor',
  'computing',
  'level',
  'exception',
  'children',
  'hooks',
  'nextValue',
  'compute',
  'source',
  'target',
  'cache',
  'nextSource',
  'previousTarget',
  'nextTarget',
  'onActivate',
  'onDeactivate',
  'onUpdate',
  'activateListeners',
  'deactivateListeners'
]
let alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
if (keys.length > alphabet.length) {
  throw new Error('Too many internal keys for two-character names')
}
let mangleCache = Object.fromEntries(
  keys.map((key, index) => [`_${key}`, `_${alphabet[index]}`])
)

function mangleDeclarations(source) {
  let scanner = createScanner(false, undefined, source)
  let chunks = []
  let end = 0

  for (
    let token = scanner.scan();
    token !== SyntaxKind.EndOfFile;
    token = scanner.scan()
  ) {
    if (token !== SyntaxKind.Identifier && token !== SyntaxKind.StringLiteral) {
      continue
    }
    let key = scanner.getTokenValue()
    if (!/^_[a-zA-Z]\w*$/.test(key)) continue
    if (!Object.hasOwn(mangleCache, key)) {
      throw new Error(`Register internal key ${key} in scripts/mangle.mjs`)
    }
    let replacement = mangleCache[key]
    if (token === SyntaxKind.StringLiteral) {
      replacement = JSON.stringify(replacement)
    }
    chunks.push(source.slice(end, scanner.getTokenStart()), replacement)
    end = scanner.getTokenEnd()
  }

  return chunks.join('') + source.slice(end)
}

let dist = new URL('../dist/', import.meta.url)
for (let filename of await readdir(dist, { recursive: true })) {
  let file = new URL(filename, dist)
  if (filename.endsWith('.d.ts')) {
    let source = await readFile(file, 'utf8')
    await writeFile(file, mangleDeclarations(source))
  } else if (filename.endsWith('.js')) {
    let source = await readFile(file, 'utf8')
    let result = await transform(source, {
      mangleCache,
      mangleProps: /^_[a-zA-Z]\w*$/,
      mangleQuoted: true
    })
    for (let key of Object.keys(result.mangleCache)) {
      if (!Object.hasOwn(mangleCache, key)) {
        throw new Error(`Register internal key ${key} in scripts/mangle.mjs`)
      }
    }
    await writeFile(file, result.code)
  }
}
