import { Accessor, createContext, createSignal, useContext } from "solid-js";
import { IChildren } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { Identity } from "@dfinity/agent";
import { MsqClient, MsqIdentity } from "@fort-major/msq-client";
import { debugStringify } from "../utils/encoding";

export interface IAuthStoreContext {
  authorize: () => Promise<boolean>;
  identity: Accessor<Identity | undefined>;
  msq: Accessor<MsqClient | undefined>;
}

const AuthContext = createContext<IAuthStoreContext>();

export function useAuth(): IAuthStoreContext {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Auth context is not initialized");
  }

  return ctx;
}

export function AuthStore(props: IChildren) {
  const [identity, setIdentity] = createSignal<Identity | undefined>();
  const [msqClient, setMsqClient] = createSignal<MsqClient | undefined>();

  const authorize: IAuthStoreContext["authorize"] = async () => {
    const msq = msqClient();

    if (msq) {
      if (!(await msq.isAuthorized())) {
        let id = await msq.requestLogin();

        if (!id) {
          return false;
        }

        setIdentity(id);
        return true;
      }

      let id = await MsqIdentity.create(msq);
      setIdentity(id);

      return true;
    }

    const res = await MsqClient.create();

    if ("Ok" in res) {
      setMsqClient(res.Ok);

      return authorize();
    }

    err(ErrorCode.AUTH, debugStringify(res));
  };

  return (
    <AuthContext.Provider value={{ identity, authorize, msq: msqClient }}>
      {props.children}
    </AuthContext.Provider>
  );
}
