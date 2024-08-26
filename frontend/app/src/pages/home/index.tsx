import { ROOT } from "@/routes";
import { EIconKind, Icon } from "@components/icon";
import { Page } from "@components/page";
import { A } from "@solidjs/router";
import { useBank } from "@store/bank";
import { useHumans } from "@store/humans";
import { useTasks } from "@store/tasks";
import { COLORS } from "@utils/colors";
import { eventHandler } from "@utils/security";
import { IClass } from "@utils/types";
import {
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";

const Btn = (props: {
  color: string;
  text?: string;
  icon: EIconKind;
  onClick?: () => void;
  linkTo?: string;
  linkTarget?: string;
  iconSize?: number;
  class?: string;
  innerClass?: string;
  shadow?: string;
}) => {
  const c = () => (
    <div
      class="flex items-center gap-2 rounded-full py-4 px-6 h-[50px]"
      style={{
        background: props.color,
        "box-shadow": props.shadow ? props.shadow : "",
      }}
      classList={{
        [props.innerClass!]: !!props.innerClass,
        "w-[50px]": !props.text,
        "justify-center": !props.text,
      }}
    >
      <Show when={props.text}>
        <span class="font-primary font-semibold text-nowrap text-sm sm:text-md text-white leading-4">
          {props.text}
        </span>
      </Show>
      <Icon size={props.iconSize} kind={props.icon} color={COLORS.white} />
    </div>
  );

  return (
    <Switch>
      <Match when={props.onClick}>
        <button
          class="bg-none flex border-none"
          classList={{ [props.class!]: !!props.class }}
          onClick={() => eventHandler(props.onClick!)}
        >
          {c()}
        </button>
      </Match>
      <Match when={props.linkTo}>
        <a
          href={props.linkTo!}
          target={props.linkTarget}
          classList={{ [props.class!]: !!props.class }}
        >
          {c()}
        </a>
      </Match>
    </Switch>
  );
};

const ProjectCard = (props: {
  img: string;
  name: string;
  desc: string;
  year: string;
  linkTo?: string;
  class?: string;
}) => (
  <a
    href={props.linkTo}
    target={props.linkTo && props.linkTo !== "/" ? "_blank" : ""}
    class="flex flex-col flex-grow w-full self-stretch gap-4 sm:gap-8 relative"
    classList={{ [props.class!]: !!props.class }}
  >
    <img src={props.img} class="w-full" />
    <div class="flex flex-col gap-3 sm:gap-5">
      <div class="flex flex-col gap-2 w-full">
        <h5 class="font-semibold text-2xl w-full leading-6 tracking-tight">
          {props.name}
        </h5>
        <p class="font-normal text-md w-full leading-4 tracking-tight">
          {props.desc}
        </p>
      </div>
      <p class="font-normal w-full text-md leading-4 tracking-tight text-gray-150">
        {props.year}
      </p>
    </div>
  </a>
);

const HowItWorksCard = (props: {
  id: string;
  class?: string;
  title: JSX.Element;
  desc: string;
  bg: string;
  last?: boolean;
  iconClass?: string;
}) => (
  <div
    class="flex flex-col rounded-3xl gap-10 px-6 sm:px-10 py-10"
    style={{ background: props.bg }}
    classList={{ [props.class!]: !!props.class }}
  >
    <div class="flex justify-between items-center gap-10 font-semibold text-[80px] leading-[80px] tracking-tight">
      <p class="text-gray-130">.{props.id}</p>
      <Show when={!props.last}>
        <Icon
          class={props.iconClass}
          kind={EIconKind.ArrowRight}
          size={80}
          color={COLORS.gray[130]}
        />
      </Show>
    </div>
    <div class="flex flex-grow flex-col justify-end gap-4">
      <h5 class="flex font-semibold text-[32px] leading-[32px] tracking-tight text-white">
        {props.title}
      </h5>
      <p class="font-normal text-md leading-6 text-gray-175">{props.desc}</p>
    </div>
  </div>
);

const MovingHeader = (props: { text: string }) => {
  const entries = () => Array(10).fill(0);

  return (
    <div class="relative flex">
      <div class="flex items-center text-gray-110 text-[40px] sm:text-[80px] animate-marquee tracking-tight font-semibold gap-8 relative">
        <For each={entries()}>
          {(_) => (
            <>
              <span class="text-nowrap">{props.text}</span>
              <span class="font-light">/</span>
            </>
          )}
        </For>
      </div>
      <div class="absolute ml-8 top-0 flex items-center text-gray-110 text-[40px] sm:text-[80px] animate-marquee2 tracking-tight font-semibold gap-8">
        <For each={entries()}>
          {(_) => (
            <>
              <span class="text-nowrap">{props.text}</span>
              <span class="font-light">/</span>
            </>
          )}
        </For>
      </div>
    </div>
  );
};

const AboutCard = (props: {
  title: string;
  desc: string;
  class?: string;
  btn?: JSX.Element;
  whiteText?: boolean;
}) => (
  <div
    class="flex flex-col gap-4 px-6 sm:px-10 py-10 rounded-[24px]"
    classList={{ [props.class!]: !!props.class }}
  >
    <h4 class="font-semibold text-[32px] leading-[32px] tracking-tight">
      {props.title}
    </h4>
    <p
      class="font-normal text-md leading-[150%] text-gray-175"
      classList={{ ["text-white"]: !!props.whiteText }}
    >
      {props.desc}
    </p>
    <Show when={props.btn}>{props.btn}</Show>
  </div>
);

const getColsNum = () => {
  if (window.innerWidth >= 1536) return 4;
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 640) return 2;
  return 1;
};

const AboutCols = (props: { children: JSX.Element[] }) => {
  const [cols, setCols] = createSignal(getColsNum());

  const listener = () => {
    setCols(getColsNum());
  };

  onMount(() => {
    window.addEventListener("resize", listener);
  });

  onCleanup(() => {
    window.removeEventListener("resize", listener);
  });

  return (
    <div class="grid gap-5 lg:gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <For each={Array(cols()).fill(0)}>
        {(_, idx) => (
          <div class="flex flex-col gap-5 lg:gap-10">
            <For each={props.children.filter((_, id) => id % cols() === idx())}>
              {(child) => child}
            </For>
          </div>
        )}
      </For>
    </div>
  );
};

const Stat = (props: { title: string; data: string }) => (
  <div
    style={{ direction: "ltr" }}
    class="flex flex-row items-center justify-between sm:items-start sm:justify-start sm:flex-col gap-5 pt-5 sm:pt-0 sm:pl-10 border-t sm:border-t-0 sm:border-l border-gray-120"
  >
    <h4 class="font-semibold text-xs sm:text-md leading-[150%] text-gray-150">
      {props.title}
    </h4>
    <p class="font-semibold text-white text-5xl sm:text-[80px] tracking-tight leading-[100%]">
      {props.data}
    </p>
  </div>
);

const isBtnShown = () => window.scrollY > (window.innerHeight / 3) * 2;

