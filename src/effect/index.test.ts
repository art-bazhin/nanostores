import { describe, it, mock } from 'node:test';

import { expect } from '../../test/expect.ts';
import { atom, batch, configure } from '../core/index.ts';
import { effect } from './index.ts';

describe('effect', () => {
  it('immediately invokes the passed function', () => {
    const counter = atom(0);
    const values: number[] = [];
    const stop = effect((get) => {
      values.push(get(counter));
    });

    expect(values).toEqual([0]);
    stop();
  });

  it('invokes the passed function on dependency changes', () => {
    const counter = atom(0);
    const values: number[] = [];
    const stop = effect((get) => {
      values.push(get(counter));
    });

    counter.set(1);
    counter.set(2);

    expect(values).toEqual([0, 1, 2]);
    stop();
  });

  it('uses the passed options', () => {
    const counter = atom(0);
    const equal = mock.fn(Object.is);
    const stop = effect((get) => get(counter), { equal });

    counter.set(1);

    expect(equal).toHaveBeenCalledTimes(1);
    stop();
  });

  it('logs exceptions from the effect', () => {
    const counter = atom(0);
    const error = new Error('boom');
    const errors: unknown[] = [];

    configure({ logException: (caught) => errors.push(caught) });
    try {
      const stop = effect((get) => {
        if (get(counter) > 0) throw error;
      });

      counter.set(1);

      expect(errors).toEqual([error]);
      stop();
    } finally {
      configure();
    }
  });

  it('stops invoking the passed function after unsubscribing', () => {
    const counter = atom(0);
    const values: number[] = [];
    const stop = effect((get) => {
      values.push(get(counter));
    });

    stop();
    counter.set(1);

    expect(values).toEqual([0]);
  });

  it('runs once with the final values after a batch', () => {
    const a = atom(0);
    const b = atom(0);
    const values: [number, number][] = [];
    const stop = effect((get) => {
      values.push([get(a), get(b)]);
    });

    batch(() => {
      a.set(1);
      b.set(2);
      a.set(3);
      b.set(4);
    });

    expect(values).toEqual([[0, 0], [3, 4]]);
    stop();
  });

  it('supports the deprecated single-store form', () => {
    const counter = atom(0);
    const values: number[] = [];
    const stop = effect(counter, (value) => {
      values.push(value);
    });

    counter.set(1);

    expect(values).toEqual([0, 1]);
    stop();
  });

  it('supports the deprecated store-array form', () => {
    const counter = atom(0);
    const label = atom('a');
    const stores = [counter, label] as const;
    const values: [number, string][] = [];
    const stop = effect(stores, (value, text) => {
      values.push([value, text]);
    });

    batch(() => {
      counter.set(1);
      label.set('b');
    });

    expect(values).toEqual([[0, 'a'], [1, 'b']]);
    stop();
  });
});
