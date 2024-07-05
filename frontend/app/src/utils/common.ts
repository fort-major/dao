import { createSignal, onCleanup } from "solid-js";
import deepEqual from "deep-equal";

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

type Req<ID> = { ids: ID[] };
type Resp<T> = { entries: T[] };

export const debouncedBatchFetch = <ID, T, RESP extends Resp<T>>(
  fetcher: (req: Req<ID>) => Promise<RESP>,
  onSuccess: (resp: RESP, req: Req<ID>) => void,
  onErr: (reason: any, req: Req<ID>) => void
) => {
  let int: NodeJS.Timeout | undefined = undefined;
  const ids: ID[] = [];

  onCleanup(() => {
    clearTimeout(int);
  });

  const execute = () => {
    const req = { ids };

    fetcher(req)
      .then((resp) => onSuccess(resp, req))
      .catch((reason) => onErr(reason, req));
  };

  return (req: { ids: ID[] }) => {
    pushAllDedup(ids, req.ids);

    clearTimeout(int);
    int = setTimeout(execute, 100);
  };
};

export function pushAllDedup<T>(dest: T[], src: T[]): void {
  for (let item of src) {
    const dup = dest.find((it) => deepEqual(it, item));

    if (!dup) {
      dest.push(item);
    }
  }
}
