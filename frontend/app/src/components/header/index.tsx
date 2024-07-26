import { ROOT } from "@/routes";
import { Avatar } from "@components/avatar";
import { Btn } from "@components/btn";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { EIconKind, Icon } from "@components/icon";
import { Logo } from "@components/logo";
import { MetricWidget } from "@components/metric-widget";
import { ProfileMicro } from "@components/profile/profile";
import { A } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { useHumans } from "@store/humans";
import { COLORS } from "@utils/colors";
import { avatarSrcFromPrincipal } from "@utils/common";
import { E8s } from "@utils/math";
import { createEffect, createSignal, Match, Show, Switch } from "solid-js";

export interface IHeaderProps {
  class?: string;
}

export function Header(props: IHeaderProps) {
  const { isAuthorized, authorize, identity, myBalance } = useAuth();
  const { reputation } = useHumans();

  const [expanded, setExpanded] = createSignal(false);

  const myRep = () => {
    const me = identity()?.getPrincipal();
    return me ? reputation[me.toText()] : undefined;
  };

  const handleUnexpand = () => setExpanded(false);

  const linkClass = "font-primary font-normal text-white text-xl";

  return (
    <header
      class="fixed z-50 top-0 left-0 right-0 w-full bg-black flex flex-col px-5 py-3 lg:h-20 lg:px-20 lg:py-4 lg:flex-row lg:justify-between lg:border-b lg:border-b-gray-120"
      classList={{ [props.class!]: !!props.class }}
    >
      <div class="flex justify-between items-center lg:justify-start">
        <Logo class="h-6 w-12 lg:h-12 lg:w-24 relative bottom-[2px] lg:bottom-1" />

        <Icon
          class="lg:hidden cursor-pointer"
          kind={EIconKind.Bars}
          color={COLORS.white}
          hoverColor={COLORS.white}
          onClick={() => setExpanded((v) => !v)}
        />
      </div>

      <div
        class="lg:flex flex-col flex-grow lg:flex-row"
        classList={{ flex: expanded(), hidden: !expanded() }}
      >
        <nav class="flex flex-col gap-4 py-4 items-end lg:flex-row lg:gap-9 lg:pl-24 lg:pr-0 lg:py-0 lg:flex-grow lg:items-center">
          <A onClick={handleUnexpand} class={linkClass} href={ROOT.path}>
            Home
          </A>
          <A
            onClick={handleUnexpand}
            activeClass="underline"
            class={linkClass}
            href={ROOT.$.tasks.path}
          >
            Tasks
          </A>
          <A
            onClick={handleUnexpand}
            activeClass="underline"
            class={linkClass}
            href={ROOT.$.humans.path}
          >
            Humans
          </A>
          <Show when={isAuthorized()}>
            <A
              onClick={handleUnexpand}
              activeClass="underline"
              class={linkClass}
              href={ROOT.$.me.path}
            >
              Me
            </A>
          </Show>
        </nav>
        <Switch>
          <Match when={!isAuthorized()}>
            <Btn
              text="Sign In"
              icon={EIconKind.MetaMask}
              class="bg-chartreuse rounded-full h-[50px]"
              onClick={authorize}
            />
          </Match>
          <Match when={isAuthorized()}>
            <div class="gap-4 items-center hidden lg:flex pl-4 border-l border-l-gray-120">
              <div class="grid gap-x-4 gap-y-1 grid-cols-2 grid-rows-2">
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
                    kind={EE8sKind.Reputation}
                    minValue={myRep() ? myRep()! : E8s.zero()}
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
                    minValue={
                      myBalance() ? myBalance()!.Storypoint : E8s.zero()
                    }
                    disallowEmptyTail
                  />
                </div>
              </div>

              <ProfileMicro id={identity()?.getPrincipal()} avatarSize="md" />
            </div>
          </Match>
        </Switch>
      </div>
    </header>
  );
}
