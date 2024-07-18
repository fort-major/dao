import { DecisionTopicSet } from "@/declarations/votings/votings.did";
import { Btn } from "@components/btn";
import { DecisionTopic } from "@components/decision-topic";
import { EIconKind } from "@components/icon";
import { PrincipalDropdown } from "@components/principal-dropdown";
import { ProfileMini } from "@components/profile/profile";
import { Title } from "@components/title";
import { Principal } from "@dfinity/principal";
import { useAuth } from "@store/auth";
import { useHumans } from "@store/humans";
import { DecisionTopicId } from "@store/tasks";
import { useVotings } from "@store/votings";
import { COLORS } from "@utils/colors";
import { err, ErrorCode, logInfo } from "@utils/error";
import { Result } from "@utils/types";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  Show,
} from "solid-js";

const GENERAL_TOPIC_ID: DecisionTopicId = 0;
const DEVELOPMENT_TOPIC_ID: DecisionTopicId = 1;
const MARKETING_TOPIC_ID: DecisionTopicId = 2;
const DESIGN_TOPIC_ID: DecisionTopicId = 3;
const DOCUMENTATION_TOPIC_ID: DecisionTopicId = 4;
const TESTING_TOPIC_ID: DecisionTopicId = 5;

const allTopics = [
  GENERAL_TOPIC_ID,
  DEVELOPMENT_TOPIC_ID,
  MARKETING_TOPIC_ID,
  DESIGN_TOPIC_ID,
  DOCUMENTATION_TOPIC_ID,
  TESTING_TOPIC_ID,
];

function makeOrTopicSet(topics: DecisionTopicId[]): DecisionTopicSet {
  if (topics.length == 0)
    err(ErrorCode.UNREACHEABLE, "At least one topic should be provided");

  let set: DecisionTopicSet = { It: topics[0] };

  for (let i = 1; i < topics.length; i++) {
    set = { Or: [set, { It: topics[i] }] };
  }

  return set;
}

function unwrapOrTopicSet(set: DecisionTopicSet): DecisionTopicId[] {
  if ("It" in set) {
    return [set.It];
  }

  if ("Or" in set) {
    return [...unwrapOrTopicSet(set.Or[0]), ...unwrapOrTopicSet(set.Or[1])];
  }

  err(ErrorCode.UNREACHEABLE, "AND and NOT topicset rules not supported yet");
}

export function FollowForm() {
  const {
    followersOf,
    fetchFollowersOf,
    followeesOf,
    fetchFolloweesOf,
    follow,
    unfollow,
    decisionTopics,
  } = useVotings();
  const { totals } = useHumans();
  const { identity, isAuthorized, disable, enable } = useAuth();

  const [topicset, setTopicset] = createSignal<DecisionTopicId[]>([]);
  const [followee, setFollowee] = createSignal<Result<string, string>>(
    Result.Err("")
  );

  const isErr = () => topicset().length === 0 || followee().isErr();
  const me = () => identity()?.getPrincipal();

  createEffect(
    on(isAuthorized, (val) => {
      if (val) {
        fetchFolloweesOf([me()!]);
        fetchFollowersOf([me()!]);
      }
    })
  );

  const myFollowees = createMemo(() => {
    if (!me()) return undefined;
    const f = followeesOf[me()!.toText()];

    return f ? Object.entries(f) : undefined;
  });

  const myFollowers = createMemo(() => {
    if (!me()) return undefined;
    const f = followersOf[me()!.toText()];

    return f ? Object.values(f.followers) : undefined;
  });

  const handleClickTopic = (id: DecisionTopicId) => {
    setTopicset((v) => {
      const idx = v.indexOf(id);

      if (idx === -1) {
        return [...v, id];
      }

      v.splice(idx, 1);

      return [...v];
    });
  };

  const handleFollow = async () => {
    if (!me()) return;

    if (isErr()) return;
    const id = followee().unwrapOk();

    disable();
    await follow(Principal.fromText(id), makeOrTopicSet(topicset()));
    await fetchFolloweesOf([me()!]);
    enable();

    logInfo("Followed!");
  };

  const handleUnfollow = async (id: string) => {
    const agreed = confirm(`Are you sure you want to unfollow ${id}?`);
    if (!agreed) return;

    disable();
    await unfollow(Principal.fromText(id));
    await fetchFolloweesOf([me()!]);
    enable();

    logInfo("Unfollowed!");
  };

  return (
    <div class="flex flex-col gap-4">
      <Show when={myFollowers() && myFollowers()!.length > 0}>
        <div class="flex flex-col gap-2">
          <Title text="My Followers" />
          <div class="flex flex-col gap-1">
            <For each={myFollowers()}>
              {(it) => (
                <div class="flex gap-2 items-center justify-between">
                  <ProfileMini id={it.id} />
                  <div class="flex flex-wrap gap-1">
                    <For each={unwrapOrTopicSet(it.topicset)}>
                      {(topicId) => <DecisionTopic id={topicId} />}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
      <Show when={myFollowees() && myFollowees()!.length > 0}>
        <div class="flex flex-col gap-2">
          <Title text="I Follow" />
          <div class="flex flex-col gap-1">
            <For each={myFollowees()}>
              {([id, topicset]) => (
                <div class="flex gap-2 items-center justify-between">
                  <ProfileMini id={Principal.from(id)} />
                  <div class="flex flex-wrap gap-1">
                    <For each={unwrapOrTopicSet(topicset)}>
                      {(topicId) => <DecisionTopic id={topicId} />}
                    </For>
                  </div>
                  <Btn
                    icon={EIconKind.Minus}
                    iconColor={COLORS.errorRed}
                    onClick={() => handleUnfollow(id)}
                  />
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
      <div class="flex flex-col gap-2">
        <Title text="Topics To Follow" required />
        <div class="flex flex-wrap gap-1">
          <For each={allTopics}>
            {(id) => (
              <DecisionTopic
                id={id}
                selected={topicset().includes(id)}
                onSelect={() => handleClickTopic(id)}
              />
            )}
          </For>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <Title text="Followee" required />
        <PrincipalDropdown
          listed={totals().teamMembers.filter(
            (it) => !me() || it.compareTo(me()!) !== "eq"
          )}
          value={followee().unwrap()}
          onChange={setFollowee}
        />
      </div>
      <Btn text="Follow" disabled={isErr()} onClick={handleFollow} />
    </div>
  );
}
