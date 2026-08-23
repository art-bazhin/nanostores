import FakeTimers from '@sinonjs/fake-timers';
import { describe, it, mock } from 'node:test';

import { expect } from '../../test/expect.ts';
import { atom, computed } from '../core/index.ts';
import { onActivate, onMount } from './index.ts';

describe('onActivate', () => {
  it('sets store activation listener', () => {
    let value: number | undefined;
    const listener = mock.fn((current: number) => (value = current));
    const counter = atom(0);

    onActivate(counter, (current) => {
      listener(current);
    });

    expect(value).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(0);

    const unsubscribe = counter.subscribe(() => {});
    expect(value).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);

    counter.set(1);
    expect(value).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(value).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reacts to activation of a previously calculated store', () => {
    const listener = mock.fn();
    const a = atom(0);
    const b = computed((get) => get(a) * 2);
    const c = computed((get) => get(b) * 2);
    const d = computed((get) => get(c) * 2);

    onActivate(a, listener);

    d.get();
    d.subscribe(() => {});

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reacts to activation of a new dependency', () => {
    const listener = mock.fn();
    const a = atom(0);
    const b = atom(1);
    const c = computed((get) => get(a) && get(b));
    const d = computed((get) => get(c));

    onActivate(b, listener);
    d.subscribe(() => {});

    expect(listener).toHaveBeenCalledTimes(0);

    a.set(1);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps subscriptions made inside the handler on parent recalculation', () => {
    const listener = mock.fn();
    const a = atom(0);
    const b = atom(0);
    const c = computed((get) => get(b));

    onActivate(b, () => {
      a.subscribe(listener);
    });

    c.subscribe(() => {});
    expect(listener).toHaveBeenCalledTimes(1);

    a.set(1);
    expect(listener).toHaveBeenCalledTimes(2);

    b.set(1);
    expect(listener).toHaveBeenCalledTimes(2);

    a.set(2);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('runs the returned cleanup on deactivation', () => {
    const cleanup = mock.fn();
    const counter = atom(0);

    onActivate(counter, () => cleanup);

    const unsubscribe = counter.subscribe(() => {});

    expect(cleanup).toHaveBeenCalledTimes(0);

    counter.set(1);
    unsubscribe();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenLastCalledWith(1);
  });

  it('supports multiple handlers', () => {
    const calls: string[] = [];
    const first = mock.fn(() => {
      calls.push('first');
      return () => calls.push('first cleanup');
    });
    const second = mock.fn(() => {
      calls.push('second');
      return () => calls.push('second cleanup');
    });
    const counter = atom(0);

    onActivate(counter, first);
    onActivate(counter, second);

    const unsubscribe = counter.subscribe(() => {});

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['first', 'second']);

    unsubscribe();
    expect(calls).toEqual([
      'first',
      'second',
      'first cleanup',
      'second cleanup',
    ]);
  });

  it('can remove a handler', () => {
    const listener = mock.fn();
    const counter = atom(0);
    const remove = onActivate(counter, listener);

    remove();
    remove();

    const unsubscribe = counter.subscribe(() => {});

    expect(listener).toHaveBeenCalledTimes(0);
    unsubscribe();
  });

  it('runs the current cleanup when removing an active handler', () => {
    const cleanup = mock.fn();
    const counter = atom(0);
    const remove = onActivate(counter, () => cleanup);
    const unsubscribe = counter.subscribe(() => {});

    counter.set(1);
    remove();
    remove();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenLastCalledWith(1);

    unsubscribe();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('handles stores without dependencies', () => {
    const subscriber = mock.fn();
    const activate = mock.fn();
    const deactivate = mock.fn();
    const frozen = computed(() => 0);

    onActivate(frozen, () => {
      activate();
      return deactivate;
    });

    const unsubscribe = frozen.subscribe(subscriber);
    expect(deactivate).toHaveBeenCalledTimes(0);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('handles automatic subscriptions in the right order', () => {
    const deactivate = mock.fn();
    const source = atom(0);
    const external = atom(0);
    const result = computed((get) => {
      external.subscribe(() => {});
      return get(source);
    });

    onActivate(external, () => deactivate);

    result.subscribe(() => {});
    expect(deactivate).toHaveBeenCalledTimes(0);

    source.set(1);
    expect(deactivate).toHaveBeenCalledTimes(1);
  });

  it('handles deep automatic subscriptions in the right order', () => {
    const deactivate = mock.fn();
    const source = atom(0);
    const result = computed((get) => {
      get(source);

      const nested = computed((track) => track(source) * 2);
      onActivate(nested, () => deactivate);

      return nested;
    });
    const parent = computed((get) => {
      get(result).subscribe(() => {});
    });

    parent.subscribe(() => {});
    expect(deactivate).toHaveBeenCalledTimes(0);

    source.set(1);
    expect(deactivate).toHaveBeenCalledTimes(1);
  });

  it('handles activation and deactivation in changing dependency trees', () => {
    const activate = mock.fn();
    const deactivate = mock.fn();
    const a = atom(0);
    const b = atom(0);
    const c = atom(0);
    const d = atom(0);
    const a1 = computed((get) => get(a));
    const b1 = computed((get) => get(b));
    const c1 = computed((get) => get(c));
    const d1 = computed((get) => get(d));
    const a2 = computed((get) => get(a1));
    const b2 = computed((get) => get(b1));
    const c2 = computed((get) => get(c1));
    const d2 = computed((get) => get(d1));
    const result = computed((get) =>
      get(a2) < 10 ? get(b2) + get(c2) + get(d2) : get(d2) + get(c2)
    );

    onActivate(b1, () => {
      activate();
      return deactivate;
    });

    const unsubscribe = result.subscribe(() => {});
    expect(activate).toHaveBeenCalledTimes(1);
    expect(deactivate).toHaveBeenCalledTimes(0);

    a.set(1);
    b.set(1);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(deactivate).toHaveBeenCalledTimes(0);

    a.set(10);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(deactivate).toHaveBeenCalledTimes(1);

    a.set(5);
    expect(activate).toHaveBeenCalledTimes(2);
    expect(deactivate).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(activate).toHaveBeenCalledTimes(2);
    expect(deactivate).toHaveBeenCalledTimes(2);
  });
});

describe('onMount', () => {
  it('preserves the legacy delayed cleanup behavior', () => {
    const clock = FakeTimers.install();

    try {
      const events: string[] = [];
      const store = atom('');

      onMount(store, () => {
        store.set('initial');
        events.push('init');
        return () => events.push('destroy');
      });

      const unsubscribe = store.listen((value) => events.push(value));
      expect(events).toEqual(['init']);

      unsubscribe();
      expect(events).toEqual(['init']);

      const unsubscribeAgain = store.listen(() => {});
      clock.runAll();
      expect(events).toEqual(['init']);

      unsubscribeAgain();
      clock.runAll();
      expect(events).toEqual(['init', 'destroy']);
    } finally {
      clock.uninstall();
    }
  });
});

// Tests for the remaining lifecycle hooks were moved here from core. They will
// be enabled one group at a time as the corresponding tree-shakable hooks are
// implemented.

// describe('lifecycle hooks', () => {
//   it('emits in right order', () => {
//     const result: any = {};
//     let order = 0;
//
//     const counter = atom(0, {
//       onActivate: () => (result.activate = ++order),
//       onDeactivate: () => (result.deactivate = ++order),
//       onUpdate: () => (result.update = ++order),
//     });
//
//     const unsubscribe = counter.subscribe(() => {});
//     counter.set(1);
//     unsubscribe();
//
//     expect(result.activate).toBe(1);
//     expect(result.update).toBe(2);
//     expect(result.deactivate).toBe(3);
//   });
// });

// describe('onDeactivate', () => {
//   it('sets store deactivation listener', () => {
//     let value: any;
//     const listener = mock.fn((current) => (value = current));
//     const counter = atom(0, { onDeactivate: listener });
//
//     const unsubscribe = counter.subscribe(() => {});
//     counter.set(1);
//     unsubscribe();
//
//     expect(value).toBe(1);
//     expect(listener).toHaveBeenCalledTimes(1);
//     expect(listener).toHaveBeenCalledWith(1);
//   });
//
//   it('reacts to deactivation of a dependency', () => {
//     const listener = mock.fn();
//     const a = atom(1);
//     const b = atom(1, { onDeactivate: listener });
//     const c = computed((get) => get(a) && get(b));
//     const d = computed((get) => get(c));
//
//     d.subscribe(() => {});
//     a.set(0);
//
//     expect(listener).toHaveBeenCalledTimes(1);
//   });
//
//   it('does not run if a dependency reappears in the same calculation', () => {
//     const listener = mock.fn();
//     const a = atom(1);
//     const b = atom(1, { onDeactivate: listener });
//     const c = computed((get) =>
//       get(a) ? get(b) + get(a) : get(a) + get(b)
//     );
//
//     c.subscribe(() => {});
//     a.set(0);
//     a.set(1);
//
//     expect(listener).toHaveBeenCalledTimes(0);
//   });
// });

// describe('onCreate', () => {
//   it('runs when a store is created', () => {
//     const atomListener = mock.fn();
//     const computedListener = mock.fn();
//
//     atom(0, { onCreate: atomListener });
//     computed(() => {}, { onCreate: computedListener });
//
//     expect(atomListener).toHaveBeenCalledWith(0);
//     expect(computedListener).toHaveBeenCalledWith(undefined);
//   });
// });

// describe('onUpdate', () => {
//   it('sets store update listener', () => {
//     const listener = mock.fn();
//     const counter = atom(0, { onUpdate: listener });
//
//     const unsubscribe = counter.subscribe(() => {});
//     counter.set(1);
//
//     expect(listener).toHaveBeenCalledWith(1, 0);
//     unsubscribe();
//   });
// });

// describe('onCleanup', () => {
//   it('runs before every computation and on deactivation', () => {
//     const listener = mock.fn();
//     const counter = atom(0);
//     const computedCounter = computed((get) => get(counter), {
//       onCleanup: listener,
//     });
//
//     const unsubscribe = computedCounter.subscribe(() => {});
//     counter.set(1);
//     unsubscribe();
//
//     expect(listener).toHaveBeenCalledTimes(3);
//   });
// });

// describe('onException', () => {
//   it('runs for computation errors', () => {
//     const listener = mock.fn();
//     const counter = atom(0);
//     const doubled = computed(
//       (get) => {
//         if (get(counter) > 4) throw new Error('test');
//         return get(counter) * 2;
//       },
//       { onException: listener }
//     );
//
//     doubled.subscribe(() => {});
//     counter.set(5);
//
//     expect(listener).toHaveBeenCalledTimes(1);
//   });
// });

// describe('hook context', () => {
//   it('exposes the configured store name to a hook', () => {
//     const listener = mock.fn();
//     const store = atom(0, { name: 'test' });
//
//     onUpdate(store, function () {
//       listener(this.name);
//     });
//
//     store.set(1);
//     expect(listener).toHaveBeenLastCalledWith('test');
//   });
// });
