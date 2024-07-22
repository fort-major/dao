import { ROOT } from "@/routes";
import { Btn } from "@components/btn";
import { ComingSoonText } from "@components/coming-soon-text";
import { EIconKind, Icon } from "@components/icon";
import { Page } from "@components/page";
import { ProjectCard } from "@components/project-card";
import { Stat } from "@components/stat";
import { A } from "@solidjs/router";
import { useBank } from "@store/bank";
import { useHumans } from "@store/humans";
import { useTasks } from "@store/tasks";
import { COLORS } from "@utils/colors";
import { Show } from "solid-js";

export function HomePage() {
  const { totals, decentralization } = useHumans();
  const { fmjStats } = useBank();
  const { taskStats } = useTasks();

  const cardClass = "";

  return (
    <Page>
      <div class="flex gap-5 items-center justify-center min-h-[700px]">
        <h1 class="font-primary font-bold text-[250px] leading-[0.8]">
          <i class="italic">F</i>ort <br /> <i class="italic">M</i>ajor
        </h1>
        <div class="flex flex-col items-center justify-center gap-8">
          <h2 class="font-primary font-normal text-4xl text-center">
            A Fair, Open, Robust and Transparent digital organization with an
            uplifting vibe
          </h2>
          <div class="flex gap-6 items-center">
            <A href={ROOT.$.tasks.path}>
              <Btn
                text="Start Contributing"
                icon={EIconKind.ArrowUpRight}
                iconColor={COLORS.green}
              />
            </A>
            <a href="https://t.me/fortmajoricp" target="_blank">
              <Icon kind={EIconKind.Telegram} />
            </a>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-10">
        <h3 class="font-primary font-bold text-2xl">Our Projects</h3>
        <div class="flex gap-5 justify-between flex-wrap">
          <a href="https://icp.msq.tech" target="_blank">
            <ProjectCard kind="msq" class={cardClass} />
          </a>
          <A href={ROOT.path}>
            <ProjectCard kind="fmj" class={cardClass} />
          </A>
          <ProjectCard kind="soon" class={cardClass} />
          <ProjectCard kind="soon" class={cardClass} />
        </div>
      </div>
      <div class="flex flex-col gap-10">
        <h3 class="font-primary font-bold text-2xl">How It Works</h3>
        <div class="flex flex-col gap-2">
          <div class="flex gap-16 items-center">
            <p class="font-mono italic font-bold text-9xl">1</p>
            <h4 class="font-primary font-normal text-4xl">
              Solve <b class="font-bold">Tasks</b>
            </h4>
          </div>
          <div class="flex gap-16 items-center">
            <p class="font-mono italic font-bold text-9xl">2</p>
            <h4 class="font-primary font-normal text-4xl">
              Earn <b class="font-bold">Rewards</b> and{" "}
              <b class="font-bold">Reputation</b>
            </h4>
          </div>
          <div class="flex gap-16 items-center">
            <p class="font-mono italic font-bold text-9xl">3</p>
            <h4 class="font-primary font-normal text-4xl">
              Exchange <b class="font-bold">Rewards</b> for{" "}
              <b class="font-bold">FMJ</b>, <b class="font-bold">ICP</b> or{" "}
              <ComingSoonText /> other tokens
            </h4>
          </div>
          <div class="flex gap-16 items-center">
            <p class="font-mono italic font-bold text-9xl">4</p>
            <h4 class="font-primary font-normal text-4xl">
              Use <b class="font-bold">Reputation</b> to{" "}
              <b class="font-bold">govern</b> the DAO,{" "}
              <b class="font-bold">evaluate</b> task solutions and{" "}
              <ComingSoonText /> receive dividends
            </h4>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-10">
        <h3 class="font-primary font-bold text-2xl">About</h3>
        <div class="grid grid-cols-2 gap-y-5 gap-x-10">
          <div class="flex flex-col gap-3">
            <h4 class="font-primary font-bold">Same Rules for Everyone</h4>
            <p>
              Both: Raputation and FMJ can only be minted when a task is solved.
              There is no special allocation for the Team. There are no seed,
              pre-seed or other investors. We're all in the same boat here.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <h4 class="font-primary font-bold">Reputation = Ownership</h4>
            <p>
              When you solve a task, you have a right to request Reputation for
              your commitment. This gives you the ability to express your
              opinion in various votings happening within Fort Major. The more
              Reputation you have, the stronger your voice. Reputation is
              Soulbound - you can't buy or sell it.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <h4 class="font-primary font-bold">Fair Distribution</h4>
            <p>
              We want to build a DAO that is fully owned by those, who
              contribute to it. We have all the tools to do it in a fair way.
              The more tasks you do, and the harder they are, the more
              Reputation and Rewards you get.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <h4 class="font-primary font-bold">Flexible and Inclusive</h4>
            <p>
              If you can't find a task matching your skillset, or you have a
              creative idea for something you could do, don't hesitate to reach
              us out via Telegram - we could use any help, and we'll make sure
              to reward you fairly.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <h4 class="font-primary font-bold">Good Side Hustle</h4>
            <p>
              Anyone can become a contributor and solve public tasks. We do our
              best to keep plenty of tasks available for you to participate at
              any time. By the way, you can remain completely anonymous while
              contributing.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <h4 class="font-primary font-bold">The Team</h4>
            <p>
              The Team itself follows the same exact rules. We also create tasks
              for ourselves, solve them and then anyone with Reputation
              evaluates our solutions. There is more power in being a Team
              member, but it is also a bigger responsibility.
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <h4 class="font-primary font-bold">Ready for More?</h4>
            <p>
              If you want to join the Team, and you're feeling comfortable being
              paid in a new cryptocurrency without a lot of liquidity (FMJ),
              reach us out via Telegram. We have a plenty of open positions and
              we're looking forward to meet you.
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-10">
        <h3 class="font-primary font-bold text-2xl">Statistics</h3>
        <div class="flex flex-wrap gap-x-24 gap-y-5 justify-between">
          <Stat
            data={totals().reputation.toPrecision(2, true)}
            title="total reputation"
          />
          <Stat
            data={decentralization().toPercent().toPrecision(2, true) + "%"}
            title="decentralization"
          />
          <Stat
            data={totals().storypoints.toPrecision(2, true)}
            title="total storypoints"
          />
          <Stat
            data={totals().hours.toPrecision(2, true)}
            title="total hours"
          />
          <Stat data={totals().contributors.toString()} title="contributors" />
          <Stat
            data={taskStats().readyToSolveTasks.toString()}
            title="in-progress tasks"
          />
          <Stat
            data={taskStats().solvedTasks.toString()}
            title="solved tasks"
          />
          <Stat
            data={fmjStats().totalSupply.toPrecision(2, true)}
            title="total FMJ supply"
          />
          <Show when={!fmjStats().totalSupply.isZero()}>
            <Stat
              data={
                fmjStats()
                  .avgMonthlyInflation.div(fmjStats().totalSupply)
                  .toPercent()
                  .toPrecision(2, true) + "%"
              }
              title="FMJ monthly inflation"
            />
          </Show>
        </div>
      </div>
      <div class="flex min-h-32 items-center justify-center gap-6">
        <A href={ROOT.$.tasks.path}>
          <Btn
            text="Start Contributing"
            icon={EIconKind.ArrowUpRight}
            iconColor={COLORS.green}
          />
        </A>
        <a href="https://t.me/fortmajoricp" target="_blank">
          <Icon kind={EIconKind.Telegram} />
        </a>
      </div>
    </Page>
  );
}
