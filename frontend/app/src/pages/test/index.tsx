import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { ExchangeRate } from "@components/exchange-rate";
import { FromInput } from "@components/from-input";
import { PriceChart } from "@components/price-chart";
import { ProfileFull, ProfileMini } from "@components/profile/profile";
import { QtyInput } from "@components/qty-input";
import { Select } from "@components/select";
import { Task } from "@components/task";
import { TextInput } from "@components/text-input";
import { TransferSwapForm } from "@components/transfer-swap-form";
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
        <Task id={0n} />
      </section>
    </main>
  );
}
