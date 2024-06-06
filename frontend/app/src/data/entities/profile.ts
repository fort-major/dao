import { Principal } from "@dfinity/principal";

export interface IProfile {
  id: Principal;
  name?: string;
  avatarUrl?: string;
  employed: boolean;
}

export function fetchMockProfiles(ids: Principal[]): Promise<IProfile[]> {
  return Promise.resolve([
    {
      id: Principal.fromText(
        "4hh3y-c5een-zwqtw-jamjb-h5ces-ilqi7-sgehf-3n2l7-7xczu-lf4fa-sae"
      ),
      name: "Mr. Bean",
      avatarUrl:
        "https://gravatar.com/avatar/cb9f48d18ef372bc7e27d1bbc0062b51?s=400&d=robohash&r=x",
      employed: true,
    },
    {
      id: Principal.fromText(
        "4hh3y-c5een-zwqtw-jamjb-h5ces-ilqi7-sgehf-3n2l7-7xczu-lf4fa-sae"
      ),
      name: "Anonymous",
      avatarUrl:
        "https://gravatar.com/avatar/7731980709b49439f5ba3a4406075221?s=400&d=robohash&r=x",
      employed: false,
    },
  ]);
}
