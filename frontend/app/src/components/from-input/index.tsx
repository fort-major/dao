import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { QtyInput } from "@components/qty-input";
import { Select } from "@components/select";
import { E8s } from "@utils/math";
import { eventHandler } from "@utils/security";
import { Result } from "@utils/types";

export interface IFromInputProps {
  balance: E8s;
  amount: E8s;
  kind: EE8sKind;
  onKindChange: (k: Result<EE8sKind, EE8sKind>) => void;
  onAmountChange: (a: Result<E8s, E8s>) => void;
}

export function FromInput(props: IFromInputProps) {
  const handleMaxClick = eventHandler(() => {
    props.onAmountChange(Result.Ok(props.balance));
  });

  const handleHandleKindChange = (kind: Result<string, string>) => {
    props.onKindChange(kind as Result<EE8sKind, EE8sKind>);
    props.onAmountChange(Result.Ok(E8s.zero()));
  };

  return (
    <div class="flex gap-2 items-center justify-between">
      <div class="flex flex-col gap-2 justify-between">
        <Select
          possibleValues={[
            EE8sKind.Hour,
            EE8sKind.Storypoint,
            EE8sKind.FMJ,
            EE8sKind.ICP,
          ]}
          value={props.kind}
          onChange={handleHandleKindChange}
        />
        <span class="flex px-2">
          <E8sWidget minValue={props.balance} kind={props.kind} />
        </span>
      </div>
      <div class="flex flex-col gap-2 justify-between">
        <QtyInput
          symbol={props.kind}
          value={props.amount}
          onChange={props.onAmountChange}
          validations={[{ max: props.balance }]}
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
