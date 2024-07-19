import { EIconKind, Icon } from "@components/icon";
import { useAuth } from "@store/auth";
import { COLORS } from "@utils/colors";
import { ErrorCode, err } from "@utils/error";
import { E8s } from "@utils/math";
import { eventHandler } from "@utils/security";
import { Result } from "@utils/types";
import { Match, Switch, createSignal } from "solid-js";

export interface IVotingInputProps {
  kind: "binary" | "evaluation" | "satisfaction";
  value: E8s | null;
  onChange: (newValue: Result<E8s | null, E8s | null>) => void;
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
  const { disabled } = useAuth();

  const d = () => props.disabled || disabled();

  const downColor = () =>
    d()
      ? COLORS.gray[150]
      : !props.value
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.errorRed
      : COLORS.gray[150];

  const upColor = () =>
    d()
      ? COLORS.gray[150]
      : props.value?.toBool()
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.green
      : COLORS.gray[150];

  return (
    <div class="flex items-center gap-1 p-3">
      <Icon
        kind={EIconKind.ThumbDown}
        hoverColor={d() ? COLORS.gray[150] : COLORS.errorRed}
        color={downColor()}
        onClick={() => props.onChange(Result.Ok(null))}
        class={d() ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.ThumbUp}
        hoverColor={d() ? COLORS.gray[150] : COLORS.green}
        color={upColor()}
        onClick={() => props.onChange?.(Result.Ok(E8s.one()))}
        class={d() ? "" : "cursor-pointer"}
      />
    </div>
  );
}

function SatisfactionVotingInput(props: IVotingInputProps) {
  const { disabled } = useAuth();

  const d = () => props.disabled || disabled();

  const rejectColor = () =>
    d()
      ? COLORS.gray[150]
      : !props.value
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.errorRed
      : COLORS.gray[150];

  const verySadColor = () =>
    d()
      ? COLORS.gray[150]
      : props.value?.eq(E8s.f0_2())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.pink
      : COLORS.gray[150];

  const sadColor = () =>
    d()
      ? COLORS.gray[150]
      : props.value?.eq(E8s.f0_4())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.orange
      : COLORS.gray[150];

  const neutralColor = () =>
    d()
      ? COLORS.gray[150]
      : props.value?.eq(E8s.f0_6())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.gray[110]
      : COLORS.gray[150];

  const happyColor = () =>
    d()
      ? COLORS.gray[150]
      : props.value?.eq(E8s.f0_8())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.green
      : COLORS.gray[150];

  const veryHappyColor = () =>
    d()
      ? COLORS.gray[150]
      : props.value?.eq(E8s.one())
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.blue
      : COLORS.gray[150];

  return (
    <div class="flex items-center gap-1 p-3">
      <Icon
        kind={EIconKind.CancelCircle}
        hoverColor={d() ? COLORS.gray[150] : COLORS.errorRed}
        color={rejectColor()}
        onClick={() => props.onChange(Result.Ok(null))}
        class={d() ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceVerySad}
        hoverColor={d() ? COLORS.gray[150] : COLORS.pink}
        color={verySadColor()}
        onClick={() => props.onChange(Result.Ok(E8s.f0_2()))}
        class={d() ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceSad}
        hoverColor={d() ? COLORS.gray[150] : COLORS.orange}
        color={sadColor()}
        onClick={() => props.onChange(Result.Ok(E8s.f0_4()))}
        class={d() ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceNeutral}
        hoverColor={d() ? COLORS.gray[150] : COLORS.gray[110]}
        color={neutralColor()}
        onClick={() => props.onChange(Result.Ok(E8s.f0_6()))}
        class={d() ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceHappy}
        hoverColor={d() ? COLORS.gray[150] : COLORS.green}
        color={happyColor()}
        onClick={() => props.onChange(Result.Ok(E8s.f0_8()))}
        class={d() ? "" : "cursor-pointer"}
      />
      <Icon
        kind={EIconKind.FaceVeryHappy}
        hoverColor={d() ? COLORS.gray[150] : COLORS.blue}
        color={veryHappyColor()}
        onClick={() => props.onChange(Result.Ok(E8s.one()))}
        class={d() ? "" : "cursor-pointer"}
      />
    </div>
  );
}

