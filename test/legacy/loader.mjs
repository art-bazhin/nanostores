import { fileURLToPath, pathToFileURL } from 'node:url'
import { relative, sep } from 'node:path'

let root = fileURLToPath(new URL('../../', import.meta.url))
let v2EntryUrl = new URL('./v2-entry.ts', import.meta.url).href
let coreEntryUrl = new URL('../../src/index.ts', import.meta.url).href
let v2ModuleUrls = new Set([
  pathToFileURL(`${root}index.js`).href,
  pathToFileURL(`${root}atom/index.js`).href,
  pathToFileURL(`${root}computed/index.js`).href
])

function getLegacyTest(parentUrl) {
  if (!parentUrl?.startsWith('file:')) return undefined

  let filename = fileURLToPath(parentUrl)
  let relativeFilename = relative(root, filename).split(sep).join('/')

  if (
    relativeFilename.startsWith('../') ||
    relativeFilename.startsWith('src/') ||
    relativeFilename.startsWith('test/legacy/') ||
    !/\.(test|spec)\.[cm]?[jt]s$/.test(relativeFilename)
  ) {
    return undefined
  }

  return relativeFilename
}

export function resolve(specifier, context, nextResolve) {
  let testFile = getLegacyTest(context.parentURL)

  if (testFile) {
    if (specifier === 'node:test') {
      let nodeTestUrl = new URL('./node-test.mjs', import.meta.url)
      nodeTestUrl.searchParams.set('file', testFile)
      return { shortCircuit: true, url: nodeTestUrl.href }
    }

    let resolved = nextResolve(specifier, context)
    if (v2ModuleUrls.has(resolved.url)) {
      let url =
        testFile.startsWith('atom/') || testFile.startsWith('computed/')
          ? v2EntryUrl
          : coreEntryUrl
      return { shortCircuit: true, url }
    }
    return resolved
  }

  return nextResolve(specifier, context)
}
