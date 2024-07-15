import { ROOT } from "@/routes";
import { Avatar } from "@components/avatar";
import { Btn } from "@components/btn";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { EIconKind } from "@components/icon";
import { Logo } from "@components/logo";
import { MetricWidget } from "@components/metric-widget";
import { ProfileMicro } from "@components/profile/profile";
import { A } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { useHumans } from "@store/humans";
import { avatarSrcFromPrincipal } from "@utils/common";
import { E8s } from "@utils/math";
import { createEffect, Match, Show, Switch } from "solid-js";

export interface IHeaderProps {
  class?: string;
}

export function Header(props: IHeaderProps) {
  const { isAuthorized, authorize, identity, myBalance } = useAuth();
  const { reputation, fetchProfiles } = useHumans();

  const myRep = () => {
    const me = identity()?.getPrincipal();
    return me ? reputation[me.toText()] : undefined;
  };

  createEffect(() => {
    const me = identity()?.getPrincipal();

    if (isAuthorized() && !myRep() && me) {
      fetchProfiles([me]);
    }
  });

  const linkClass = "font-primary font-normal text-white text-xl";

  return (
    <header
      class="flex px-5 py-6 fixed z-50 top-0 left-0 right-0 w-full bg-black"
      classList={{ [props.class!]: !!props.class }}
    >
      <Logo />
      <nav class="flex gap-9 px-24 flex-grow items-center">
        <A class={linkClass} href={ROOT.path}>
          Home
        </A>
        <A activeClass="underline" class={linkClass} href={ROOT.$.tasks.path}>
          Tasks
        </A>
        <A activeClass="underline" class={linkClass} href={ROOT.$.humans.path}>
          Humans
        </A>
        <Show when={isAuthorized()}>
          <A activeClass="underline" class={linkClass} href={ROOT.$.me.path}>
            Me
          </A>
        </Show>
      </nav>
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
            <div class="min-w-24">
              <E8sWidget
                white
                kind={EE8sKind.FMJ}
                minValue={myBalance() ? myBalance()!.FMJ : E8s.zero()}
                disallowEmptyTail
              />
            </div>
            <div class="min-w-24">
              <E8sWidget
                white
                kind={EE8sKind.Hour}
                minValue={myBalance() ? myBalance()!.Hour : E8s.zero()}
                disallowEmptyTail
              />
            </div>
            <div class="min-w-24">
              <E8sWidget
                white
                kind={EE8sKind.Storypoint}
                minValue={myBalance() ? myBalance()!.Storypoint : E8s.zero()}
                disallowEmptyTail
              />
            </div>
            <Show when={myRep()}>
              <div class="min-w-24">
                <MetricWidget
                  primary={myRep()!.toPrecision(2, true)}
                  secondary="Reputation"
                  white
                />
              </div>
            </Show>

            <ProfileMicro id={identity()?.getPrincipal()} avatarSize="md" />
          </div>
        </Match>
      </Switch>
    </header>
  );
}
