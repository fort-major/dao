import { Router } from "@solidjs/router";
import { getSolidRoutes } from "./routes";
import { HumanStore } from "./store/humans";
import { IChildren } from "./utils/types";
import { Toaster } from "solid-toast";
import { AuthStore } from "./store/auth";
import { ErrorBoundary } from "solid-js";
import { ErrorCode } from "./utils/error";
import { debugStringify } from "./utils/encoding";
import { TasksStore } from "./store/tasks";
import { VotingsStore } from "./store/votings";
import { BankStore } from "./store/bank";
import { Header } from "@components/header";
import { WorkReportsStore } from "@store/work-reports";

const AppRoot = (props: IChildren) => (
  <>
    <ErrorBoundary
      fallback={(e) => {
        console.error(ErrorCode.UNKNOWN, "FATAL", e);

        return undefined;
      }}
    >
      <AuthStore>
        <HumanStore>
          <VotingsStore>
            <TasksStore>
              <WorkReportsStore>
                <BankStore>
                  <Header />
                  <main class="flex flex-col flex-grow self-stretch pt-12 lg:pt-[80px]">
                    {props.children}
                  </main>
                </BankStore>
              </WorkReportsStore>
            </TasksStore>
          </VotingsStore>
        </HumanStore>
      </AuthStore>
    </ErrorBoundary>
    <Toaster />
  </>
);

function App() {
  return <Router root={AppRoot}>{getSolidRoutes()}</Router>;
}

export default App;
