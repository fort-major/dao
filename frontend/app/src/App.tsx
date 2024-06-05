import { Router } from "@solidjs/router";
import { ROOT } from "./routes";
import { TaskStore } from "./store/tasks";
import { MilestoneStore } from "./store/milestones";
import { HumanStore } from "./store/humans";
import { IChildren } from "./utils/types";

const Stores = (props: IChildren) => (
  <TaskStore>
    <MilestoneStore>
      <HumanStore>{props.children}</HumanStore>
    </MilestoneStore>
  </TaskStore>
);

function App() {
  return <Router root={Stores}>{ROOT}</Router>;
}

export default App;
