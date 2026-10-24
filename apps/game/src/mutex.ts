/** In-process FIFO lock per key (single game instance). */
export function createKeyedMutex() {
  const tails = new Map<string, Promise<void>>();
  return async function run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = tails.get(key) ?? Promise.resolve();
    const result = prev.then(fn);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    tails.set(key, tail);
    try {
      return await result;
    } finally {
      if (tails.get(key) === tail) tails.delete(key);
    }
  };
}
export type KeyedMutex = ReturnType<typeof createKeyedMutex>;
