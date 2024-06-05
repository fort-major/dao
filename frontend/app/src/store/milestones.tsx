import { createContext, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TMilestoneId } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { IMilestone, fetchMockMilestones } from "../data/entities/milestone";

type MilestonesStore = Partial<Record<TMilestoneId, IMilestone>>;

export interface IMilestoneStoreContext {
  milestones: Store<MilestonesStore>;
  fetchMilestones: (ids: TMilestoneId[]) => Promise<void>;
}

const MilestoneContext = createContext<IMilestoneStoreContext>();

export function useMilestones(): IMilestoneStoreContext {
  const ctx = useContext(MilestoneContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Milestone context is not initialized");
  }

  return ctx;
}

export function MilestoneStore(props: IChildren) {
  const [milestones, setMilestones] = createStore<MilestonesStore>();

  const fetchMilestones = async (ids: TMilestoneId[]) => {
    const milestones = await fetchMockMilestones(ids);

    for (let milestone of milestones) {
      setMilestones(milestone.id, milestone);
    }
  };

  return (
    <MilestoneContext.Provider value={{ milestones, fetchMilestones }}>
      {props.children}
    </MilestoneContext.Provider>
  );
}
