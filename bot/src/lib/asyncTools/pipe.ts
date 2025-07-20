export function pipe<T>(): {
  submit: (t: T) => void;
  generator: () => AsyncIterableIterator<T>;
} {
  const messages: T[] = [];
  let resolveNext: ((value: void) => void) | null = null;

  function submit(t: T) {
    messages.push(t);
    if (resolveNext) {
      resolveNext();
      resolveNext = null;
    }
  }

  async function* generator(): AsyncIterableIterator<T> {
    while (true) {
      if (messages.length > 0) {
        const msg = messages.shift();
        if (msg !== undefined) {
          yield msg;
        }
      } else {
        const p = Promise.withResolvers();
        resolveNext = p.resolve;
        await p.promise;
      }
    }
  }

  return { submit, generator };
}