export function HomePage() {
  const { totals, decentralization } = useHumans();
  const { fmjStats } = useBank();
  const { taskStats } = useTasks();

  const [showBtn, setShowBtn] = createSignal(isBtnShown());

  const listener = () => {
    setShowBtn(isBtnShown());
  };

  onMount(() => {
    window.addEventListener("scroll", listener);
    window.addEventListener("resize", listener);
  });

  onCleanup(() => {
    window.removeEventListener("scroll", listener);
    window.removeEventListener("resize", listener);
  });

  return (
    <Page outerClass="bg-black text-white relative">
      <Show when={showBtn()}>
        <Btn
          text="Start Contributing"
          icon={EIconKind.Plus}
          linkTo="https://fort-major.org/contributions"
          color={COLORS.darkBlue}
          iconSize={16}
          class="fixed bottom-20 left-1/2 translate-x-[-50%] z-50"
          shadow="2px 2px 15px rgba(0, 0, 0, .25)"
        />
      </Show>
      <svg
        width="1920"
        height="961"
        viewBox="0 0 1920 961"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="hidden md:block absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
      >
        <path
          d="M1257.93 0C1257.93 164.543 1124.54 297.931 960 297.931C795.457 297.931 662.069 164.543 662.069 0M1423.45 0C1423.45 255.955 1215.96 463.448 960 463.448C704.045 463.448 496.552 255.955 496.552 0M1588.97 0C1588.97 347.368 1307.37 628.966 960 628.966C612.632 628.966 331.034 347.368 331.034 0M1754.48 0C1754.48 438.781 1398.78 794.483 960 794.483C521.219 794.483 165.517 438.781 165.517 0M1920 0C1920 530.193 1490.19 960 960 960C429.807 960 0 530.193 0 0"
          stroke="white"
          stroke-opacity="0.05"
        />
      </svg>
      <div class="relative flex flex-col gap-12 px-5 lg:px-20 lg:flex-row lg:gap-5 items-center justify-center h-[calc(100svh-48px)] lg:h-[calc(100dvh-100px)]">
        <div class="flex flex-col self-stretch lg:self-auto items-center justify-center gap-20 lg:gap-10">
          <h2 class="font-primary font-semibold text-4xl leading-9 lg:text-[80px] lg:leading-[80px] tracking-tight text-center max-w-6xl">
            A Fair, Open, Robust and Transparent digital organization with an
            uplifting vibe
          </h2>
          <div class="flex gap-2 items-center">
            <Btn
              text="Start Contributing"
              icon={EIconKind.Plus}
              linkTo="https://fort-major.org/contributions"
              color={COLORS.darkBlue}
              iconSize={16}
              shadow="2px 2px 15px rgba(0, 0, 0, .25)"
            />
            <Btn
              icon={EIconKind.Telegram}
              linkTo="https://t.me/fortmajoricp"
              linkTarget="_blank"
              color="#2AABEE"
              iconSize={30}
              innerClass="px-[8px] py-[8px]"
              shadow="2px 2px 15px rgba(0, 0, 0, .25)"
            />
          </div>
        </div>

        <PoweredByIc
          class="block lg:hidden absolute bottom-8"
          color={COLORS.gray[108]}
        />
      </div>

      <div class="flex flex-col gap-10 px-5 lg:px-20">
        <h3 class="font-primary font-semibold text-2xl">Our Projects</h3>
        {/** safari */}
        <div class="grid">
          <div class="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 justify-items-center gap-5 sm:gap-10">
            <ProjectCard
              linkTo="https://icp.msq.tech"
              img="/msq-project.png"
              name="MSQ"
              desc="Phishing-proof MetaMask-based ICP Wallet"
              year="2023"
            />
            <ProjectCard
              linkTo="/"
              img="/fmj-project.png"
              name="Fort Major"
              desc="The First Ever Exponential DAO"
              year="2024"
            />
            <ProjectCard
              img="/coming-soon-project.png"
              name="Coming Soon"
              desc="Let's create something nice together"
              year="????"
            />
            <ProjectCard
              img="/coming-soon-project.png"
              name="Coming Soon"
              desc="Let's create something nice together"
              year="????"
              class="hidden lg:flex"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-10 sm:my-36 px-5 lg:px-20">
        <h3 class="font-primary font-semibold text-2xl">How It Works</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4">
          <HowItWorksCard
            id="01"
            title={<span>Solve Tasks</span>}
            desc="Find a task that you can handle, complete it, press 'Solve' and attach your solution"
            bg={COLORS.gray[105]}
            iconClass="rotate-90 sm:rotate-0"
          />
          <HowItWorksCard
            id="02"
            title={<span>Earn Rewards and Reputation</span>}
            desc="Each valid solution is rewarded with Storypoints and Hours"
            bg={COLORS.gray[110]}
            iconClass="rotate-90 sm:rotate-0"
          />
          <HowItWorksCard
            id="03"
            title={
              <span class="inline-block">
                <p class="inline">Exchange Rewards for FMJ or ICP</p>
                <div class="inline relative left-2">
                  <Icon kind={EIconKind.FMJ} class="inline" />
                  <Icon
                    kind={EIconKind.ICP}
                    color={COLORS.white}
                    class="inline relative right-2"
                  />
                </div>
              </span>
            }
            desc="FMJ is our ICRC-1 token automatically minted by the DAO when you swap Rewards into it"
            bg={COLORS.gray[120]}
            iconClass="rotate-90 sm:rotate-0"
          />
          <HowItWorksCard
            id="04"
            title={
              <span>
                Use Reputation to govern the DAO, evaluate task solutions and{" "}
                <span class="relative text-gray-150 text-nowrap">
                  receive dividends
                  <span class="absolute right-[-43px] rotate-12 top-0 rounded-full text-nowrap text-black text-xs leading-4 bg-chartreuse flex px-2 py-1">
                    Coming Soon
                  </span>
                </span>
              </span>
            }
            desc="Truly owned by its contributors!"
            bg={COLORS.gray[105]}
            last
          />
        </div>
      </div>

      <div class="flex flex-col gap-10 px-5 lg:px-20">
        <MovingHeader text="About" />
        <AboutCols>
          <AboutCard
            class="bg-gray-120"
            title="Same Rules for Everyone"
            desc="Both: Reputation and FMJ can only be minted when a task is solved.
              There is no special allocation for the Team. There are no seed,
              pre-seed or other investors. We're all in the same boat here."
          />
          <AboutCard
            class="bg-gray-110"
            title="Reputation = Ownership"
            desc="When you solve a task, you have a right to request Reputation for
              your commitment. This gives you the ability to express your
              opinion in various votings happening within Fort Major. The more
              Reputation you have, the stronger your voice. Reputation is
              Soulbound - you can't buy or sell it."
          />
          <AboutCard
            class="bg-gray-105"
            title="Fair Distribution"
            desc="We want to build a DAO that is fully owned by those, who
              contribute to it. We have all the tools to do it in a fair way.
              The more tasks you do, and the harder they are, the more
              Reputation and Rewards you get."
          />
          <AboutCard
            class="bg-gray-120"
            title="Flexible and Inclusive"
            desc="If you can't find a task matching your skillset, or you have a
              creative idea for something you could do, don't hesitate to reach
              us out via Telegram - we could use any help, and we'll make sure
              to reward you fairly."
          />
          <AboutCard
            class="bg-gray-110"
            title="Good Side Hustle"
            desc="Anyone can become a contributor and solve public tasks. We do our
              best to keep plenty of tasks available for you to participate at
              any time. By the way, you can remain completely anonymous while
              contributing."
          />
          <AboutCard
            class="bg-gray-105"
            title="The Team"
            desc="The Team itself follows the same exact rules. We also create tasks
              for ourselves, solve them and then anyone with Reputation
              evaluates our solutions. There is more power in being a Team
              member, but it is also a bigger responsibility."
          />
          <AboutCard
            class="bg-darkBlue"
            title="Ready for More?"
            desc="If you want to join the Team, and you're feeling comfortable being
              paid in a new cryptocurrency without a lot of liquidity (FMJ),
              reach us out via Telegram. We have a plenty of open positions and
              we're looking forward to meet you."
            whiteText
            btn={
              <Btn
                color="#2AABEE"
                icon={EIconKind.Telegram}
                text="Contact Us"
                linkTarget="_blank"
                linkTo="https://t.me/fortmajoricp"
                class="self-start"
                shadow="2px 2px 15px #5102F8"
              />
            }
          />
        </AboutCols>
      </div>

      <div class="flex flex-col px-5 lg:px-20 py-20 lg:py-36">
        <div class="flex flex-col sm:items-center sm:flex-row gap-10 sm:justify-between px-6 sm:px-10 py-10 rounded-3xl bg-gray-110">
          <h4 class="flex flex-col sm:block font-semibold tracking-tight text-2xl leading-6 sm:text-[40px] sm:leading-10">
            <span class="text-nowrap text-center sm:text-left">
              No time to contribute?
            </span>{" "}
            <span class="text-nowrap text-center sm:text-left">
              Just Invest in FMJ.
            </span>
          </h4>
          <div class="flex flex-col sm:flex-row gap-5">
            <a
              class="flex items-center justify-center gap-3 py-2 px-6 rounded-full font-semibold text-md leading-4 h-[50px] cursor-pointer text-nowrap flex-nowrap"
              style={{
                background:
                  "linear-gradient(270deg, rgb(123, 106, 255) 0%, rgb(74, 97, 204) 100%)",
                "box-shadow": "2px 2px 15px rgba(0, 0, 0, .25)",
              }}
              href="https://app.icpswap.com/swap?input=ryjl3-tyaaa-aaaaa-aaaba-cai&output=q624g-niaaa-aaaag-alfyq-cai"
              target="_blank"
            >
              Buy on ICPSwap <img src="/icons/icpswap.png" />
            </a>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-10 px-5 sm:my-28 lg:px-20">
        <MovingHeader text="Statistics" />
        <div
          style={{ direction: "rtl" }}
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-y-16"
        >
          <Stat
            data={totals().hours.toPrecision(2, true)}
            title="Total Hours"
          />
          <Stat
            data={totals().storypoints.toPrecision(2, true)}
            title="Total Storypoints"
          />
          <Stat
            data={decentralization().toPercent().toPrecision(2, true) + "%"}
            title="Decentralization"
          />
          <Stat
            data={totals().reputation.toPrecision(2, true)}
            title="Total Reputation"
          />
          <Stat
            data={fmjStats().totalSupply.toPrecision(2, true)}
            title="Total FMJ Supply"
          />
          <Stat
            data={taskStats().solvedTasks.toString()}
            title="Solved Tasks"
          />
          <Stat
            data={taskStats().readyToSolveTasks.toString()}
            title="In-progress Tasks"
          />
          <Stat data={totals().contributors.toString()} title="Contributors" />
          <Show when={!fmjStats().totalSupply.isZero()}>
            <Stat
              data={
                fmjStats()
                  .avgMonthlyInflation.div(fmjStats().totalSupply)
                  .toPercent()
                  .toPrecision(2, true) + "%"
              }
              title="FMJ Monthly Inflation (12m EMA)"
            />
          </Show>
        </div>
      </div>

      <div class="flex w-full h-auto items-center justify-center relative">
        <div class="w-full bottom-0 left-0 right-0 overflow-hidden flex flex-col">
          <FortMajor class="w-full h-auto bottom-[-40px] sm:bottom-0 relative" />
        </div>
        <PoweredByIc class="hidden sm:block absolute right-2 bottom-[84%] w-[20%]" />
      </div>
    </Page>
  );
}

