import { E8sWidget } from "@components/e8s-widget";
import { ExchangeRate } from "@components/exchange-rate";
import { QtyInput } from "@components/qty-input";
import { Select } from "@components/select";
import { TextInput } from "@components/text-input";
import { VotingInput } from "@components/voting-input";
import { VotingProgressBar } from "@components/voting-progress-bar";
import { VotingStatus } from "@components/voting-status";
import { VotingWidget } from "@components/voting-widget";
import { Principal } from "@dfinity/principal";
import { IVoting } from "@store/votings";
import { pairToStr } from "@utils/encoding";
import { E8s } from "@utils/math";
import { ONE_DAY_NS, ONE_HOUR_NS, ONE_MIN_NS, ONE_WEEK_NS } from "@utils/types";

const n = BigInt(Date.now()) * 1000000n;

export function TestPage() {
  return (
    <main class="flex flex-row justify-center">
      <section class="w-256 flex flex-col gap-4">
        <ExchangeRate
          editable
          pair={pairToStr({ from: "Storypoints", into: "ICP" })}
          rate={E8s.f0_1()}
        />
      </section>
    </main>
  );
}
