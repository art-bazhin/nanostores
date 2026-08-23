/**
 * Exception statuses:
 *
 * - `todo` is not run and still needs investigation or a decision.
 * - `work` is run normally while investigating or resolving an exception.
 * - `done` is not run because the case was analyzed and v2 behavior was
 *   accepted. The intended behavior may be available through a different API,
 *   or the incompatibility may be an intentional breaking change.
 *   Remove the exception if the original test passes against v2.
 *
 * Exclude a whole test file in excluded-files.mjs when its API is not ready
 * for the legacy run.
 */
let atomExceptions = {
  'has unchanging initial value via `init`': {
    status: 'done',
    reason: 'Breaking change: v2 does not expose Store#init or Store#value'
  },
  'has default value': {
    status: 'done',
    reason: 'Default value is available through get(); the test reads removed Store#value'
  },
  'supports double unsubscribe': {
    status: 'done',
    reason: 'Double unsubscribe still works; the test checks removed Store#lc'
  },
  'uses custom eq to skip equal values': {
    status: 'done',
    reason: 'Custom equality is available through the atom equal option; the test assigns removed Store#eq'
  },
  'notify defers drain inside batch': {
    status: 'done',
    reason: 'Breaking change: v2 replaces Store#notify() with Store#update()'
  },
  'notify dedupes the same listener across atoms in a batch': {
    status: 'done',
    reason: 'Breaking change: v2 does not deduplicate separate subscriptions by listener identity'
  },
  'listenKeys fires once with undefined key inside a batch': {
    status: 'todo',
    reason: 'Deferred until map and listenKeys are ported to v2'
  },
  'batch dedupes repeated setKey on the same key': {
    status: 'todo',
    reason: 'Deferred until map is ported to v2'
  },
  'batch coalesces setKey on different keys into one undefined-key call': {
    status: 'todo',
    reason: 'Deferred until map is ported to v2'
  },
  'batch dedupes whole-store map.set notifications': {
    status: 'todo',
    reason: 'Deferred until map is ported to v2'
  },
  'batch keeps working when a listener throws during its flush': {
    status: 'done',
    reason: 'Breaking change: v2 logs listener errors without throwing from batch(), so store updates remain independent of subscribers'
  }
}

let computedExceptions = {
  'is compatible with onMount': {
    status: 'done',
    reason: 'onMount lifecycle behavior still works; the test checks removed Store#lc'
  },
  'batches updates when passing batch arg': {
    status: 'done',
    reason: 'Breaking change: v2 does not provide batched()'
  },
  'computes initial value for batch arg without waiting': {
    status: 'done',
    reason: 'Breaking change: v2 does not provide batched()'
  },
  'supports map': {
    status: 'todo',
    reason: 'Deferred until map is ported to v2: mixing v1 map with v2 computed corrupts subsequent tests'
  },
  'uses the dependency equality function': {
    status: 'todo',
    reason: 'Deferred until map is ported to v2; the test also assigns removed Store#eq'
  },
  'notifies listeners about a store changed by other listener in batch': {
    status: 'done',
    reason: 'Breaking change: v2 emits the final computed value after a listener updates another store during batch flush'
  },
  'async computed using task': {
    status: 'done',
    reason:
      'Breaking change: v2 computed() no longer supports task results; use @nanostores/async'
  },
  'skips stale update': {
    status: 'done',
    reason:
      'Breaking change: v2 computed() no longer resolves task results or skips stale async results; use @nanostores/async'
  },
  'cleans up on unmount': {
    status: 'done',
    reason: 'Computed dependencies are released on unsubscribe; the test checks removed Store#lc'
  },
  'eq on computed store stops downstream recomputations': {
    status: 'done',
    reason: 'The computed equal option stops downstream recomputations; the test assigns removed Store#eq'
  },
  'passes undefined as old value on the first computed run': {
    status: 'done',
    reason:
      'The first v2 computation receives undefined as prevValue; the test assigns removed Store#eq and expects it to run on initialization'
  }
}

/**
 * Legacy tests that do not pass against Nano Stores 2.
 *
 * Keep file paths and test names unchanged so merging v1 tests does not create
 * conflicts. Each exception records why it is pending or why its v1 assertion
 * no longer applies to the accepted v2 behavior.
 */
export default {
  'atom/index.test.ts': atomExceptions,
  'computed/index.test.ts': computedExceptions
}
