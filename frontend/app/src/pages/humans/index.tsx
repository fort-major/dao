import { For, createEffect } from "solid-js";
import { IProfile, useHumans } from "../../store/humans";
import { ProfileMini } from "../../components/profile/profile";
import { timestampToStr } from "../../utils/encoding";
import { E8s } from "../../utils/math";
import { ONE_WEEK_NS } from "../../utils/types";

export function HumansPage() {
  const { fetchProfileIds, fetchProfiles, profiles, totals, fetchTotals } =
    useHumans();

  createEffect(async () => {
    if (totals()[0].eq(E8s.one())) {
      fetchTotals();
    }

    if (Object.keys(profiles).length === 0) {
      await fetchProfileIds();
      await fetchProfiles();
    }
  });

  const getProfiles = () => {
    return Object.values(profiles);
  };

  const profile = (p: IProfile, totalHours: E8s, totalStorypoints: E8s) => {
    const rep = p.earned_hours
      .add(p.earned_storypoints)
      .div(totalHours.add(totalStorypoints));

    let commitmentStr = "N/A";

    if (p.employment) {
      const nowNs = BigInt(Date.now()) * 1000_000n;
      const weeksSinceEmployed =
        (nowNs - p.employment.employed_at) / ONE_WEEK_NS;

      if (weeksSinceEmployed >= 1) {
        const hours_a_week = p.employment.hours_earned_during_employment.div(
          E8s.fromNumber(weeksSinceEmployed)
        );
        const commitment = hours_a_week.div(
          p.employment.hours_a_week_commitment
        );

        commitmentStr = commitment.toString();
      }
    }

    return (
      <>
        <ProfileMini profile={p} />
        <p>{rep.toString()}</p>
        <p>{p.earned_hours.toString()}</p>
        <p>{p.earned_storypoints.toString()}</p>
        <p>{timestampToStr(p.registered_at)}</p>
        <p>{commitmentStr}</p>
      </>
    );
  };

  return (
    <main>
      <h2>Humans</h2>
      <div>
        <div>
          <h4>{totals()[0].toString()}</h4>
          <p>total hours spent</p>
        </div>
        <div>
          <h4>{totals()[1].toString()}</h4>
          <p>total storypoints earned</p>
        </div>
      </div>
      <div class="grid grid-cols-5">
        <p>Human</p>
        <p>Reputation %</p>
        <p>Hours spent</p>
        <p>Storypoints earned</p>
        <p>Registered at</p>
        <p>Commitment</p>
        <For each={getProfiles()}>
          {(p) => profile(p, totals()[0], totals()[1])}
        </For>
      </div>
    </main>
  );
}