const areWeOnMobile = () => window.innerWidth <= 640;

const FortMajor = (props: IClass) => {
  const [isMobile, setIsMobile] = createSignal(areWeOnMobile());

  const listener = () => {
    setIsMobile(areWeOnMobile());
  };

  onMount(() => {
    window.addEventListener("resize", listener);
  });

  onCleanup(() => {
    window.removeEventListener("resize", listener);
  });

  return (
    <Switch>
      <Match when={isMobile()}>
        <svg
          class={props.class}
          width="390"
          height="270"
          viewBox="0 0 390 270"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0.000779147 108.104V0.598145H68.6243V15.4953H18.4232V46.9791H59.4131V61.5691H18.4232V108.104H0.000779147Z"
            fill="#333333"
          />
          <path
            d="M112.902 109.947C105.533 109.947 98.8802 108.257 92.944 104.878C87.1103 101.397 82.5047 96.6364 79.1272 90.5956C75.8521 84.4524 74.2146 77.439 74.2146 69.5552C74.2146 61.4667 75.9033 54.4021 79.2807 48.3613C82.6582 42.2181 87.2638 37.4572 93.0976 34.0784C99.0337 30.5973 105.686 28.8567 113.055 28.8567C120.424 28.8567 127.026 30.5973 132.859 34.0784C138.795 37.4572 143.401 42.1669 146.676 48.2077C150.054 54.2485 151.742 61.3132 151.742 69.4017C151.742 77.4902 150.054 84.5548 146.676 90.5956C143.299 96.6364 138.642 101.397 132.706 104.878C126.872 108.257 120.271 109.947 112.902 109.947ZM112.902 94.1279C116.586 94.1279 119.912 93.2065 122.88 91.3635C125.951 89.5206 128.407 86.7561 130.249 83.0702C132.092 79.3843 133.013 74.8281 133.013 69.4017C133.013 63.9752 132.092 59.4702 130.249 55.8867C128.51 52.2008 126.104 49.4364 123.034 47.5934C120.066 45.7505 116.74 44.829 113.055 44.829C109.473 44.829 106.147 45.7505 103.076 47.5934C100.006 49.4364 97.5496 52.2008 95.7074 55.8867C93.8652 59.4702 92.944 63.9752 92.944 69.4017C92.944 74.8281 93.8652 79.3843 95.7074 83.0702C97.5496 86.7561 99.9548 89.5206 102.923 91.3635C105.993 93.2065 109.32 94.1279 112.902 94.1279Z"
            fill="#333333"
          />
          <path
            d="M166.706 108.104V30.6997H183.132L184.821 45.1361C186.663 41.7574 188.966 38.8906 191.729 36.5357C194.493 34.0784 197.717 32.1843 201.401 30.8533C205.188 29.5222 209.333 28.8567 213.836 28.8567V48.3613H207.389C204.318 48.3613 201.401 48.7709 198.638 49.5899C195.875 50.3066 193.469 51.5353 191.422 53.2758C189.478 54.914 187.943 57.2177 186.817 60.1869C185.691 63.0537 185.128 66.6884 185.128 71.091V108.104H166.706Z"
            fill="#333333"
          />
          <path
            d="M258.274 108.104C253.055 108.104 248.5 107.285 244.611 105.646C240.824 104.008 237.856 101.295 235.707 97.5067C233.558 93.7184 232.483 88.5991 232.483 82.1487V46.2112H219.28V30.6997H232.483L234.632 10.2736H250.906V30.6997H271.938V46.2112H250.906V82.1487C250.906 86.0394 251.724 88.7527 253.362 90.2885C255.102 91.7219 257.967 92.4386 261.959 92.4386H271.477V108.104H258.274Z"
            fill="#333333"
          />
          <path
            d="M0 236.207V128.702H21.7999L56.1884 198.12L90.2699 128.702H112.223V236.207H93.8009V160.339L63.4038 221.157H48.973L18.4224 160.493V236.207H0Z"
            fill="#333333"
          />
          <path
            d="M156.137 238.05C149.792 238.05 144.521 236.975 140.325 234.825C136.128 232.675 133.007 229.808 130.96 226.225C128.913 222.641 127.89 218.75 127.89 214.553C127.89 209.638 129.118 205.389 131.574 201.806C134.133 198.222 137.868 195.458 142.781 193.512C147.694 191.465 153.732 190.441 160.896 190.441H180.393C180.393 186.345 179.831 182.967 178.705 180.304C177.579 177.54 175.839 175.492 173.485 174.161C171.131 172.83 168.112 172.165 164.427 172.165C160.231 172.165 156.649 173.137 153.681 175.083C150.713 176.926 148.871 179.793 148.154 183.683H130.039C130.653 178.154 132.495 173.445 135.566 169.554C138.636 165.561 142.679 162.489 147.694 160.339C152.811 158.087 158.389 156.96 164.427 156.96C171.694 156.96 177.886 158.24 183.003 160.8C188.121 163.257 192.01 166.841 194.671 171.55C197.434 176.158 198.816 181.738 198.816 188.291V236.207H183.157L181.315 223.767C180.291 225.815 178.961 227.709 177.323 229.45C175.788 231.19 173.997 232.726 171.95 234.057C169.903 235.286 167.549 236.259 164.888 236.975C162.329 237.692 159.412 238.05 156.137 238.05ZM160.282 223.46C163.25 223.46 165.86 222.948 168.112 221.924C170.466 220.798 172.462 219.262 174.099 217.317C175.839 215.269 177.17 213.017 178.091 210.56C179.012 208.102 179.626 205.491 179.933 202.727V202.42H162.892C159.31 202.42 156.342 202.881 153.988 203.802C151.634 204.621 149.945 205.85 148.922 207.488C147.898 209.126 147.387 211.02 147.387 213.17C147.387 215.321 147.898 217.163 148.922 218.699C149.945 220.235 151.429 221.413 153.374 222.232C155.319 223.051 157.621 223.46 160.282 223.46Z"
            fill="#333333"
          />
          <path
            d="M200.692 269.995V254.33H206.986C210.466 254.33 212.922 253.613 214.355 252.18C215.788 250.849 216.504 248.494 216.504 245.115V158.803H234.927V245.268C234.927 251.207 233.903 255.968 231.856 259.551C229.809 263.237 226.892 265.899 223.106 267.537C219.421 269.176 214.969 269.995 209.749 269.995H200.692ZM225.869 146.517C222.389 146.517 219.575 145.493 217.425 143.445C215.276 141.295 214.201 138.684 214.201 135.613C214.201 132.439 215.276 129.879 217.425 127.934C219.575 125.886 222.389 124.862 225.869 124.862C229.246 124.862 232.01 125.886 234.159 127.934C236.308 129.879 237.383 132.439 237.383 135.613C237.383 138.684 236.308 141.295 234.159 143.445C232.01 145.493 229.246 146.517 225.869 146.517Z"
            fill="#333333"
          />
          <path
            d="M289.065 238.05C281.696 238.05 275.044 236.361 269.108 232.982C263.274 229.501 258.668 224.74 255.291 218.699C252.016 212.556 250.378 205.543 250.378 197.659C250.378 189.57 252.067 182.506 255.444 176.465C258.822 170.322 263.427 165.561 269.261 162.182C275.197 158.701 281.85 156.96 289.219 156.96C296.588 156.96 303.189 158.701 309.023 162.182C314.959 165.561 319.565 170.271 322.84 176.311C326.217 182.352 327.906 189.417 327.906 197.505C327.906 205.594 326.217 212.659 322.84 218.699C319.462 224.74 314.805 229.501 308.869 232.982C303.036 236.361 296.434 238.05 289.065 238.05ZM289.065 222.232C292.75 222.232 296.076 221.31 299.044 219.467C302.114 217.624 304.571 214.86 306.413 211.174C308.255 207.488 309.176 202.932 309.176 197.505C309.176 192.079 308.255 187.574 306.413 183.99C304.673 180.304 302.268 177.54 299.198 175.697C296.229 173.854 292.903 172.933 289.219 172.933C285.637 172.933 282.31 173.854 279.24 175.697C276.169 177.54 273.713 180.304 271.871 183.99C270.029 187.574 269.108 192.079 269.108 197.505C269.108 202.932 270.029 207.488 271.871 211.174C273.713 214.86 276.118 217.624 279.086 219.467C282.157 221.31 285.483 222.232 289.065 222.232Z"
            fill="#333333"
          />
          <path
            d="M342.869 236.207V158.803H359.296L360.985 173.24C362.827 169.861 365.13 166.994 367.893 164.639C370.656 162.182 373.88 160.288 377.565 158.957C381.352 157.626 385.497 156.96 390 156.96V176.465H383.552C380.482 176.465 377.565 176.875 374.802 177.694C372.038 178.41 369.633 179.639 367.586 181.38C365.641 183.018 364.106 185.321 362.98 188.291C361.855 191.157 361.292 194.792 361.292 199.195V236.207H342.869Z"
            fill="#333333"
          />
        </svg>
      </Match>
      <Match when={!isMobile()}>
        <svg
          class={props.class}
          width="1920"
          height="294"
          viewBox="0 0 1920 294"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-1 300.741V10.3704H184.351V50.6074H48.7586V135.644H159.472V175.052H48.7586V300.741H-1Z"
            fill="#1D1E27"
          />
          <path
            d="M303.943 305.719C284.04 305.719 266.071 301.156 250.038 292.03C234.281 282.627 221.841 269.768 212.719 253.452C203.873 236.859 199.45 217.916 199.45 196.622C199.45 174.775 204.011 155.694 213.134 139.378C222.256 122.785 234.696 109.926 250.453 100.8C266.486 91.3975 284.454 86.6963 304.358 86.6963C324.261 86.6963 342.091 91.3975 357.848 100.8C373.882 109.926 386.321 122.647 395.167 138.963C404.29 155.279 408.851 174.36 408.851 196.207C408.851 218.054 404.29 237.136 395.167 253.452C386.045 269.768 373.467 282.627 357.434 292.03C341.677 301.156 323.847 305.719 303.943 305.719ZM303.943 262.993C313.895 262.993 322.879 260.504 330.896 255.526C339.189 250.548 345.823 243.081 350.799 233.126C355.775 223.17 358.263 210.864 358.263 196.207C358.263 181.551 355.775 169.383 350.799 159.704C346.1 149.748 339.604 142.281 331.31 137.304C323.294 132.326 314.31 129.837 304.358 129.837C294.683 129.837 285.698 132.326 277.405 137.304C269.112 142.281 262.478 149.748 257.502 159.704C252.526 169.383 250.038 181.551 250.038 196.207C250.038 210.864 252.526 223.17 257.502 233.126C262.478 243.081 268.974 250.548 276.991 255.526C285.284 260.504 294.268 262.993 303.943 262.993Z"
            fill="#1D1E27"
          />
          <path
            d="M449.267 300.741V91.6741H493.635L498.196 130.667C503.172 121.541 509.392 113.798 516.856 107.437C524.319 100.8 533.027 95.684 542.979 92.0889C553.207 88.4938 564.403 86.6963 576.566 86.6963V139.378H559.15C550.857 139.378 542.979 140.484 535.515 142.696C528.051 144.632 521.555 147.951 516.026 152.652C510.774 157.077 506.628 163.299 503.587 171.319C500.546 179.062 499.025 188.879 499.025 200.77V300.741H449.267Z"
            fill="#1D1E27"
          />
          <path
            d="M696.593 300.741C682.494 300.741 670.193 298.528 659.688 294.104C649.46 289.679 641.443 282.351 635.638 272.119C629.833 261.886 626.93 248.059 626.93 230.637V133.57H591.27V91.6741H626.93L632.736 36.5037H676.689V91.6741H733.497V133.57H676.689V230.637C676.689 241.146 678.901 248.474 683.323 252.622C688.023 256.494 695.763 258.43 706.544 258.43H732.253V300.741H696.593Z"
            fill="#1D1E27"
          />
          <path
            d="M866.617 300.741V10.3704H925.498L1018.38 197.867L1110.43 10.3704H1169.73V300.741H1119.97V95.8222L1037.87 260.089H998.892L916.376 96.237V300.741H866.617Z"
            fill="#1D1E27"
          />
          <path
            d="M1288.34 305.719C1271.2 305.719 1256.97 302.815 1245.63 297.007C1234.3 291.2 1225.87 283.457 1220.34 273.778C1214.81 264.099 1212.04 253.59 1212.04 242.252C1212.04 228.978 1215.36 217.501 1222 207.822C1228.91 198.143 1239 190.677 1252.27 185.422C1265.54 179.891 1281.84 177.126 1301.2 177.126H1353.86C1353.86 166.064 1352.34 156.938 1349.3 149.748C1346.25 142.281 1341.56 136.751 1335.2 133.156C1328.84 129.561 1320.68 127.763 1310.73 127.763C1299.4 127.763 1289.72 130.39 1281.71 135.644C1273.69 140.622 1268.71 148.365 1266.78 158.874H1217.85C1219.51 143.941 1224.48 131.22 1232.78 120.711C1241.07 109.926 1251.99 101.63 1265.54 95.8222C1279.36 89.7383 1294.42 86.6963 1310.73 86.6963C1330.36 86.6963 1347.08 90.1531 1360.91 97.0667C1374.73 103.704 1385.23 113.383 1392.42 126.104C1399.88 138.548 1403.62 153.62 1403.62 171.319V300.741H1361.32L1356.34 267.141C1353.58 272.672 1349.99 277.788 1345.56 282.489C1341.42 287.19 1336.58 291.338 1331.05 294.933C1325.52 298.252 1319.16 300.879 1311.98 302.815C1305.07 304.751 1297.19 305.719 1288.34 305.719ZM1299.54 266.311C1307.55 266.311 1314.6 264.928 1320.68 262.163C1327.04 259.121 1332.43 254.973 1336.86 249.719C1341.56 244.188 1345.15 238.104 1347.64 231.467C1350.12 224.83 1351.78 217.778 1352.61 210.311V209.481H1306.59C1296.91 209.481 1288.89 210.726 1282.54 213.215C1276.18 215.427 1271.62 218.746 1268.85 223.17C1266.09 227.595 1264.71 232.711 1264.71 238.519C1264.71 244.326 1266.09 249.304 1268.85 253.452C1271.62 257.6 1275.62 260.78 1280.88 262.993C1286.13 265.205 1292.35 266.311 1299.54 266.311Z"
            fill="#1D1E27"
          />
          <path
            d="M1408.68 392V349.689H1425.68C1435.08 349.689 1441.72 347.753 1445.59 343.882C1449.46 340.286 1451.39 333.926 1451.39 324.8V91.6741H1501.15V325.215C1501.15 341.254 1498.39 354.114 1492.86 363.793C1487.33 373.748 1479.45 380.938 1469.22 385.363C1459.27 389.788 1447.24 392 1433.15 392H1408.68ZM1476.69 58.4889C1467.29 58.4889 1459.68 55.7234 1453.88 50.1926C1448.07 44.3852 1445.17 37.3333 1445.17 29.037C1445.17 20.4642 1448.07 13.5506 1453.88 8.29629C1459.68 2.76543 1467.29 0 1476.69 0C1485.81 0 1493.27 2.76543 1499.08 8.29629C1504.88 13.5506 1507.78 20.4642 1507.78 29.037C1507.78 37.3333 1504.88 44.3852 1499.08 50.1926C1493.27 55.7234 1485.81 58.4889 1476.69 58.4889Z"
            fill="#1D1E27"
          />
          <path
            d="M1647.38 305.719C1627.47 305.719 1609.51 301.156 1593.47 292.03C1577.71 282.627 1565.28 269.768 1556.15 253.452C1547.31 236.859 1542.88 217.916 1542.88 196.622C1542.88 174.775 1547.45 155.694 1556.57 139.378C1565.69 122.785 1578.13 109.926 1593.89 100.8C1609.92 91.3975 1627.89 86.6963 1647.79 86.6963C1667.7 86.6963 1685.53 91.3975 1701.28 100.8C1717.32 109.926 1729.76 122.647 1738.6 138.963C1747.72 155.279 1752.28 174.36 1752.28 196.207C1752.28 218.054 1747.72 237.136 1738.6 253.452C1729.48 269.768 1716.9 282.627 1700.87 292.03C1685.11 301.156 1667.28 305.719 1647.38 305.719ZM1647.38 262.993C1657.33 262.993 1666.31 260.504 1674.33 255.526C1682.62 250.548 1689.26 243.081 1694.23 233.126C1699.21 223.17 1701.7 210.864 1701.7 196.207C1701.7 181.551 1699.21 169.383 1694.23 159.704C1689.53 149.748 1683.04 142.281 1674.74 137.304C1666.73 132.326 1657.74 129.837 1647.79 129.837C1638.12 129.837 1629.13 132.326 1620.84 137.304C1612.55 142.281 1605.91 149.748 1600.94 159.704C1595.96 169.383 1593.47 181.551 1593.47 196.207C1593.47 210.864 1595.96 223.17 1600.94 233.126C1605.91 243.081 1612.41 250.548 1620.42 255.526C1628.72 260.504 1637.7 262.993 1647.38 262.993Z"
            fill="#1D1E27"
          />
          <path
            d="M1792.7 300.741V91.6741H1837.07L1841.63 130.667C1846.61 121.541 1852.83 113.798 1860.29 107.437C1867.75 100.8 1876.46 95.684 1886.41 92.0889C1896.64 88.4938 1907.84 86.6963 1920 86.6963V139.378H1902.58C1894.29 139.378 1886.41 140.484 1878.95 142.696C1871.49 144.632 1864.99 147.951 1859.46 152.652C1854.21 157.077 1850.06 163.299 1847.02 171.319C1843.98 179.062 1842.46 188.879 1842.46 200.77V300.741H1792.7Z"
            fill="#1D1E27"
          />
        </svg>
      </Match>
    </Switch>
  );
};

