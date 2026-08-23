import {
  deepStrictEqual,
  notStrictEqual,
  ok,
  strictEqual
} from 'node:assert/strict'

interface MockCall {
  arguments: unknown[]
}

interface MockLike {
  mock: {
    callCount(): number
    calls: MockCall[]
  }
}

interface Expectation {
  not: {
    toHaveBeenCalled(): void
  }
  toBe(expected: unknown): void
  toBeDefined(): void
  toBeLessThan(expected: number): void
  toBeUndefined(): void
  toEqual(expected: unknown): void
  toHaveBeenCalledTimes(expected: number): void
  toHaveBeenCalledWith(...expected: unknown[]): void
  toHaveBeenLastCalledWith(...expected: unknown[]): void
}

function getMock(value: unknown): MockLike {
  ok(
    typeof value === 'function' &&
      typeof (value as unknown as MockLike).mock?.callCount === 'function',
    'Expected a mock function'
  )
  return value as unknown as MockLike
}

function isDeepEqual(actual: unknown, expected: unknown): boolean {
  try {
    deepStrictEqual(actual, expected)
    return true
  } catch {
    return false
  }
}

export function expect(actual: unknown): Expectation {
  return {
    not: {
      toHaveBeenCalled(): void {
        strictEqual(getMock(actual).mock.callCount(), 0)
      }
    },
    toBe(expected: unknown): void {
      strictEqual(actual, expected)
    },
    toBeDefined(): void {
      notStrictEqual(actual, undefined)
    },
    toBeLessThan(expected: number): void {
      ok(typeof actual === 'number' && actual < expected)
    },
    toBeUndefined(): void {
      strictEqual(actual, undefined)
    },
    toEqual(expected: unknown): void {
      deepStrictEqual(actual, expected)
    },
    toHaveBeenCalledTimes(expected: number): void {
      strictEqual(getMock(actual).mock.callCount(), expected)
    },
    toHaveBeenCalledWith(...expected: unknown[]): void {
      let calls = getMock(actual).mock.calls
      ok(calls.some(call => isDeepEqual(call.arguments, expected)))
    },
    toHaveBeenLastCalledWith(...expected: unknown[]): void {
      let calls = getMock(actual).mock.calls
      ok(calls.length > 0, 'Expected the mock function to have been called')
      deepStrictEqual(calls.at(-1)!.arguments, expected)
    }
  }
}
