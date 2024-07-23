# Everything about tasks

## Task lifecycle

A task can be in one of 5 different stages:

* Draft
* Draft Review
* In-Progress
* Evaluation
* Archived

When a task is just created it starts with the Draft stage. During this stage the creator of the task can manipulate it freely, configuring it as they wish. After everything looks fine to the creator, they transition it into the Draft Review stage.

In Draft Review stage, the task is frozen - it can't be edited. During this stage, other people with reputation vote on whether the task is good enough to be solved. If the people vote against the task, it returns back to the Draft stage (so the creator could make adjustments and try again or delete it completely). If the people vote for the task, it transitions into In-Progress stage.

During In-Progress stage solvers can attach solutions to the task. This stage can be completed either after a certain amount of days or immediately by any team member, depending on the "Days To Solve" task parameter.

When all solutions are attached, the Evaluation stage starts. During this stage, people with reputation can evaluate solutions, adjusting the reward the solver would get receive, in case their solution is approved.

And after that, when all solutions are properly evaluated, the task transitions into the Archived state, where it will eventually be transferred to a special archive canister to rest in peace for transparency reasons.

## How to define a good task

As a team member, you want to progress quickly, so you are motivated to define tasks which are both:

* easy to understand;
* easy to solve and evaluate.

Here at Fort Major we're all about efficiency and self-management.
Which means that most of the time you would create tasks, which you're going to solve by yourself. And while it's tempting to define those tasks "your way", **don't do that**.

First of all, a clearly defined task (goal) will make your own work simpler and faster.
Second, we are a DAO and we value transparency. Tasks are public (even drafts) so any other contributor (or even some walking by stranger) should be able to understand the work we're doing here.
Third, your work is evaluated with reputation, which means that other contributors will have to understand it in order to evaluate the solution correctly.
Forth, sometimes you're going to define tasks for other people to solve (or even public ones), but if these tasks are defined poorly, those people won't be able to solve them.

Also, our tasks are nothing like tasks in Jira or any other platform, because our tasks have money attached to them. This implies an absolutely different level of care that has to be given when defining tasks.

### Title

The title should clearly reflect what is the goal of this task - what should be the solution for it. It should express the goal fully, but be concise at the same time.

`good` - Post a creative tweet about MSQ's new "Payments" feature
`bad`  - Promote MSQ
`bad`  - Promote MSQ by posting a non-trivial tweet about MSQ's new "Payments" feature which is how MSQ is similar to Stripe

Sometimes, it is a good idea to also add **hints** to the title, which would quickly give a better understanding of the thematics of the task and what skills does a solver need to solve it. **Hints** are given in square brackets before the title. But don't overdo it, please. Examples:

* [MSQ] [Twitter] Make a creative post about the "Payments" feature
* [MSQ] [Backend] Fix incorrectly calculated fees
* [FMJ] Create a set of vector illustrations
* [FMJ] [Important Details Inside] Plan the next sprint (04/12/24 - 28/12/24)

Do not add hints that dublicate Tags!

### Tags

Tags are super-important! It is crucial to set the tags of a task correctly, because voting power delegation works based on presence of particular tags in the task.

Currently there are 6 tags:

* `Governance`
* `Development`
* `Marketing`
* `Design`
* `Documentation`
* `Testing`

You can attach any subset of tags to a task, but a if you need more than one it is a good sign that your task is too broad (or your team is missing a specialist) and you better consider splitting it into multiple tasks.

#### `Governance`

This tag defines management tasks. We don't have a lot of them, since many of our management activities are automated via the votings. But sometimes it is necessary to create such tasks anyway. For example:

* You want to interview a new team member candidate. To do that, you have to arrange a call with them and the rest of the team. This call takes time from each invitee's schedule, so a task has to be created for such an event. This task will have the `Governance` tag.
* You want to set up a new Liquidity Pool so people could swap FMJ for other tokens. This takes time and needs a task. This task will have the `Governance` tag.

So, this tag is mostly used when something is about to happen in your organization that does not directly affect any of the projects, but instead affects the DAO itself in some management-related way.

#### `Development`

This tag defines tasks which are related to code. New features, code reviews, bug fixes, refactors, automated tests, etc.

#### `Marketing`

Marks tasks which are related to telling other people about our projects or the DAO itself. Tweets, articles, videos, podcasts, events and other.

#### `Design`

Marks tasks which are related to visuals, UI and UX. Figmas, illustrations, images, 2D/3D graphics, etc.

#### `Documentation`

