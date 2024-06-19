import { Router } from "@solidjs/router";
import { ROOT } from "./routes";
import { TaskStore } from "./store/tasks";
import { HumanStore } from "./store/humans";
import { IChildren } from "./utils/types";
import { Toaster } from "solid-toast";

const AppRoot = (props: IChildren) => (
  <TaskStore>
    <HumanStore>{props.children}</HumanStore>
    <Toaster />
  </TaskStore>
);

function App() {
  return <Router root={AppRoot}>{ROOT}</Router>;
}

export default App;
