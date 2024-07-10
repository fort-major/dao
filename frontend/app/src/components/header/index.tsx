import { ROOT } from "@/routes";
import { Avatar } from "@components/avatar";
import { Btn } from "@components/btn";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { EIconKind } from "@components/icon";
import { Logo } from "@components/logo";
import { ProfileMicro } from "@components/profile/profile";
import { A } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { avatarSrcFromPrincipal } from "@utils/common";
import { E8s } from "@utils/math";
import { Match, Switch } from "solid-js";

export interface IHeaderProps {
  class?: string;
}

export function Header(props: IHeaderProps) {
  const { isAuthorized, authorize, identity, myBalance, profileProof } =
    useAuth();

  return (
    <header
      class="flex px-5 py-6 fixed top-0 left-0 right-0 w-full bg-black"
      classList={{ [props.class!]: !!props.class }}
    >
      <Logo />
      <div class="flex gap-9 px-24 flex-grow items-center">
        <A
          activeClass="underline"
          class="font-primary font-normal text-white text-2xl"
          href={ROOT.path}
        >
          Home
        </A>
        <A
          activeClass="underline"
          class="font-primary font-normal text-white text-2xl"
          href={ROOT["/"].tasks.path}
        >
          Tasks
        </A>
        <A
          activeClass="underline"
          class="font-primary font-normal text-white text-2xl"
          href={ROOT["/"].decisions.path}
        >
          Decisions
        </A>
        <A
          activeClass="underline"
          class="font-primary font-normal text-white text-2xl"
          href={ROOT["/"].stats.path}
        >
          Stats
        </A>
      </div>
      <Switch>
        <Match when={!isAuthorized()}>
          <Btn
            text="Sign In"
            icon={EIconKind.MetaMask}
            class="bg-chartreuse"
            onClick={authorize}
          />
        </Match>
        <Match when={isAuthorized()}>
          <div class="flex gap-2 items-center">
            <E8sWidget
              kind={EE8sKind.FMJ}
              minValue={myBalance() ? myBalance()!.FMJ : E8s.zero()}
            />
            <E8sWidget
              kind={EE8sKind.Hours}
              minValue={myBalance() ? myBalance()!.Hours : E8s.zero()}
            />
            <E8sWidget
              kind={EE8sKind.Storypoints}
              minValue={myBalance() ? myBalance()!.Storypoints : E8s.zero()}
            />
            <ProfileMicro id={identity()?.getPrincipal()} avatarSize="md" />
          </div>
        </Match>
      </Switch>
    </header>
  );
}
