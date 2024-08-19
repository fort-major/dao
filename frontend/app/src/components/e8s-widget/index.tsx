import { EIconKind, Icon } from "@components/icon";
import { MetricWidget } from "@components/metric-widget";
import { useBank } from "@store/bank";
import { pairToStr } from "@utils/encoding";
import { E8s } from "@utils/math";
import { IClass } from "@utils/types";
import { createMemo, Show } from "solid-js";

export enum EE8sKind {
  FMJ = "FMJ",
  ICP = "ICP",
  Storypoint = "Storypoint",
  Hour = "Hour",
  Reputation = "Reputation",
}

export interface IE8sWidgetProps extends IClass {
  minValue: E8s;
  maxValue?: E8s;
  kind: EE8sKind;
  white?: boolean;
  disallowEmptyTail?: boolean;
  showFMJExchangeRate?: boolean;
}

export function E8sWidget(props: IE8sWidgetProps) {
  const { exchangeRates } = useBank();

  const history = () =>
    props.showFMJExchangeRate
      ? exchangeRates[pairToStr({ from: props.kind, into: EE8sKind.FMJ })]
      : undefined;
  const rate = () => {
    const h = history();
    if (!h) return undefined;

    return h[0][1];
  };

  const fmjValue = createMemo(() => {
    const r = rate();
    if (!r) return undefined;

    const minFmj = props.minValue.mul(r);

    if (props.maxValue && !props.maxValue.isZero()) {
      const maxFmj = props.maxValue.mul(r);

      return `${minFmj.toString()} to ${minFmj.add(maxFmj).toString()}`;
    } else {
      return minFmj.toString();
    }
  });

  const iconKind = () =>
    props.kind === EE8sKind.FMJ
      ? EIconKind.FMJ
      : props.kind === EE8sKind.ICP
      ? EIconKind.ICP
      : props.kind === EE8sKind.Storypoint
      ? EIconKind.Storypoint
      : props.kind === EE8sKind.Reputation
      ? EIconKind.Reputation
      : EIconKind.Hour;

  const value = () => {
    if (props.maxValue && !props.maxValue.isZero()) {
      return `${props.minValue.toString()} to ${props.minValue
        .add(props.maxValue)
        .toString()}`;
    } else {
      return props.minValue.toString();
    }
  };

  return (
    <div class="flex flex-nowrap gap-2">
      <div
        class={`flex flex-nowrap items-center gap-1 ${
          props.class ? props.class : ""
        }`}
      >
        <Icon kind={iconKind()} />
        <MetricWidget
          white={props.white}
          primary={value()}
          secondary={props.kind}
        />
      </div>
      <Show when={fmjValue()}>
        <div class="flex opacity-40 flex-nowrap items-center text-xs font-light">
          (
          <MetricWidget
            white={props.white}
            primary={fmjValue()!}
            secondary={EE8sKind.FMJ}
            small
          />
          )
        </div>
      </Show>
    </div>
  );
}
