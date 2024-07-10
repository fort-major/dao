import { Router } from "@solidjs/router";
import { ROOT } from "./routes";
import { HumanStore } from "./store/humans";
import { IChildren } from "./utils/types";
import { Toaster } from "solid-toast";
import { AuthStore } from "./store/auth";
import { ErrorBoundary } from "solid-js";
import { ErrorCode, logErr } from "./utils/error";
import { debugStringify } from "./utils/encoding";
import { TasksStore } from "./store/tasks";
import { VotingsStore } from "./store/votings";
import { BankStore } from "./store/bank";
import { Portal } from "solid-js/web";
import { Header } from "@components/header";
import { Footer } from "@components/footer";

const AppRoot = (props: IChildren) => (
  <>
    <ErrorBoundary
      fallback={(e) => {
        logErr(ErrorCode.UNKNOWN, `FATAL: ${debugStringify(e)}`);

        return undefined;
      }}
    >
      <AuthStore>
        <VotingsStore>
          <HumanStore>
            <TasksStore>
              <BankStore>
                <Header />
                <main class="flex flex-col flex-grow self-stretch pt-[100px]">
                  {props.children}
                </main>
                <Footer />
              </BankStore>
            </TasksStore>
          </HumanStore>
        </VotingsStore>
      </AuthStore>
    </ErrorBoundary>
    <Toaster />
  </>
);

function App() {
  return <Router root={AppRoot}>{ROOT}</Router>;
}

export default App;
