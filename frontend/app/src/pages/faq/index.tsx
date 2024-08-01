import { MdPreview } from "@components/md-preview";
import { Page } from "@components/page";
import { Spoiler } from "@components/spoiler";

const cH = `This FAQ is designed to be helpful for contributors. You can easily navigate through it to find the information you need.

If you have any further questions, please don't hesitate to reach out to us on [Telegram](https://t.me/fortmajoricp). We would be glad to help you and might even add your topic to this FAQ.

Most of Fort Major tasks are related to MSQ now. MSQ is a MetaMask Snap based wallet, a payment method and an authorization provider for the Internet Computer. 

To always keep updated follow us on [X](https://x.com/msqwallet) and [DFINITY Forum](https://forum.dfinity.org/t/msq-hits-the-metamask-snap-store/30499/24)`;

const a1 = `Fort Major is a Decentralized Autonomous Organization (DAO) that allows contributors from all over the world to participate in the development, management and improvement of Fort Major projects for some benefits such as Rewards and Reputation.

In short, it works as follows:

1. Find the task you are ready and able to solve
2. Propose your solution
3. Receive Rewards and Reputation
4. Exchange Rewards for FMJ and ICP tokens
5. Use Reputation to govern the DAO and evaluate task solutions

To know more about Tasks, Rewards and Reputation go to the sections below (link to the valid section).`;

const a2 = `We believe that there is always valuable work and a significant product behind a successful and thriving token. By contributing to Fort Major, you have the opportunity to increase your income based on the Rewards you earn for your efforts. This approach ensures that you remain invested in the success of the DAO and continue to be an active participant.`;

const a3 = `There are 4 main things to highlight:

#### Equality

There is no special allocation for the Team, and you can anonymously contribute from anywhere in the world. There are no investors, so let’s just work together. 

#### You Do — You Get

We provide tasks for people with different levels of knowledge and expertise. The more you do, the more Rewards and Reputation you get. Only you control it. Note that Rewards and Reputation are minted only when a task is solved. 

*If you notice there is no task for you, please don’t hesitate to reach out to us on [Telegram](https://t.me/fortmajoricp). We’ll discuss it and propose a solution.*

#### Ownership

Solving tasks grants you not only Rewards but also Reputation, which gives you voting power within Fort Major. Reputation cannot be bought or sold. It measures the level of involvement and trust in the decision-making process. If you don’t want to participate in voting, you can simply not request Reputation while solving the tasks.

#### The Team

Yes, we follow the same exact rules. We create all tasks and sometimes solve some of them. We also receive Rewards and Reputation only when it’s confirmed by those who vote with their Reputation. There is more power in being a team member, but it also comes with big responsibility.`;

const a4 = `You can sign up using MetaMask MSQ Snap ([link to MSQ](https://icp.msq.tech/)) created by us. It is fully anonymous: you can have multiple accounts for various sites, store your assets, and make it your day-to-day crypto wallet. **At the moment, only Desktop devices are supported!**`;

const a5 = `To view tasks, click “Tasks” at the top of the site. A task can be in one of five stages:

**Draft:** The task creator can freely configure and modify the task. Once satisfied, the creator moves the task to the Draft Review stage.

**Draft Review:** In this stage, the task is frozen and cannot be edited. Community members with reputation vote on whether the task is ready for solving. If rejected, it returns to the Draft stage for adjustments or deletion. If approved, it advances to the In-Progress stage.

**In-Progress:** Solvers can attach their solutions to the task. This stage ends after a set number of days or immediately if a team member decides, based on the "Days To Solve" parameter.

**Evaluation:** Reputation holders assess the attached solutions and adjust the reward based on the quality of the solutions.

**Archived:** Finished tasks are stored in the Archive for transparency.`;

const a6 = `Contributors receive Storypoints. Team members receive Hours and Storypoints.

- **Hours** represent the time needed to solve the task.
- **Storypoints** reflect the task’s usefulness and complexity. It ranges from 0 to 10.
    - **Usefulness**: How beneficial the task is to the project.
    - **Complexity**: The level of difficulty involved in completing the task.

Both Storypoints parameters are rated on a scale from 0 to 10. The average of these ratings determines the number of Storypoints assigned to a task.

**Example 1:** A task requiring the implementation of a new feature that significantly improves user experience and involves complex coding might be awarded 8.5 Storypoints for its high usefulness and complexity:

- Usefulness: 8/10
- Complexity: 9/10

**AVG: 8/10**

**Example 2:** A task requiring the creation of a Twitter post content plan for the next month might be awarded 5 Storypoints. This task has high usefulness as it ensures consistent and strategic social media engagement with some impact by potentially increasing follower engagement and brand visibility, and it is not so complex and involves some creativity, scheduling, and alignment with the project's marketing goals:

- Usefulness: 7/10
- Complexity: 3/10

**AVG: 5/10**`;

