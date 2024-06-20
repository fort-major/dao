import { Router } from "@solidjs/router";
import { ROOT } from "./routes";
import { HumanStore } from "./store/humans";
import { IChildren } from "./utils/types";
import { Toaster } from "solid-toast";
import { AuthStore } from "./store/auth";
import { ErrorBoundary } from "solid-js";
import { ErrorCode, err } from "./utils/error";
import { debugStringify } from "./utils/encoding";

const AppRoot = (props: IChildren) => (
  <>
    <ErrorBoundary
      fallback={(e) => {
        err(ErrorCode.UNKNOWN, `FATAL: ${debugStringify(e)}`);
      }}
    >
      <AuthStore>
        <HumanStore>{props.children}</HumanStore>
      </AuthStore>
    </ErrorBoundary>
    <Toaster />
  </>
);

function App() {
  return <Router root={AppRoot}>{ROOT}</Router>;
}

export default App;
