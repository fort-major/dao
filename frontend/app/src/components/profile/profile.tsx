import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
} from "solid-js";
import { IClass, ONE_WEEK_NS, Result } from "../../utils/types";
import { Avatar } from "../avatar";
import { Principal } from "@dfinity/principal";
import { useHumans } from "../../store/humans";
import { COLORS } from "@utils/colors";
import { Title } from "@components/title";
import { MetricWidget } from "@components/metric-widget";
import {
  debugStringify,
  decodeVotingId,
  encodeVotingId,
  timestampToDMStr,
  timestampToYearStr,
} from "@utils/encoding";
import { nowNs } from "@components/countdown";
import { E8s } from "@utils/math";
import { EIconKind, Icon } from "@components/icon";
import { TextInput } from "@components/text-input";
import { Btn } from "@components/btn";
import { useAuth } from "@store/auth";
import { TVotingIdStr, useVotings } from "@store/votings";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { avatarSrcFromPrincipal } from "@utils/common";
import { ComingSoonText } from "@components/coming-soon-text";
import { VotingId } from "@/declarations/votings/votings.did";
import { VotingWidget } from "@components/voting-widget";
import { ErrorCode, logErr, logInfo } from "@utils/error";
import { useNavigate } from "@solidjs/router";
import { ROOT } from "@/routes";

export interface IProfileProps extends IClass {
  id?: Principal;
  me?: boolean;
  avatarSize?: "sm" | "md" | "lg";
}

