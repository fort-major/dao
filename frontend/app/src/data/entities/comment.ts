import { Principal } from "@dfinity/principal";
import { TCommentId, TTimestamp } from "../../utils/types";

export interface IComment {
  id: TCommentId;
  sender: Principal;
  timestamp: TTimestamp;
  content: string;
  isResolution: boolean;
}

export function fetchMockComments(ids: TCommentId[]): Promise<IComment[]> {
  return Promise.resolve([
    {
      id: 1,
      sender: Principal.fromText(
        "4hh3y-c5een-zwqtw-jamjb-h5ces-ilqi7-sgehf-3n2l7-7xczu-lf4fa-sae"
      ),
      timestamp: 1717595721449000000n,
      content: "#Wow, such an interesting task!",
      isResolution: false,
    },
    {
      id: 2,
      sender: Principal.fromText(
        "4hh3y-c5een-zwqtw-jamjb-h5ces-ilqi7-sgehf-3n2l7-7xczu-lf4fa-sae"
      ),
      timestamp: 1717595721449000000n,
      content:
        "I did everything as you said, here is a [link](https://google.com/)",
      isResolution: true,
    },
  ]);
}
