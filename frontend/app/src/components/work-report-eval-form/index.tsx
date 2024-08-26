import { Btn } from "@components/btn";
import { EIconKind } from "@components/icon";
import { Multiswitch } from "@components/multiswitch";
import { Slider } from "@components/slider";
import { Title } from "@components/title";
import { COLORS } from "@utils/colors";
import { E8s } from "@utils/math";
import { createEffect, createSignal } from "solid-js";

export interface IWorkReportEvalFormProps {
  defaultScore?: E8s;
  onSubmit: (score: E8s | null) => void;
}

export const WorkReportEvalForm = (props: IWorkReportEvalFormProps) => {
  const [comlexity, setComplexity] = createSignal(E8s.zero());
  const [usefulness, setUsefulness] = createSignal(E8s.zero());
  const [impactLevel, setImpactLevel] = createSignal(0);

  const resultingScore = () => {
    const complexityShare = comlexity().mul(E8s.fromBigIntBase(4n));
    const usefulnessShare = usefulness().mul(E8s.fromBigIntBase(6n));

    let impactShare: E8s;
    switch (impactLevel()) {
      case 0: {
        impactShare = E8s.one();
        break;
      }
      case 1: {
        impactShare = E8s.fromBigIntBase(2n);
        break;
      }
      case 2: {
        impactShare = E8s.fromBigIntBase(5n);
        break;
      }
      case 3: {
        impactShare = E8s.fromBigIntBase(10n);
        break;
      }
      default: {
        impactShare = E8s.zero();
      }
    }

    return impactShare.mul(complexityShare.add(usefulnessShare));
  };

  return (
    <div class="flex flex-col gap-8">
      <p class="font-semibold text-md">Evalute the Contribution</p>
      <div class="flex flex-col gap-2">
        <Title text="Complexity" />
        <p class="text-gray-140 text-xs">
          How much effort does the contributor put into their work? How hard was
          it in your opinion?
        </p>
        <Slider min="Easy" max="Hard" onChange={setComplexity} />
      </div>
      <div class="flex flex-col gap-2">
        <Title text="Potential Usefulness" />
        <p class="text-gray-140 text-xs">
          How useful is this contribution long-term? Will it matter by the end
          of the next year?
        </p>
        <Slider min="Not useful" max="Very useful" onChange={setUsefulness} />
      </div>
      <div class="flex flex-col gap-2">
        <Title text="Immediate Result Impact" />
        <p class="text-gray-140 text-xs">
          How impactful is the achieved result? How many people are affected
          right now?
        </p>
        <Multiswitch
          states={["Few", "Tens", "Hundreds", "Thousands"]}
          onChange={setImpactLevel}
        />
      </div>
      <div class="flex justify-between items-baseline">
        <div class="flex items-baseline gap-1">
          <p class="font-semibold text-xl italic">
            {resultingScore().toPrecision(2)}
          </p>
          <p class="text-sm">Storypoints</p>
        </div>
        <div class="flex gap-1">
          <Btn
            text={props.defaultScore ? "Update score" : "Submit score"}
            onClick={() => props.onSubmit(resultingScore())}
            icon={EIconKind.CheckRect}
            iconColor={COLORS.green}
          />
          <Btn
            text="Mark as spam"
            icon={EIconKind.CancelCircle}
            iconColor={COLORS.errorRed}
            onClick={() => props.onSubmit(null)}
          />
        </div>
      </div>
    </div>
  );
};
