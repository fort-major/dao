import { Router } from "@solidjs/router";
import { ROOT } from "./routes";
import { TaskStore } from "./store/tasks";
import { HumanStore } from "./store/humans";
import { IChildren } from "./utils/types";

const Stores = (props: IChildren) => (
  <TaskStore>
    <HumanStore>{props.children}</HumanStore>
  </TaskStore>
);

function App() {
  return <Router root={Stores}>{ROOT}</Router>;
}

export default App;
