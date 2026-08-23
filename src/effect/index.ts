import { computed } from '../core/index.ts';
import type { Store, StoreOptions } from '../core/index.js';

type TrackingGetter = <T>(store: Store<T>) => T;
type StoreValue<S extends Store<any>> = S extends Store<infer T> ? T : never;
type StoreValues<Stores extends readonly Store<any>[]> = {
  -readonly [Index in keyof Stores]: StoreValue<Stores[Index]>;
};

/** @deprecated Use effect() with a tracking getter instead. */
export function effect<Source extends Store<any>, T>(
  store: Source,
  fn: (value: StoreValue<Source>) => T
): () => void;

/** @deprecated Use effect() with a tracking getter instead. */
export function effect<Sources extends readonly Store<any>[], T>(
  stores: readonly [...Sources],
  fn: (...values: StoreValues<Sources>) => T
): () => void;
/**
 * Runs a computation immediately and whenever its tracked stores change.
 * Returns a function that stops the effect.
 */
export function effect<T>(
  fn: (track: TrackingGetter, prevValue?: T) => T,
  options?: StoreOptions<T>
): () => void;
export function effect(first: any, second?: any): () => void {
  return computed(first, second).subscribe(() => {});
}
