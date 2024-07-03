import {
  ONE_DAY_NS,
  ONE_HOUR_NS,
  ONE_MIN_NS,
  ONE_SEC_NS,
  TTimestamp,
} from "@utils/types";
import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

export interface ICountdownProps {
  timestampNs: TTimestamp;
  durationNs: TTimestamp;
  elapsedText: string;
}

function nowNs() {
  return BigInt(Date.now()) * 1000000n;
}

export function Countdown(props: ICountdownProps) {
  const [now, setNow] = createSignal(nowNs());
  const [int, setInt] = createSignal<NodeJS.Timeout | undefined>(undefined);

  onMount(() => {
    setInt(setInterval(() => setNow(nowNs()), 1000));
  });

  onCleanup(() => {
    clearInterval(int());
  });

  const nsLeft = createMemo(() => {
    const dif = now() - props.timestampNs;

    if (dif < props.durationNs) {
      return props.durationNs - dif;
    } else {
      return 0n;
    }
  });

  const days = () => nsLeft() / ONE_DAY_NS;
  const hours = () => (nsLeft() / ONE_HOUR_NS) % 24n;
  const mins = () => (nsLeft() / ONE_MIN_NS) % 60n;
  const secs = () => (nsLeft() / ONE_SEC_NS) % 60n;

  return (
    <div class="flex gap-1 text-gray-150 font-mono font-thin text-sm leading-3 top-[1px] relative">
      <Show when={days() > 0n}>
        <span>{days().toString()}d</span>
      </Show>
      <Show when={days() > 0n || hours() > 0n}>
        <span>{hours().toString()}h</span>
      </Show>
      <Show when={hours() > 0n || mins() > 0n}>
        <span>{mins().toString()}m</span>
      </Show>
      <Show when={secs() > 0n || mins() > 0n}>
        <span>{secs().toString()}s</span>
      </Show>
      <Show
        when={days() == 0n && hours() == 0n && mins() == 0n && secs() == 0n}
      >
        {props.elapsedText}
      </Show>
    </div>
  );
}
