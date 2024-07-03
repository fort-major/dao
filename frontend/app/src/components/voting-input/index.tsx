import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";
import { ErrorCode, err } from "@utils/error";
import { E8s } from "@utils/math";
import { eventHandler } from "@utils/security";
import { Match, Switch, createSignal } from "solid-js";

export interface IVotingInputProps {
  kind: "binary" | "evaluation" | "satisfaction";
  defaultValue?: E8s | null;
  onChange?: (newValue: E8s | null) => void;
  reset?: boolean;
  disabled?: boolean;
}

export function VotingInput(props: IVotingInputProps) {
  return (
    <Switch>
      <Match when={props.kind == "binary"}>
        <BinaryVotingInput {...props} />
      </Match>
      <Match when={props.kind == "satisfaction"}>
        <SatisfactionVotingInput {...props} />
      </Match>
      <Match when={props.kind == "evaluation"}>
        <EvaluationVotingInput {...props} />
      </Match>
    </Switch>
  );
}

function BinaryVotingInput(props: IVotingInputProps) {
  const downColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue === null
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.errorRed
      : COLORS.gray[150];

  const upColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue?.toBool()
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.green
      : COLORS.gray[150];

  return (
    <div class="flex items-center gap-1 p-3">
      <Icon
        kind={EIconKind.ThumbDown}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.errorRed}
        color={downColor()}
        onClick={() => props.onChange?.(null)}
        class={props.disabled ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.ThumbUp}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.green}
        color={upColor()}
        onClick={() => props.onChange?.(E8s.one())}
        class={props.disabled ? "" : "cursor-pointer"}
      />
    </div>
  );
}

function SatisfactionVotingInput(props: IVotingInputProps) {
  const rejectColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue === null
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.errorRed
      : COLORS.gray[150];

  const verySadColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue?.eq(E8s.f0_2())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.pink
      : COLORS.gray[150];

  const sadColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue?.eq(E8s.f0_4())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.orange
      : COLORS.gray[150];

  const neutralColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue?.eq(E8s.f0_6())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.gray[110]
      : COLORS.gray[150];

  const happyColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue?.eq(E8s.f0_8())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.green
      : COLORS.gray[150];

  const veryHappyColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue?.eq(E8s.one())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.blue
      : COLORS.gray[150];

  return (
    <div class="flex items-center gap-1 p-3">
      <Icon
        kind={EIconKind.CancelCircle}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.errorRed}
        color={rejectColor()}
        onClick={() => props.onChange?.(null)}
        class={props.disabled ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceVerySad}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.pink}
        color={verySadColor()}
        onClick={() => props.onChange?.(E8s.f0_2())}
        class={props.disabled ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceSad}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.orange}
        color={sadColor()}
        onClick={() => props.onChange?.(E8s.f0_4())}
        class={props.disabled ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceNeutral}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.gray[110]}
        color={neutralColor()}
        onClick={() => props.onChange?.(E8s.f0_6())}
        class={props.disabled ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceHappy}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.green}
        color={happyColor()}
        onClick={() => props.onChange?.(E8s.f0_8())}
        class={props.disabled ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceVeryHappy}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.blue}
        color={veryHappyColor()}
        onClick={() => props.onChange?.(E8s.one())}
        class={props.disabled ? "" : "cursor-pointer"}
      />
    </div>
  );
}

function levelToStars(level: E8s): number {
  if (level.ge(E8s.one())) {
    return 5;
  }

  if (level.ge(E8s.f0_8())) {
    return 4;
  }

  if (level.ge(E8s.f0_6())) {
    return 3;
  }

  if (level.ge(E8s.f0_4())) {
    return 2;
  }

  if (level.ge(E8s.f0_2())) {
    return 1;
  }

  err(ErrorCode.UNREACHEABLE, "Invalid approval level");
}

function EvaluationVotingInput(props: IVotingInputProps) {
  const [hoveredStar, setHoveredStar] = createSignal<number | undefined>(
    undefined
  );

  const rejectColor = () =>
    props.disabled
      ? COLORS.gray[150]
      : props.defaultValue === null
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.errorRed
      : COLORS.gray[150];

  const starColor = () => {
    if (props.disabled) return COLORS.gray[150];

    if (props.reset) {
      const h = hoveredStar();

      if (!h) return COLORS.gray[150];

      return COLORS.yellow;
    } else if (props.defaultValue) {
      return COLORS.yellow;
    } else {
      return COLORS.gray[150];
    }
  };

  const starIcon = (idx: number) => {
    if (props.reset && !props.disabled) {
      const h = hoveredStar();

      if (!h) return EIconKind.StarEmpty;

      return h >= idx ? EIconKind.StarFilled : EIconKind.StarEmpty;
    } else if (props.defaultValue) {
      const s = levelToStars(props.defaultValue);

      return s >= idx ? EIconKind.StarFilled : EIconKind.StarEmpty;
    } else {
      return EIconKind.StarEmpty;
    }
  };

  return (
    <div class="flex items-center gap-1 p-3">
      <Icon
        kind={EIconKind.CancelCircle}
        hoverColor={props.disabled ? COLORS.gray[150] : COLORS.errorRed}
        color={rejectColor()}
        onClick={() => props.onChange?.(null)}
        class={props.disabled ? "" : "cursor-pointer"}
      />
      <div class="flex items-center">
        <Icon
          kind={starIcon(1)}
          color={starColor()}
          hoverColor={props.disabled ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange?.(E8s.f0_2())}
          onMouseEnter={() => setHoveredStar(1)}
          onMouseLeave={setHoveredStar}
          class={props.disabled ? "" : "cursor-pointer"}
        />
        <Icon
          kind={starIcon(2)}
          color={starColor()}
          hoverColor={props.disabled ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange?.(E8s.f0_4())}
          onMouseEnter={() => setHoveredStar(2)}
          onMouseLeave={setHoveredStar}
          class={props.disabled ? "" : "cursor-pointer"}
        />
        <Icon
          kind={starIcon(3)}
          color={starColor()}
          hoverColor={props.disabled ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange?.(E8s.f0_6())}
          onMouseEnter={() => setHoveredStar(3)}
          onMouseLeave={setHoveredStar}
          class={props.disabled ? "" : "cursor-pointer"}
        />
        <Icon
          kind={starIcon(4)}
          color={starColor()}
          hoverColor={props.disabled ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange?.(E8s.f0_8())}
          onMouseEnter={() => setHoveredStar(4)}
          onMouseLeave={setHoveredStar}
          class={props.disabled ? "" : "cursor-pointer"}
        />
        <Icon
          kind={starIcon(5)}
          color={starColor()}
          hoverColor={props.disabled ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange?.(E8s.one())}
          onMouseEnter={() => setHoveredStar(5)}
          onMouseLeave={setHoveredStar}
          class={props.disabled ? "" : "cursor-pointer"}
        />
      </div>
    </div>
  );
}