export function ProfileFull(props: IProfileProps) {
  const { profiles, reputation, totals, fetchProfiles, meIsTeamMember } =
    useHumans();
  const {
    editMyProfile,
    myBalance,
    isReadyToFetch,
    disable,
    enable,
    disabled,
    deauthorize,
  } = useAuth();
  const {
    createHumansEmployVoting,
    createHumansUnemployVoting,
    votings,
    fetchVotings,
    followersOf,
    fetchFollowersOf,
    followeesOf,
    fetchFolloweesOf,
  } = useVotings();
  const navigate = useNavigate();

  const [newName, setNewName] = createSignal<Result<string, string>>(
    Result.Ok("Anonymous")
  );
  const [edited, setEdited] = createSignal(false);

  const profile = () => (props.id ? profiles[props.id.toText()] : undefined);
  const isTeamMember = () => !!profile()?.employment;
  const rep = () => (props.id ? reputation[props.id.toText()] : undefined);
  const followers = createMemo(() => {
    if (!props.id) return [];
    const f = followersOf[props.id.toText()];

    if (!f) return [];

    return f.followers.map((it) => it.id);
  });
  const followees = createMemo(() => {
    if (!props.id) return [];
    const f = followeesOf[props.id.toText()];

    if (!f) return [];

    return Object.keys(f).map((it) => Principal.fromText(it));
  });

  const votingId = (): TVotingIdStr | undefined =>
    props.id
      ? isTeamMember()
        ? encodeVotingId({ HumansUnemploy: props.id })
        : encodeVotingId({ HumansEmploy: props.id })
      : undefined;

  const voting = () => {
    const id = votingId();
    if (!id) return undefined;

    return votings[id];
  };

  createEffect(() => {
    const id = votingId();

    if (isReadyToFetch() && id) {
      fetchVotings([decodeVotingId(id)]);
    }
  });

  createEffect(
    on(isReadyToFetch, (ready) => {
      if (ready && props.id) {
        fetchFollowersOf([props.id]);
        fetchFolloweesOf([props.id]);
      }
    })
  );

  const evr = createMemo(() => {
    const p = profile();

    if (!p || !p.employment) return undefined;

    const now = nowNs();
    const employmentDurationNs = now - p.employment.employed_at;

    if (employmentDurationNs < 0n) return undefined;

    const employmentDurationWeeks = E8s.fromBigIntBase(
      employmentDurationNs
    ).div(E8s.fromBigIntBase(ONE_WEEK_NS));
    const expectedEarnedHours = p.employment.hours_a_week_commitment.mul(
      employmentDurationWeeks
    );

    return p.employment.hours_earned_during_employment.div(expectedEarnedHours);
  });

  createEffect(() => {
    if (!profile() && props.id && isReadyToFetch()) fetchProfiles([props.id]);
  });

  const handleEditClick = () => {
    setEdited(true);
  };

  const handleNameEdit = (newName: Result<string, string>) => {
    setNewName(newName);
  };

  const canUpdateName = () => !disabled() && newName().isOk();

  const handleUpdateName = async () => {
    disable();

    await editMyProfile(newName()!.unwrapOk());
    setEdited(false);
    await fetchProfiles([props.id!]);

    enable();
  };

  const handleProposeAdmit = async () => {
    const res = prompt(
      `Are you sure you want to start a voting to make user ${props.id!.toText()} our teammate? If yes, provide their commitment in hours (for example, 40).`
    );

    if (!res) return;

    try {
      const commitment = E8s.fromString(res);

      if (commitment.gt(E8s.fromBigIntBase(40n)) || commitment.lt(E8s.one())) {
        alert("Commitment out of range 1 .. 40");
        return;
      }

      disable();
      await createHumansEmployVoting(props.id!, commitment);
      enable();

      await fetchVotings([decodeVotingId(votingId()!)]);

      logInfo("The voting has been created!");
    } catch (e) {
      logErr(ErrorCode.VALIDATION, `Invalid commitment: ${debugStringify(e)}`);
    }
  };

  const handleProposeExpel = async () => {
    const agreed = confirm(
      `Are you sure you want to start a voting to expel your teammate ${props.id!.toText()} from the team?`
    );

    if (!agreed) return;

    disable();
    await createHumansUnemployVoting(props.id!);
    enable();

    await fetchVotings([decodeVotingId(votingId()!)]);

    logInfo("The voting has been created!");
  };

  const borderColor = () =>
    isTeamMember() ? COLORS.chartreuse : COLORS.gray[150];

  const handleRefresh = () => {
    if (props.id) fetchProfiles([props.id]);
  };

  const handleLogout = async () => {
    if (await deauthorize()) {
      navigate(ROOT.path);
    }
  };

  const handleCopyPrincipal = () => {
    if (props.id) {
      navigator.clipboard.writeText(props.id.toText());
      logInfo("Copied!");
    }
  };

  const metricClass = "flex flex-col gap-1 min-w-36";

  return (
    <div
      class="flex flex-col gap-5 p-2"
      classList={{ "shadow-md": !props.me, [props.class!]: !!props.class }}
    >
      <div class="flex flex-col self-center items-center gap-2">
        <Avatar
          size={props.avatarSize ?? "lg"}
          borderColor={borderColor()}
          url={props.id ? avatarSrcFromPrincipal(props.id) : undefined}
        />
        <p class="flex gap-1 items-center text-center font-primary text-xs font-bold">
          <Show when={profile()?.name} fallback={"Anonymous"}>
            <Switch>
              <Match when={!edited()}>
                <p>{profile()!.name!}</p>
                <Show when={props.me}>
                  <Icon
                    kind={EIconKind.Edit}
                    onClick={handleEditClick}
                    color={COLORS.gray[150]}
                    size={14}
                  />
                </Show>
              </Match>
              <Match when={edited()}>
                <TextInput
                  value={profile()!.name ?? "Anonymous"}
                  onChange={handleNameEdit}
                  validations={[{ minLen: 2 }, { maxLen: 64 }]}
                />
                <Btn
                  text="Update"
                  onClick={handleUpdateName}
                  disabled={!canUpdateName()}
                />
              </Match>
            </Switch>
          </Show>
        </p>
        <p class="font-primary font-normal text-center text-xs text-gray-150">
          <Show when={props.id} fallback={Principal.anonymous().toText()}>
            {props.id!.toText()}{" "}
            <Icon
              kind={EIconKind.Copy}
              size={18}
              color={COLORS.gray[150]}
              hoverColor={COLORS.black}
              onClick={handleCopyPrincipal}
              class="inline cursor-pointer"
            />
          </Show>
        </p>
        <Show when={props.me}>
          <div class="flex max-w-28">
            <Btn text="Log Out" onClick={handleLogout} />
          </div>
        </Show>
      </div>
      <div class="grid grid-cols-2 gap-4 items-center">
        <div class={metricClass}>
          <Title text="Reputation" />
          <MetricWidget
            primary={rep() ? rep()!.toPrecision(2, true) : "0.0"}
            secondary={
              rep() && totals() && !totals()!.reputation.isZero()
                ? rep()!.div(totals()!.reputation).toPercentNum() + "%"
                : "0.0%"
            }
          />
        </div>
        <div class={metricClass}>
          <Title text="Contributing Since" />
          <MetricWidget
            primary={
              profile() ? timestampToDMStr(profile()!.registered_at) : "N/A"
            }
            secondary={
              profile() ? timestampToYearStr(profile()!.registered_at) : "Year"
            }
          />
        </div>
        <div class={metricClass}>
          <Title text="Storypoints Earned" />
          <MetricWidget
            primary={
              profile() ? profile()!.earned_storypoints.toPrecision(2) : "0.0"
            }
          />
        </div>
        <div class={metricClass}>
          <Title text="Hours Spent" />
          <MetricWidget
            primary={profile() ? profile()!.earned_hours.toPrecision(2) : "0.0"}
          />
        </div>
        <Show when={profile()?.employment}>
          <div class={metricClass}>
            <Title text="Rating" />
            <ComingSoonText class="text-sm" />
          </div>
          <div class={metricClass}>
            <Title text="Teammate Since" />
            <MetricWidget
              primary={timestampToDMStr(profile()!.employment!.employed_at)}
              secondary={timestampToYearStr(profile()!.employment!.employed_at)}
            />
          </div>
          <div class={metricClass}>
            <Title text="Commitment" />
            <MetricWidget
              primary={profile()!.employment!.hours_a_week_commitment.toPrecision(
                2
              )}
              secondary="hours"
              onEdit={props.me ? () => {} : undefined}
            />
          </div>
          <div class={metricClass}>
            <Title text="EvR" />
            <MetricWidget
              primary={evr() ? evr()!.toPercentNum().toString() : "0"}
              secondary="%"
            />
          </div>
        </Show>
        <Switch>
          <Match when={props.me}>
            <div class={metricClass}>
              <E8sWidget
                minValue={myBalance() ? myBalance()!.Hour : E8s.zero()}
                kind={EE8sKind.Hour}
              />
            </div>
            <div class={metricClass}>
              <E8sWidget
                minValue={myBalance() ? myBalance()!.Storypoint : E8s.zero()}
                kind={EE8sKind.Storypoint}
              />
            </div>
            <div class={metricClass}>
              <E8sWidget
                minValue={myBalance() ? myBalance()!.FMJ : E8s.zero()}
                kind={EE8sKind.FMJ}
              />
            </div>
            <div class={metricClass}>
              <E8sWidget
                minValue={myBalance() ? myBalance()!.ICP : E8s.zero()}
                kind={EE8sKind.ICP}
              />
            </div>
          </Match>
        </Switch>
        <Show when={followees().length > 0}>
          <div class="flex flex-col gap-1">
            <Title text="Followees" />
            <div class="flex flex-wrap">
              <For each={followees()}>{(id) => <ProfileMicro id={id} />}</For>
            </div>
          </div>
        </Show>
        <Show when={followers().length > 0}>
          <div class="flex flex-col gap-1">
            <Title text="Followers" />
            <div class="flex flex-wrap">
              <For each={followers()}>{(it) => <ProfileMicro id={it} />}</For>
            </div>
          </div>
        </Show>
        <Show when={!props.me && voting()}>
          <VotingWidget
            class="col-span-full"
            id={votingId()!}
            optionIdx={0}
            kind="satisfaction"
            onRefreshEntity={handleRefresh}
          />
        </Show>
        <Show when={meIsTeamMember() && !props.me && !voting()}>
          <Switch>
            <Match when={isTeamMember()}>
              <div class="flex flex-col col-span-full">
                <Btn
                  text="Expel"
                  icon={EIconKind.Minus}
                  onClick={handleProposeExpel}
                  iconColor={COLORS.errorRed}
                />
              </div>
            </Match>
            <Match when={!isTeamMember()}>
              <div class="flex flex-col col-span-full">
                <Btn
                  text="Admit"
                  icon={EIconKind.Plus}
                  onClick={handleProposeAdmit}
                  iconColor={COLORS.green}
                />
              </div>
            </Match>
          </Switch>
        </Show>
      </div>
    </div>
  );
}

