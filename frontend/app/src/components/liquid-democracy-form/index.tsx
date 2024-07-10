import { useAuth } from "@store/auth";
import { useVotings } from "@store/votings";
import { onMount } from "solid-js";

export function LiquidDemocracyForm() {
  const {
    followersOf,
    fetchFollowersOf,
    followeesOf,
    fetchFolloweesOf,
    follow,
    unfollow,
  } = useVotings();
  const { identity } = useAuth();

  const myFollowers = () => {
    const me = identity()?.getPrincipal();
    if (!me) return [];

    const followers = followersOf[me.toText()];

    if (!followers) return [];
    else return followers;
  };

  const myFollowees = () => {
    const me = identity()?.getPrincipal();
    if (!me) return [];

    const followees = followeesOf[me.toText()];

    if (!followees) return [];
    else return followees;
  };

  onMount(() => {
    const me = identity()?.getPrincipal();
    if (!me) return;

    if (!myFollowers()) fetchFollowersOf([me]);
    if (!myFollowees()) fetchFolloweesOf([me]);
  });
}
