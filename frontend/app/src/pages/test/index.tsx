import { VotingInput } from "@components/voting-input";
import { VotingProgressBar } from "@components/voting-progress-bar";
import { VotingStatus } from "@components/voting-status";
import { VotingWidget } from "@components/voting-widget";
import { Principal } from "@dfinity/principal";
import { IVoting } from "@store/votings";
import { E8s } from "@utils/math";
import { ONE_DAY_NS, ONE_HOUR_NS, ONE_MIN_NS, ONE_WEEK_NS } from "@utils/types";

const n = BigInt(Date.now()) * 1000000n;

export function TestPage() {
  return (
    <main class="flex flex-row justify-center">
      <section class="w-256 flex flex-col gap-4">
        <VotingWidget
          id="1"
          optionIdx={0}
          createdAt={n}
          durationNs={ONE_MIN_NS * 2n}
          totalSupply={E8s.fromBigIntBase(1000n)}
          totalVoted={E8s.fromBigIntBase(150n)}
          quorum={E8s.fromBigIntBase(200n)}
          finishEarly={E8s.fromBigIntBase(800n)}
          myRep={E8s.fromBigIntBase(40n)}
          myVote={E8s.f0_4()}
          stage={{ InProgress: null }}
          kind="evaluation"
        />
      </section>
    </main>
  );
}
