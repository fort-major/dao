import { createSignal, onCleanup } from "solid-js";

export const debounce = (cb: (...args: any[]) => void, timeoutMs: number) => {
  const [int, setInt] = createSignal<NodeJS.Timeout | undefined>();

  onCleanup(() => {
    clearTimeout(int());
  });

  return (...args: [any]) => {
    setInt((i) => {
      clearTimeout(i);
      return setTimeout(() => cb(args), timeoutMs);
    });
  };
};
