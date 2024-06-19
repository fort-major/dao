import {
  Accessor,
  createContext,
  createSignal,
  onMount,
  useContext,
} from "solid-js";
import { IChildren } from "../utils/types";
import { ErrorCode, err, info } from "../utils/error";
import { Identity, SignIdentity } from "@fort-major/agent-js-fork";
import { MsqClient, MsqIdentity } from "@fort-major/msq-client";
import { debugStringify } from "../utils/encoding";
import { Agent } from "@fort-major/agent-js-fork";
import {
  makeAgent,
  makeAnonymousAgent,
  newHumansActor,
} from "../utils/backend";

export interface IAuthStoreContext {
  authorize: () => Promise<boolean>;
  identity: Accessor<Identity | undefined>;
  msqClient: Accessor<MsqClient | undefined>;
  agent: Accessor<Agent | undefined>;
  anonymousAgent: Accessor<Agent>;
  isAuthorized: Accessor<boolean>;
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
  const [agent, setAgent] = createSignal<Agent | undefined>();
  const [anonymousAgent, setAnonymousAgent] = createSignal<Agent>();

  onMount(async () => {
    setAnonymousAgent(await makeAnonymousAgent());
  });

  const authorize: IAuthStoreContext["authorize"] = async () => {
    const msq = msqClient();

    if (msq) {
      let id: MsqIdentity;

      if (await msq.isAuthorized()) {
        id = await MsqIdentity.create(msq);
      } else {
        id = await msq.requestLogin();
      }

      if (!id) {
        return false;
      }

      let a = await makeAgent(id as unknown as Identity);

      const humansActor = newHumansActor(a);
      const { profiles } = await humansActor.humans__get_profiles({
        ids: [id.getPrincipal()],
      });

      if (!profiles[0][0]) {
        info(`First time here? Registering ${id.getPrincipal().toText()}...`);

        const name = await id.getPseudonym();
        const avatarSrc = await id.getAvatarSrc();

        await humansActor.humans__register({
          name: [name],
          avatar_src: [avatarSrc],
        });
      }

      setIdentity(id as unknown as Identity);
      setAgent(a);

      info("Login successful");

      return true;
    }

    const res = await MsqClient.create();

    if ("Ok" in res) {
      setMsqClient(res.Ok);

      return authorize();
    }

    err(ErrorCode.AUTH, debugStringify(res));
  };

  const isAuthorized = () => {
    return !!agent();
  };

  return (
    <AuthContext.Provider
      value={{
        identity,
        authorize,
        msqClient,
        agent,
        anonymousAgent,
        isAuthorized,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}
