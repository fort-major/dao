import { Principal } from "@dfinity/principal";
import { TE8s, TTeamId, TTimestamp } from "../../utils/types";

export interface IProfile {
  id: Principal;
  name?: string;
  about?: string;
  avatarUrl?: string;
  teamIds?: TTeamId[];
}

export function fetchMockProfiles(ids: Principal[]): Promise<IProfile[]> {
  return Promise.resolve([
    {
      id: Principal.fromText(
        "4hh3y-c5een-zwqtw-jamjb-h5ces-ilqi7-sgehf-3n2l7-7xczu-lf4fa-sae"
      ),
      name: "Mr. Bean",
      about:
        "I'm a true mister Bean, please believe me, I played in the movie...",
      avatarUrl:
        "https://gravatar.com/avatar/cb9f48d18ef372bc7e27d1bbc0062b51?s=400&d=robohash&r=x",
      teamIds: [1, 2],
    },
    {
      id: Principal.fromText(
        "4hh3y-c5een-zwqtw-jamjb-h5ces-ilqi7-sgehf-3n2l7-7xczu-lf4fa-sae"
      ),
      name: "Anonymous",
      about: "V is for Vendetta",
      avatarUrl:
        "https://gravatar.com/avatar/7731980709b49439f5ba3a4406075221?s=400&d=robohash&r=x",
      teamIds: [1, 2],
    },
  ]);
}
