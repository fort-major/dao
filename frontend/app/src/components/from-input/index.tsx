import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { QtyInput } from "@components/qty-input";
import { Select } from "@components/select";
import { E8s } from "@utils/math";
import { eventHandler } from "@utils/security";
import { createEffect, createSignal } from "solid-js";

export interface IFromInputProps {
  balance: E8s;
  kind: EE8sKind;
  onChange?: (kind: EE8sKind, amount: E8s | undefined) => void;
}

export function FromInput(props: IFromInputProps) {
  const [amount, setAmount] = createSignal<E8s | undefined>();

  const setter: { set?: (v: string) => void } = {};

  const handleMaxClick = eventHandler(() => {
    setter.set!(props.balance.toString());
  });

  const handleAmountChange = (a: E8s | undefined) => {
    setAmount(a);
    props.onChange?.(props.kind, a);
  };

  const handleHandleKindChange = (kind: string) => {
    setter.set!("0");
    props.onChange?.(kind as EE8sKind, E8s.zero());
  };

  return (
    <div class="flex gap-2 items-center justify-between">
      <div class="flex flex-col gap-2 justify-between">
        <Select
          values={[
            EE8sKind.Hours,
            EE8sKind.Storypoints,
            EE8sKind.FMJ,
            EE8sKind.ICP,
          ]}
          defaultValue={props.kind}
          onChange={handleHandleKindChange}
        />
        <span class="flex px-2">
          <E8sWidget value={props.balance} kind={props.kind} />
        </span>
      </div>
      <div class="flex flex-col gap-2 justify-between">
        <QtyInput
          symbol={props.kind}
          defaultValue={amount()}
          onChange={handleAmountChange}
          setter={setter}
        />
        <p
          class="flex justify-end px-2 text-darkBlue underline cursor-pointer"
          onClick={handleMaxClick}
        >
          max
        </p>
      </div>
    </div>
  );
}