export function ProfileMini(props: IProfileProps) {
  const { profiles, fetchProfiles } = useHumans();

  const profile = () => (props.id ? profiles[props.id.toText()] : undefined);

  createEffect(() => {
    if (!profile() && props.id) fetchProfiles([props.id]);
  });

  return (
    <div class="flex flex-row items-center gap-2">
      <Avatar
        borderColor={
          profile()?.employment ? COLORS.chartreuse : COLORS.gray[150]
        }
        url={props.id ? avatarSrcFromPrincipal(props.id) : undefined}
        size={props.avatarSize ?? "md"}
      />
      <div class="flex flex-col gap-1">
        <p class="font-primary text-xs font-bold">
          <Show when={profile()?.name} fallback={"Anonymous"}>
            {profile()!.name!}
          </Show>
        </p>
        <p class="font-primary font-normal text-xs text-gray-150 text-ellipsis">
          <Show when={profile()?.id} fallback={Principal.anonymous().toText()}>
            {profile()!.id.toText()}
          </Show>
        </p>
      </div>
    </div>
  );
}

export function ProfileMicro(props: IProfileProps) {
  const { profiles, fetchProfiles } = useHumans();

  const profile = () => (props.id ? profiles[props.id.toText()] : undefined);

  createEffect(() => {
    if (!profile() && props.id) fetchProfiles([props.id]);
  });

  return (
    <div class="flex flex-row items-center gap-2">
      <Avatar
        borderColor={
          profile()?.employment ? COLORS.chartreuse : COLORS.gray[150]
        }
        url={props.id ? avatarSrcFromPrincipal(props.id) : undefined}
        size={props.avatarSize ?? "sm"}
      />
    </div>
  );
}
