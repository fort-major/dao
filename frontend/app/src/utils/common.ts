import { Accessor, createSignal, onCleanup, Setter } from "solid-js";
import deepEqual from "deep-equal";
import { Principal } from "@dfinity/principal";
import { makeAvatarSvg } from "@fort-major/msq-shared";
import { COLORS } from "./colors";
import { bytesToHex, hexToBytes } from "./encoding";

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
  fetcher: (req: Req<ID>) => AsyncGenerator<RESP, RESP, undefined>,
  onSuccess: (resp: RESP, req: Req<ID>) => void,
  onErr: (reason: any, req: Req<ID>) => void
) => {
  let int: NodeJS.Timeout | undefined = undefined;
  const ids: ID[] = [];

  onCleanup(() => {
    clearTimeout(int);
  });

  const execute = async () => {
    const req = { ids };

    try {
      for await (let resp of fetcher(req)) {
        onSuccess(resp, req);
      }
    } catch (reason) {
      onErr(reason, req);
    }
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

export function avatarSrcFromPrincipal(id: Principal) {
  const svg = btoa(makeAvatarSvg(id, COLORS.black));

  return `data:image/svg+xml;base64,${svg}`;
}

export function createLocalStorageSignal<T extends unknown>(
  key: string
): [Accessor<T>, Setter<T>] {
  const storage = window.localStorage;
  const initialValue: T = JSON.parse(storage.getItem(key) ?? "{}").value;

  const [value, setValue] = createSignal<T>(initialValue);

  const newSetValue = (newValue: T | ((v: T) => T)): T => {
    const _val: T =
      typeof newValue === "function"
        ? // @ts-expect-error
          newValue(value())
        : newValue;

    setValue(_val as any);
    storage.setItem(key, JSON.stringify({ value: _val }));

    return _val;
  };

  return [value, newSetValue as Setter<T>];
}
