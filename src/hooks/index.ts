import {
  ON_ACTIVATE_KEY,
  ON_DEACTIVATE_KEY,
} from '../core/index.ts';
import type { Store, Subscriber } from '../core/index.js';

type Hook = (...args: any[]) => void;
interface Hooks {
  /** Activation runner */
  _onActivate?: Hook;
  /** Deactivation runner */
  _onDeactivate?: Hook;
  /** Update runner */
  _onUpdate?: Hook;
  /** Activation listeners */
  _activateListeners?: Hook[];
  /** Deactivation listeners */
  _deactivateListeners?: Hook[];
}

function runActivateListeners(this: Hooks, ...args: any[]) {
  const listeners = this._activateListeners as Hook[];
  for (let i = 0; i < listeners.length; i++) listeners[i]!(...args);
}

function runDeactivateListeners(this: Hooks, ...args: any[]) {
  const listeners = this._deactivateListeners as Hook[];
  for (let i = 0; i < listeners.length; i++) listeners[i]!(...args);
}

function addHook(
  store: Store<any>,
  key: typeof ON_ACTIVATE_KEY | typeof ON_DEACTIVATE_KEY,
  listenersKey: '_activateListeners' | '_deactivateListeners',
  listener: Hook,
  runner: Hook
) {
  const hooks = (store._hooks ||= {}) as Hooks;
  let listeners = hooks[listenersKey] as Hook[] | undefined;

  if (listeners) {
    listeners.push(listener);
  } else {
    hooks[key] = runner;
    listeners = hooks[listenersKey] = [listener];
  }

  let current: Hook | undefined = listener;

  return () => {
    if (!current) return;

    const index = listeners.indexOf(current);
    current = undefined;

    if (index !== -1) listeners.splice(index, 1);
  };
}

export type ActivateHandler<T> = (
  value: T
) => ((value: T) => void) | void;

/**
 * Runs a callback when the store gets its first subscriber or active dependent.
 * A callback returned from the handler runs when the store becomes inactive.
 */
export function onActivate<T>(store: Store<T>, handler: ActivateHandler<T>) {
  let deactivate: ((value: T) => void) | void;

  const removeActivate = addHook(
    store,
    ON_ACTIVATE_KEY,
    /* @__KEY__ */ '_activateListeners',
    (value: T) => {
      const cleanup = handler(value);
      deactivate = typeof cleanup === 'function' ? cleanup : undefined;
    },
    runActivateListeners
  );
  const removeDeactivate = addHook(
    store,
    ON_DEACTIVATE_KEY,
    /* @__KEY__ */ '_deactivateListeners',
    (value: T) => {
      const current = deactivate;
      deactivate = undefined;
      current?.(value);
    },
    runDeactivateListeners
  );

  return () => {
    const current = deactivate;
    deactivate = undefined;
    removeActivate();
    removeDeactivate();
    current?.(store.get());
  };
}

export const STORE_UNMOUNT_DELAY = 1000;

export interface MountPayload<Shared> {
  shared: Shared;
}

export type MountHandler<Shared> = (
  payload: MountPayload<Shared>
) => (() => void) | void;

/**
 * @deprecated Use {@link onActivate} instead.
 */
export function onMount<T, Shared = never>(
  store: Store<T>,
  initialize: MountHandler<Shared>
) {
  let active = false;
  let destroy: (() => void) | void;
  let enabled = true;
  let initializeCurrent: MountHandler<Shared> | undefined = initialize;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const activate = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    } else if (!active) {
      active = true;
      destroy = initializeCurrent?.({ shared: {} as Shared });
    }
  };

  const removeActivate = onActivate(store, () => {
    activate();

    return () => {
      if (!enabled) return;

      timeout = setTimeout(() => {
        timeout = undefined;

        if (active && !store._lastTarget) {
          active = false;
          const current = destroy;
          destroy = undefined;
          current?.();
        }
      }, STORE_UNMOUNT_DELAY);
    };
  });

  const originalSubscribe = store.subscribe;

  function subscribe(
    this: Store<T>,
    subscriber: Subscriber<T>,
    immediate?: boolean
  ) {
    if (enabled && !this._lastTarget) activate();
    return originalSubscribe.call(this, subscriber, immediate);
  }

  store.subscribe = subscribe;

  return () => {
    enabled = false;
    initializeCurrent = undefined;
    destroy = undefined;

    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    if (store.subscribe === subscribe) store.subscribe = originalSubscribe;
    removeActivate();
  };
}