const PoweredByIc = (props: IClass & { color?: string }) => (
  <svg
    class={props.class}
    width="332"
    height="24"
    viewBox="0 0 332 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.935547 16.7999V3.35986H5.52435C6.59955 3.35986 7.48275 3.53906 8.17395 3.89746C8.86515 4.25587 9.37714 4.73587 9.70995 5.33746C10.0427 5.93906 10.2092 6.62386 10.2092 7.39186C10.2092 8.12146 10.0427 8.79346 9.70995 9.40786C9.38995 10.0095 8.88435 10.4959 8.19315 10.8671C7.50195 11.2255 6.61234 11.4047 5.52435 11.4047H2.85555V16.7999H0.935547ZM2.85555 9.81106H5.44755C6.45874 9.81106 7.17555 9.59347 7.59795 9.15826C8.03314 8.71027 8.25075 8.12146 8.25075 7.39186C8.25075 6.61106 8.03314 6.00946 7.59795 5.58706C7.17555 5.16466 6.45874 4.95346 5.44755 4.95346H2.85555V9.81106Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M15.6714 17.0302C14.7627 17.0302 13.9434 16.819 13.2138 16.3966C12.4971 15.9742 11.9274 15.3854 11.505 14.6302C11.0954 13.8622 10.8906 12.979 10.8906 11.9806C10.8906 10.9566 11.1018 10.067 11.5242 9.31178C11.9466 8.54378 12.5226 7.94858 13.2522 7.52618C13.9818 7.10378 14.8011 6.89258 15.7098 6.89258C16.6314 6.89258 17.4507 7.10378 18.1674 7.52618C18.8842 7.94858 19.4475 8.53738 19.857 9.29258C20.2794 10.0478 20.4906 10.9374 20.4906 11.9614C20.4906 12.9854 20.2794 13.8749 19.857 14.6302C19.4475 15.3854 18.8778 15.9742 18.1482 16.3966C17.4186 16.819 16.593 17.0302 15.6714 17.0302ZM15.6714 15.379C16.1962 15.379 16.6698 15.251 17.0922 14.995C17.5275 14.7389 17.8731 14.3614 18.129 13.8622C18.3978 13.3502 18.5322 12.7166 18.5322 11.9614C18.5322 11.2062 18.4042 10.579 18.1482 10.0798C17.8923 9.56777 17.5467 9.18377 17.1114 8.92778C16.689 8.67178 16.2219 8.54378 15.7098 8.54378C15.1978 8.54378 14.7243 8.67178 14.289 8.92778C13.8538 9.18377 13.5018 9.56777 13.233 10.0798C12.9771 10.579 12.849 11.2062 12.849 11.9614C12.849 12.7166 12.9771 13.3502 13.233 13.8622C13.5018 14.3614 13.8474 14.7389 14.2698 14.995C14.7051 15.251 15.1722 15.379 15.6714 15.379Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M23.9861 16.7999L21.1445 7.12305H23.0453L25.1573 15.1871L24.7925 15.1679L27.1349 7.12305H29.2853L31.6277 15.1679L31.2629 15.1871L33.3557 7.12305H35.2949L32.4533 16.7999H30.4757L28.0181 8.40945H28.4021L25.9445 16.7999H23.9861Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M40.6838 17.0302C39.7622 17.0302 38.9431 16.819 38.2262 16.3966C37.5094 15.9742 36.9463 15.3854 36.5366 14.6302C36.1399 13.8749 35.9414 12.9982 35.9414 11.9998C35.9414 10.9758 36.1399 10.0862 36.5366 9.33098C36.9463 8.56298 37.5094 7.96778 38.2262 7.54538C38.9431 7.11017 39.775 6.89258 40.7222 6.89258C41.6695 6.89258 42.4822 7.10378 43.1606 7.52618C43.8391 7.94858 44.3638 8.51177 44.735 9.21578C45.1063 9.90698 45.2918 10.675 45.2918 11.5198C45.2918 11.6478 45.2854 11.7886 45.2726 11.9422C45.2726 12.083 45.2662 12.2429 45.2534 12.4222H37.343V11.059H43.3718C43.3334 10.2526 43.0646 9.62537 42.5654 9.17738C42.0662 8.71658 41.4454 8.48618 40.703 8.48618C40.1782 8.48618 39.6982 8.60777 39.263 8.85098C38.8279 9.08138 38.4758 9.42698 38.207 9.88778C37.951 10.3358 37.823 10.9054 37.823 11.5966V12.1342C37.823 12.851 37.951 13.459 38.207 13.9582C38.4758 14.4446 38.8279 14.8157 39.263 15.0718C39.6982 15.3149 40.1719 15.4366 40.6838 15.4366C41.2982 15.4366 41.8039 15.3022 42.2006 15.0334C42.5974 14.7646 42.8918 14.3998 43.0838 13.939H45.0038C44.8375 14.5277 44.5558 15.059 44.159 15.5326C43.7623 15.9934 43.2694 16.3582 42.6806 16.627C42.1046 16.8958 41.4391 17.0302 40.6838 17.0302Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M47.041 16.7998V7.12298H48.769L48.9418 8.94698C49.1595 8.51177 49.441 8.14697 49.7866 7.85258C50.1322 7.54538 50.5354 7.30858 50.9962 7.14218C51.4699 6.97577 52.0075 6.89258 52.609 6.89258V8.92778H51.9178C51.5211 8.92778 51.1435 8.97898 50.785 9.08138C50.4267 9.17098 50.1067 9.33098 49.825 9.56138C49.5562 9.79178 49.345 10.1054 49.1914 10.5022C49.0378 10.899 48.961 11.3918 48.961 11.9806V16.7998H47.041Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M58.0842 17.0302C57.1626 17.0302 56.3435 16.819 55.6266 16.3966C54.9098 15.9742 54.3467 15.3854 53.937 14.6302C53.5403 13.8749 53.3418 12.9982 53.3418 11.9998C53.3418 10.9758 53.5403 10.0862 53.937 9.33098C54.3467 8.56298 54.9098 7.96778 55.6266 7.54538C56.3435 7.11017 57.1754 6.89258 58.1226 6.89258C59.0699 6.89258 59.8826 7.10378 60.561 7.52618C61.2395 7.94858 61.7642 8.51177 62.1354 9.21578C62.5067 9.90698 62.6922 10.675 62.6922 11.5198C62.6922 11.6478 62.6858 11.7886 62.6731 11.9422C62.6731 12.083 62.6666 12.2429 62.6538 12.4222H54.7434V11.059H60.7722C60.7338 10.2526 60.4651 9.62537 59.9658 9.17738C59.4666 8.71658 58.8458 8.48618 58.1034 8.48618C57.5786 8.48618 57.0986 8.60777 56.6634 8.85098C56.2283 9.08138 55.8762 9.42698 55.6075 9.88778C55.3514 10.3358 55.2234 10.9054 55.2234 11.5966V12.1342C55.2234 12.851 55.3514 13.459 55.6075 13.9582C55.8762 14.4446 56.2283 14.8157 56.6634 15.0718C57.0986 15.3149 57.5723 15.4366 58.0842 15.4366C58.6986 15.4366 59.2043 15.3022 59.601 15.0334C59.9978 14.7646 60.2922 14.3998 60.4842 13.939H62.4042C62.2379 14.5277 61.9562 15.059 61.5594 15.5326C61.1627 15.9934 60.6698 16.3582 60.081 16.627C59.505 16.8958 58.8395 17.0302 58.0842 17.0302Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M68.7418 17.0305C67.8202 17.0305 67.0073 16.8128 66.3034 16.3777C65.5993 15.9296 65.0489 15.3281 64.6522 14.5729C64.2682 13.8049 64.0762 12.9344 64.0762 11.9617C64.0762 10.9761 64.2682 10.1057 64.6522 9.35047C65.0489 8.59528 65.5993 8.00008 66.3034 7.56487C67.0201 7.11688 67.8394 6.89287 68.761 6.89287C69.5161 6.89287 70.1818 7.04647 70.7578 7.35367C71.3338 7.64807 71.7817 8.07047 72.1018 8.62087V2.97607H74.0218V16.8001H72.2938L72.1018 15.3025C71.9098 15.5969 71.6602 15.8785 71.353 16.1473C71.0458 16.4033 70.6745 16.6145 70.2394 16.7809C69.8041 16.9472 69.3049 17.0305 68.7418 17.0305ZM69.049 15.3601C69.6505 15.3601 70.1818 15.2192 70.6426 14.9377C71.1034 14.6561 71.4553 14.2592 71.6986 13.7473C71.9545 13.2353 72.0826 12.6401 72.0826 11.9617C72.0826 11.2833 71.9545 10.6945 71.6986 10.1953C71.4553 9.68327 71.1034 9.28648 70.6426 9.00487C70.1818 8.71048 69.6505 8.56327 69.049 8.56327C68.473 8.56327 67.9546 8.71048 67.4938 9.00487C67.033 9.28648 66.6745 9.68327 66.4186 10.1953C66.1625 10.6945 66.0346 11.2833 66.0346 11.9617C66.0346 12.6401 66.1625 13.2353 66.4186 13.7473C66.6745 14.2592 67.033 14.6561 67.4938 14.9377C67.9546 15.2192 68.473 15.3601 69.049 15.3601Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M86.072 17.0305C85.5472 17.0305 85.0672 16.9537 84.632 16.8001C84.2096 16.6592 83.8384 16.4609 83.5184 16.2049C83.1984 15.9488 82.9296 15.6545 82.712 15.3217L82.52 16.8001H80.792V2.97607H82.712V8.64007C83.0192 8.15368 83.448 7.74407 83.9984 7.41127C84.5616 7.06567 85.2528 6.89287 86.072 6.89287C86.9936 6.89287 87.8064 7.11688 88.5104 7.56487C89.2144 8.00008 89.7584 8.60167 90.1424 9.36967C90.5392 10.1249 90.7376 10.9953 90.7376 11.9809C90.7376 12.9409 90.5392 13.8049 90.1424 14.5729C89.7584 15.3409 89.2144 15.9425 88.5104 16.3777C87.8064 16.8128 86.9936 17.0305 86.072 17.0305ZM85.7648 15.3601C86.3536 15.3601 86.872 15.2192 87.32 14.9377C87.7808 14.6561 88.1392 14.2592 88.3952 13.7473C88.664 13.2353 88.7984 12.6401 88.7984 11.9617C88.7984 11.2833 88.664 10.6945 88.3952 10.1953C88.1392 9.68327 87.7808 9.28648 87.32 9.00487C86.872 8.71048 86.3536 8.56327 85.7648 8.56327C85.1632 8.56327 84.632 8.71048 84.1712 9.00487C83.7232 9.28648 83.3712 9.68327 83.1152 10.1953C82.8592 10.6945 82.7312 11.2833 82.7312 11.9617C82.7312 12.6401 82.8592 13.2353 83.1152 13.7473C83.3712 14.2592 83.7232 14.6561 84.1712 14.9377C84.632 15.2192 85.1632 15.3601 85.7648 15.3601Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M92.9027 21.0239L95.2643 15.7247H94.7075L90.8867 7.12305H92.9603L95.9939 14.1503L99.0467 7.12305H101.063L94.9187 21.0239H92.9027Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M165.706 12C165.706 5.38235 159.958 0 152.911 0C149.968 0 146.768 1.45589 143.378 4.32353C141.779 5.68235 140.389 7.12942 139.338 8.29412C135.683 4.35882 130.765 0 125.857 0C119.926 0 114.762 3.96176 113.41 9.21176C113.41 9.20294 113.41 9.20294 113.419 9.19411C113.419 9.20294 113.419 9.20294 113.41 9.21176C113.181 10.1118 113.062 11.0382 113.062 12C113.062 18.6176 118.72 24 125.766 24C128.71 24 132 22.5442 135.39 19.6765C136.99 18.3176 138.379 16.8706 139.43 15.7058C143.095 19.65 148.012 24 152.92 24C158.851 24 164.015 20.0382 165.368 14.7882C165.587 13.8882 165.706 12.9618 165.706 12ZM140.326 8.28529C141.523 6.97942 142.711 5.82353 143.862 4.85294C147.116 2.1 150.16 0.705882 152.911 0.705882C159.564 0.705882 164.975 5.77058 164.975 12C164.975 12.8735 164.866 13.7471 164.646 14.5942C164.609 14.6911 164.171 15.8647 162.91 17.0029C161.264 18.4853 159.043 19.2353 156.301 19.2353C159.253 18 161.32 15.2118 161.32 12C161.32 7.63235 157.544 4.07647 152.911 4.07647C151.102 4.07647 148.889 5.17058 146.33 7.34118C145.178 8.31176 144.018 9.45882 142.784 10.8265L142.3 11.3647L139.823 8.81471L140.326 8.28529ZM135.956 12.1147C134.978 13.2353 133.572 14.7618 131.954 16.1294C128.938 18.6794 126.982 19.2176 125.857 19.2176C121.626 19.2176 118.18 15.9794 118.18 12C118.18 8.04706 121.626 4.80882 125.857 4.78235C126.013 4.78235 126.196 4.8 126.425 4.83529C128.609 5.64706 130.555 6.92647 131.725 7.96765C132.676 8.80589 134.384 10.5177 135.956 12.1147ZM138.443 15.7147C137.245 17.0206 136.057 18.1765 134.906 19.1471C131.698 21.8647 128.536 23.2942 125.766 23.2942C122.558 23.2942 119.542 22.1206 117.285 19.9765C115.037 17.85 113.794 15.0176 113.794 12C113.794 11.1265 113.903 10.2529 114.123 9.40589C114.159 9.30882 114.598 8.13529 115.859 6.99706C117.504 5.51471 119.725 4.76471 122.467 4.76471C119.515 6 117.449 8.78824 117.449 12C117.449 16.3676 121.224 19.9235 125.857 19.9235C127.668 19.9235 129.88 18.8294 132.438 16.6589C133.59 15.6882 134.75 14.5411 135.984 13.1735L136.469 12.6353C136.469 12.6353 138.908 15.15 138.928 15.1765L138.443 15.7147ZM142.812 11.8853C143.79 10.7647 145.196 9.23824 146.815 7.87058C149.831 5.32058 151.787 4.78235 152.911 4.78235C157.142 4.78235 160.588 8.02058 160.588 12C160.588 15.9529 157.142 19.1911 152.911 19.2176C152.755 19.2176 152.573 19.2 152.344 19.1647C152.344 19.1647 152.344 19.1647 152.353 19.1647C150.169 18.3529 148.222 17.0647 147.043 16.0235C146.093 15.1942 144.384 13.4824 142.812 11.8853ZM165.349 14.7971C165.349 14.7882 165.349 14.7882 165.349 14.7882V14.7971Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M171.272 16.9765V7.00586H174.05V16.9765H171.272Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M182.633 16.9765L179.05 11.0559V16.9765H176.354V7.00586H179.498L182.715 12.4235V7.00586H185.421V16.9765H182.633Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M192.594 9.49409V16.9765H189.852V9.49409H186.882V7.00586H195.573V9.49409H192.594Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M197.036 7.00586H203.653V9.28232H199.751V10.8617H203.306V13.0589H199.751V14.6647H203.681V16.9853H197.036V7.00586Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M205.617 16.9765V7.00586H209.977C212.079 7.00586 213.441 8.35586 213.441 10.2088C213.441 11.5588 212.673 12.5558 211.531 12.9971L213.487 16.9765H210.525L208.89 13.3589H208.323V16.9765H205.617ZM209.466 11.3382C210.279 11.3382 210.699 10.8882 210.699 10.2529C210.699 9.61762 210.279 9.18526 209.466 9.18526H208.332V11.3382H209.466Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M221.493 16.9765L217.91 11.0559V16.9765H215.214V7.00586H218.358L221.575 12.4235V7.00586H224.281V16.9765H221.493Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M226.594 7.00586H233.211V9.28232H229.308V10.8617H232.863V13.0589H229.308V14.6647H233.238V16.9853H226.594V7.00586Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M240.494 9.49409V16.9765H237.752V9.49409H234.782V7.00586H243.474V9.49409H240.494Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M250.155 11.9999C250.155 13.6587 251.38 14.6117 252.631 14.6117C254.058 14.6117 254.67 13.7557 254.89 13.0499L257.458 13.7646C257.046 15.2381 255.684 17.1793 252.623 17.1793C249.753 17.1793 247.331 15.1675 247.331 11.9999C247.331 8.82339 249.79 6.78516 252.586 6.78516C255.557 6.78516 256.909 8.53221 257.339 10.0234L254.817 10.8528C254.625 10.191 254.076 9.31752 252.613 9.31752C251.443 9.32634 250.155 10.1822 250.155 11.9999Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M263.627 6.79395C266.468 6.79395 268.927 8.76159 268.927 11.9998C268.927 15.238 266.468 17.2057 263.627 17.2057C260.784 17.2057 258.325 15.238 258.325 11.9998C258.325 8.76159 260.784 6.79395 263.627 6.79395ZM263.627 14.6557C264.833 14.6557 266.122 13.8263 266.122 11.9822C266.122 10.1645 264.842 9.33511 263.627 9.33511C262.411 9.33511 261.131 10.1645 261.131 11.9822C261.131 13.8263 262.42 14.6557 263.627 14.6557Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M279.731 16.9765V10.8L277.473 16.9765H275.316L273.077 10.8706V16.9765H270.481V7.00586H274.11L276.421 13.0853L278.634 7.00586H282.363V16.9765H279.731Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M287.371 13.5794V16.9852H284.665V7.01465H288.787C290.945 7.01465 292.416 8.38229 292.416 10.3058C292.416 12.2734 290.945 13.5794 288.787 13.5794H287.371ZM288.44 11.3911C289.153 11.3911 289.674 10.9852 289.674 10.3058C289.674 9.59994 289.153 9.2117 288.44 9.2117H287.389V11.3911H288.44Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M293.823 13.3235V7.00586H296.546V13.2353C296.546 14.2235 297.068 14.7441 297.973 14.7441C298.878 14.7441 299.389 14.2235 299.389 13.2353V7.00586H302.113V13.3235C302.113 15.8294 300.376 17.2058 297.973 17.2058C295.578 17.2058 293.823 15.8294 293.823 13.3235Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M309.278 9.49409V16.9765H306.536V9.49409H303.566V7.00586H312.258V9.49409H309.278Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M313.729 7.00586H320.346V9.28232H316.444V10.8617H319.999V13.0589H316.444V14.6647H320.374V16.9853H313.729V7.00586Z"
      fill={props.color ?? "#A9AAAD"}
    />
    <path
      d="M322.394 16.9765V7.00586H326.753C328.856 7.00586 330.218 8.35586 330.218 10.2088C330.218 11.5588 329.45 12.5558 328.307 12.9971L330.263 16.9765H327.302L325.666 13.3589H325.1V16.9765H322.394ZM326.242 11.3382C327.054 11.3382 327.476 10.8882 327.476 10.2529C327.476 9.61762 327.054 9.18526 326.242 9.18526H325.108V11.3382H326.242Z"
      fill={props.color ?? "#A9AAAD"}
    />
  </svg>
);
