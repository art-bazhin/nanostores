import { spawnSync } from 'node:child_process'
import { lstat, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import excludedFiles from './excluded-files.mjs'

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules'
])
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]s$/
const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url))

function normalize(filename) {
  return filename.split(sep).join('/')
}

async function findV1Tests(directory) {
  let found = []

  for (let name of await readdir(directory)) {
    if (IGNORED_DIRECTORIES.has(name)) continue

    let filename = join(directory, name)
    let relativeFilename = normalize(relative(PROJECT_ROOT, filename))
    let stat = await lstat(filename)

    if (stat.isDirectory()) {
      if (relativeFilename === 'src' || relativeFilename === 'test/legacy') {
        continue
      }
      found.push(...(await findV1Tests(filename)))
    } else if (TEST_FILE.test(name)) {
      found.push(relativeFilename)
    }
  }

  return found
}

let allTests = (await findV1Tests(PROJECT_ROOT)).toSorted()
let allTestSet = new Set(allTests)
let staleExclusions = excludedFiles.filter(file => !allTestSet.has(file))

if (staleExclusions.length > 0) {
  throw new Error(
    `Legacy test exclusions not found:\n- ${staleExclusions.join('\n- ')}`
  )
}

let excludedSet = new Set(excludedFiles)
let selectedTests = allTests.filter(file => !excludedSet.has(file))

if (selectedTests.length === 0) {
  throw new Error('No v1 test files selected for the legacy run')
}

let result = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    '--import',
    new URL('./register-loader.mjs', import.meta.url).href,
    '--test',
    '--test-reporter',
    'spec',
    ...selectedTests
  ],
  {
    cwd: PROJECT_ROOT,
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit'
  }
)

if (result.error) throw result.error
if (result.signal) throw new Error(`Legacy tests stopped by ${result.signal}`)

process.exitCode = result.status ?? 1