Similar to `Marketing`, but the goal here is not to get people's attention, but instead to describe something in deep. Tech designs, concepts, education materials, code comments, etc.

#### `Testing`

Marks tasks which are related to trying a product/feature and report any findings and/or feedback.

### Description

The description is self-explanatory. This is essentially the same as the Title, but requires you to define every little detail about the task. The UI provides a default template for the description, which is straghtforward. Please, follow this template or go beyond it if you have any additional information that might help people understand the task and how it can be solved.

### Days To Solve

This is a numeric field, which expects you to enter a number of days the system would guarantee for solvers to come up with a solution. In other words, when this field is set to **0** (by default), any team member can transition the task into the Evaluation stage at any moment. But if it is set to some number, for example **5**, this would mean, that nobody will be able to transition this task to the Evaluation stage, until these 5 days elapse.

This is a fool-protection mechanism and is useful for public tasks - when you want to guarantee contributors certain period of time to solve the task.

### Max Solutions Number

Each solver can attach only one solution to a particular task. By tweaking this number, we can limit the number of solutions we accept for the task. For example, if this number is set to **10**, it means that only first 10 solutions will be added to the task and all the others will be rejected.

### Rewards

There are two kinds of rewards given to you when you solve a task: Hours and Storypoints. Both these terms are borrowed directly from [Agile](https://en.wikipedia.org/wiki/Agile_software_development) and they keep their original meaning.

Hours are subjective and they represent the amount of time a solver needs to solve the task. The same task can be solved by different people in different amount of hours.

Storypoints are "somewhat objective" and they represent a relative "usefulness" or "impact" or "complexity" of the task in comparison with other tasks for a particular project. The same task done a year ago and now has to be worth the same number of storypoints. While the task is still as useful as it was a year ago now, the project did grew over this time and this task's relative contribution will automatically be lower now, because of the inflation.

Both rewards can be swapped into FMJ or ICP according to the current exchange rate. FMJ and ICP then can be withdrawn at will.

Additionaly with rewards, each solver can request reputation to be given to them. The reputation is issued by using this formula: *hours + storypoints*. This reputation is then can be used to participate in votings and evaluate other people's solutions.

#### How to estimate the rewards

First of all, tasks which do not impact any particular project directly (meetings, bugfixes, refactors, cleanups, etc.) **should never be rewarded with storypoints**. Only this way storypoints can represent the "usefulness" or the "impact" of a task. In other words, if the task you're estimating is not a new feature and is not useful for the users of our projects, there should be no storypoint reward for this task - only hours.

Second thing. Tasks should always reward with hours if the solver is the team member. Hours for team members are a way to justify their time commitment.

Given this, here are some guidelines on how to estimate particular types of tasks.

* **meetings, bugfixes, refactors, cleanups, old tests, etc**: only hours, as participants would estimate themself;
* **downtime** (when you are a team member and there are no tasks available for you to solve): only hours, (*your weekly commitment* **-** *hours spent on solving other tasks*);
* **new features, new content, new designs, new tests, integrations and other impactful things**: if done by a team member - storypoints + hours; if done by a contributor - only storypoints.

#### Base and Additional Storypoint reward

Each task allows to define Base and Additional Storypoint reward. The Base reward will be given to every solver, whose solution was not rejected. The additional reward will only be given to a solver if their solution is evaluated positively and the actual received amount depends on the evaluation of a particular solution. 

For example let's imagine we set the Base reward for 10 Storypoints and the Additional reward for another 10 Storypoints. This means that an approved solver would receive at least 10 Storypoints and at most 20 Storypoints, depending on the evaluation. If they score 5.0 points (stars), they get all 20 (10 Base + 10 Additional) Storypoints. If they score 2.5 stars, they get 15 (10 Base + 5 Additional) Storypoints. If they score 1 star, they get 11 (10 Base + 1 Additional) Storypoints.

This way we can differentiate solutions by quality/creativity/etc and reward better solutions more.

### Solution Fields

Usually, we accept links as solutions. For code, this can be Github commit links. For designs, this can be Figma links. For marketing tasks this can be links to Twitter, Youtube and so on. 

To make it easier for solvers to supply what we expect from them, there is a Solution form constructor. It allows you to define, how many fields (links) do we expect from a solver, what type they are (to what website do they lead) and what information exactly should they lead to.

For example, if you want solvers to publish a series of tweets about some feature, you could use the constructor to add 3 fields of type "Twitter Link" and name them "Link 1", "Link 2", "Link 3" or something like that.
