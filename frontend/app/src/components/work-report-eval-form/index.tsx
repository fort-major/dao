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
  const [comlexityLevel, setComplexityLevel] = createSignal(0);
  const [usefulnessLevel, setUsefulnessLevel] = createSignal(0);
  const [consumedTimeLevel, setConsumedTimeLevel] = createSignal(0);
  const [impactLevel, setImpactLevel] = createSignal(0);

  const resultingScore = () => {
    const usefulnessShare = E8s.fromBigIntBase(BigInt(usefulnessLevel() + 1));
    const complexityShare = E8s.fromBigIntBase(
      BigInt(comlexityLevel() + 1)
    ).mul(E8s.f0_5());
    const consumedTimeShare = E8s.fromBigIntBase(
      BigInt(consumedTimeLevel() + 1)
    ).mul(E8s.f0_5());

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

    impactShare = impactShare.mul(E8s.f0_5());

    const baseRewardShare = usefulnessShare
      .add(complexityShare)
      .add(consumedTimeShare);

    return impactShare.mul(baseRewardShare);
  };

  return (
    <div class="flex flex-col gap-8">
      <p class="font-semibold text-md">Evalute the Contribution</p>
      <div class="flex flex-col gap-2">
        <Title text="Complexity" />
        <p class="text-gray-140 text-xs">
          On a scale from 1 to 10, how hard would it be to complete this
          contribution?
        </p>
        <p class="text-gray-140 text-xs">
          1 - anyone could do it; 10 - I can't do it.
        </p>
        <Multiswitch
          states={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
          onChange={setComplexityLevel}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Title text="Consumed Time" />
        <p class="text-gray-140 text-xs">
          On a scale from 1 to 10, how time-consuming is this contribution?
        </p>
        <p class="text-gray-140 text-xs">
          1 - around 10 minutes; 10 - a full day.
        </p>
        <Multiswitch
          states={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
          onChange={setConsumedTimeLevel}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Title text="Potential Usefulness" />
        <p class="text-gray-140 text-xs">
          On a scale from 1 to 10, how useful is this contribution long-term?
        </p>
        <p class="text-gray-140 text-xs">
          1 - this won't matter next week; 10 - this will matter next year.
        </p>
        <Multiswitch
          states={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
          onChange={setUsefulnessLevel}
        />
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
