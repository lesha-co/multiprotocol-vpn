import { pipe } from "./pipe.ts";

type Key = string | number;

export type Consumer<T, Meta> = (
  messages: () => AsyncIterableIterator<T>,
  meta: Meta,
) => Promise<void>;

export async function classifier<T, Meta>(
  source: () => AsyncIterableIterator<T>,
  getKey: (t: T) => Key,
  getMeta: (t: T) => Meta,
  consumer: Consumer<T, Meta>,
) {
  const sinks: Record<Key, (t: T) => void> = {};
  const promises: Promise<void>[] = [];
  for await (const item of source()) {
    const key = getKey(item);
    if (sinks[key] === undefined) {
      let { submit, generator } = pipe<T>();
      sinks[key] = submit;
      let meta = getMeta(item);
      promises.push(consumer(generator, meta));
    }
    sinks[key](item);
  }
  await Promise.allSettled(promises);
}