const a7 = `Base rewards are given to all approved contributors (if the proposed solution doesn’t suit the task at all, it might be rejected by the voting), while Additional rewards depend on the evaluation score of the solution. Higher scores yield higher additional rewards.

**Example**:

- Storypoints are set to 5. That is the fixed amount that all contributors receive when their work is accepted.
- Additional Storypoints set a maximum of 10 Additional Storypoints possible.

Let's say we have the following contributors and their additional rewards:

1. **Contributor A**: His work was rated good by evaluators and he received 8 Additional Storypoints.
2. **Contributor B**: The evaluation shown his work is average so he received 5 Additional Storypoints.
3. **Contributor C**: Successfully performed the task but the solution doesn’t suit current requirements at all so he received only 2 Additional Storypoints.
4. **Contributor D:** It’s been decided that his work doesn’t relate to the task at all. Thus he didn’t receive neither Storypoints nor Additional Storypoints

The amount of Additional Storypoints is not divided among all the contributors. For example, it is possible that we have 10 contributors and 10 Additional Storypoints available. In this case, all 10 contributors might receive 10 Additional Storypoints each for their excellent performance, or all 10 contributors might receive 0 Additional Storypoints if their solutions are not related to the task at all.`;

const a8 = `Rewards can be converted into FMJ (Fort Major token) or ICP according to the current exchange rate. The mentioned tokens can then be withdrawn (*The possibilities to exchange FMJ are coming soon)*. It can be done in “Me” tab when you are logged in.`;

const a9 = `Reputation is calculated using the formula: Hours + Storypoints. It allows participation in voting and evaluation. The more your contribution is, the more decision-making Reputation amount you have.

You can choose whether you want to receive it or not. Please don’t choose to receive it if you don’t want to evaluate or vote`;

const a10 = `Solutions are typically submitted as links, such as Github commits for code or Figma links for designs but might be other links, text, or blank if needed.

Reputation holders then vote to confirm that the contributor receives their Storypoints and determine the amount of Additional Storypoints (if any) awarded for the task.`;

const a11 = `MSQ is still in Beta and problems like this can happen. We're constantly working on improvements and we are aware of the problem.

What you can do now to resolve the issue right now:

* **Update your browser to the latest version.** Outdated browser is the most common problem and there is a 90% chance this will help you.
* **Try reinstalling MetaMask.** Sometimes old stale data prevents MetaMask from working properly.
* **Try a different browser.** MSQ is available everywhere where MetaMask is. If you're using Chrome, try Firefox and vice-versa.

But if nothing helps, reach us out via [Telegram](https://t.me/fortmajoricp/16). We'll do our best to help you as soon as we can.`;

const a12 = `Reputation decays over time if you are inactive. Each month the system will deduct some amount of Reputation, if you don't earn new reputation during this time. The amount deducted is \`sqrt(x)\` - so the less Reputation you have the bigger percentage of it will be deducted.`;

export function FAQPage() {
  return (
    <Page slim class="pb-20 pt-20 px-5 sm:px-20 gap-20">
      <h1 class="font-primary font-semibold text-black text-6xl self-stretch">
        FAQ
      </h1>
      <MdPreview content={cH} />
      <div class="flex flex-col self-stretch gap-10">
        <h2 class="font-primary font-semibold text-black text-4xl self-stretch">
          General Information
        </h2>
        <Spoiler header="What is Fort Major and how does it work?" text={a1} />
        <Spoiler header="Why don’t you just give away your token?" text={a2} />
        <Spoiler
          header="What is so special about Fort Major for me to commit?"
          text={a3}
        />
        <Spoiler header="How can I register here?" text={a4} />
        <Spoiler
          header="I can't log in! The MetaMask button is unresponsive! What do I do?"
          text={a11}
        />
      </div>
      <div class="flex flex-col self-stretch gap-10">
        <h2 class="font-primary font-semibold text-black text-4xl self-stretch">
          Rewards, Tasks and Solutions
        </h2>
        <Spoiler header="What are the stages for the tasks?" text={a5} />
        <Spoiler
          header="What types of rewards are there for solving a task?"
          text={a6}
        />
        <Spoiler
          header="What is the difference between Base and Additional Storypoint rewards?"
          text={a7}
        />
        <Spoiler header="How can rewards be converted?" text={a8} />
        <Spoiler
          header="What is Reputation and how is it calculated?"
          text={a9}
        />
        <Spoiler header="How are solutions submitted and rated?" text={a10} />
        <Spoiler header="Is Reputation permanent?" text={a12} />
      </div>
    </Page>
  );
}