function levelToStars(level: E8s): number {
  if (level.gt(E8s.f0_8())) {
    return 5;
  }

  if (level.gt(E8s.f0_6())) {
    return 4;
  }

  if (level.gt(E8s.f0_4())) {
    return 3;
  }

  if (level.gt(E8s.f0_2())) {
    return 2;
  }

  if (level.gt(E8s.zero())) {
    return 1;
  }

  return 0;
}

function EvaluationVotingInput(props: IVotingInputProps) {
  const { disabled } = useAuth();

  const d = () => props.disabled || disabled();

  const [hoveredStar, setHoveredStar] = createSignal<number | undefined>(
    undefined
  );

  const rejectColor = () =>
    d()
      ? COLORS.gray[150]
      : !props.value
      ? props.reset
        ? COLORS.gray[150]
        : COLORS.errorRed
      : COLORS.gray[150];

  const starColor = () => {
    if (d()) return COLORS.gray[150];

    if (props.reset) {
      const h = hoveredStar();

      if (!h) return COLORS.gray[150];

      return COLORS.yellow;
    } else if (props.value) {
      return COLORS.yellow;
    } else {
      return COLORS.gray[150];
    }
  };

  const starIcon = (idx: number) => {
    if (props.reset && !d()) {
      const h = hoveredStar();

      if (!h) return EIconKind.StarEmpty;

      return h >= idx ? EIconKind.StarFilled : EIconKind.StarEmpty;
    } else if (props.value) {
      const s = levelToStars(props.value);

      return s >= idx ? EIconKind.StarFilled : EIconKind.StarEmpty;
    } else {
      return EIconKind.StarEmpty;
    }
  };

  return (
    <div class="flex items-center gap-1 p-3">
      <Icon
        kind={EIconKind.CancelCircle}
        hoverColor={d() ? COLORS.gray[150] : COLORS.errorRed}
        color={rejectColor()}
        onClick={() => props.onChange(Result.Ok(null))}
        class={d() ? "" : "cursor-pointer"}
      />
      <div class="flex items-center">
        <Icon
          kind={starIcon(1)}
          color={starColor()}
          hoverColor={d() ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange(Result.Ok(E8s.f0_2()))}
          onMouseEnter={() => setHoveredStar(1)}
          onMouseLeave={setHoveredStar}
          class={d() ? "" : "cursor-pointer"}
        />
        <Icon
          kind={starIcon(2)}
          color={starColor()}
          hoverColor={d() ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange(Result.Ok(E8s.f0_4()))}
          onMouseEnter={() => setHoveredStar(2)}
          onMouseLeave={setHoveredStar}
          class={d() ? "" : "cursor-pointer"}
        />
        <Icon
          kind={starIcon(3)}
          color={starColor()}
          hoverColor={d() ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange(Result.Ok(E8s.f0_6()))}
          onMouseEnter={() => setHoveredStar(3)}
          onMouseLeave={setHoveredStar}
          class={d() ? "" : "cursor-pointer"}
        />
        <Icon
          kind={starIcon(4)}
          color={starColor()}
          hoverColor={d() ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange(Result.Ok(E8s.f0_8()))}
          onMouseEnter={() => setHoveredStar(4)}
          onMouseLeave={setHoveredStar}
          class={d() ? "" : "cursor-pointer"}
        />
        <Icon
          kind={starIcon(5)}
          color={starColor()}
          hoverColor={d() ? COLORS.gray[150] : COLORS.yellow}
          onClick={() => props.onChange(Result.Ok(E8s.one()))}
          onMouseEnter={() => setHoveredStar(5)}
          onMouseLeave={setHoveredStar}
          class={d() ? "" : "cursor-pointer"}
        />
      </div>
    </div>
  );
}
