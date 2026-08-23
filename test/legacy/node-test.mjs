import { test as nodeTest } from 'node:test'

import exceptionsByFile from './exceptions.mjs'

let testFile = new URL(import.meta.url).searchParams.get('file')

if (!testFile) throw new Error('Legacy test filename was not provided')

let exceptions = exceptionsByFile[testFile] || {}

let usedExceptions = new Set()
let registeredTests = 0

function legacyTest(name, ...args) {
  registeredTests += 1

  let exception = exceptions[name]
  let status
  let [optionsOrHandler, handler] = args
  let options

  if (typeof optionsOrHandler === 'function') {
    handler = optionsOrHandler
    options = {}
  } else {
    options = optionsOrHandler || {}
  }

  if (exception) {
    usedExceptions.add(name)
    status = exception.status

    if (status === undefined) {
      throw new Error(`Missing legacy test status for “${name}”`)
    }

    if (status !== 'todo' && status !== 'done' && status !== 'work') {
      throw new Error(`Unknown legacy test status for “${name}”: ${status}`)
    }

    if (!exception.reason) {
      throw new Error(`Missing legacy test reason for “${name}”`)
    }

    if (status !== 'work') {
      options = { ...options, skip: `${status}: ${exception.reason}` }
    }
  }

  if ((!exception || status === 'work') && handler) {
    let originalHandler = handler

    handler = (...handlerArgs) => {
      try {
        let result = originalHandler(...handlerArgs)

        if (result && typeof result.then === 'function') {
          return result.catch(error => {
            reportFailure(name, error)
            throw error
          })
        }

        return result
      } catch (error) {
        reportFailure(name, error)
        throw error
      }
    }
  }

  return nodeTest(name, options, handler)
}

function reportFailure(name, error) {
  let details = error instanceof Error ? error.stack : String(error)
  process.stderr.write(`\n[legacy ${testFile}] ${name}\n${details}\n`)
}

Object.assign(legacyTest, nodeTest)

export function assertAllExceptionsUsed() {
  let stale = Object.keys(exceptions).filter(name => !usedExceptions.has(name))

  if (stale.length > 0) {
    throw new Error(`Legacy test exceptions not found:\n- ${stale.join('\n- ')}`)
  }
}

function reportLegacyStatus() {
  assertAllExceptionsUsed()

  let values = Object.values(exceptions)
  let todo = values.filter(exception => exception.status === 'todo').length
  let done = values.filter(exception => exception.status === 'done').length
  let work = values.filter(exception => exception.status === 'work').length
  let regular = registeredTests - values.length

  process.stderr.write(
    `[legacy ${testFile}] ${regular} regular, ${todo} todo, ${work} work, ${done} done\n`
  )
}

process.once('beforeExit', reportLegacyStatus)

export { legacyTest as test }
