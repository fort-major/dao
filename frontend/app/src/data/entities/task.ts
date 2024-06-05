import { Principal } from "@dfinity/principal";
import {
  TMarkdown,
  TMilestoneId,
  TSprintId,
  TE8s,
  TTaskTagId,
  TTaskId,
  TTeamId,
  TTimestamp,
} from "../../utils/types";
import { ErrorCode, err } from "../../utils/error";

export enum ETaskStatus {
  Created = "Created",
  Approved = "Approved",
  InProgress = "In Progress",
  InReview = "In Review",
  Completed = "Completed",
  Rejected = "Rejected",
}

export interface ITaskInternalDetails {
  assignee?: Principal;
  sprintId?: TSprintId;
  hoursToProcess?: TE8s;
}

export interface ITaskExternalDetails {
  assignees: Principal[];
  schedule: ISchedule;
}

export type TTaskKind =
  | { Internal: ITaskInternalDetails }
  | { External: ITaskExternalDetails };

export interface ITask {
  id: TTaskId;
  milestoneId: TMilestoneId;
  teamId: TTeamId;
  tagIds: TTaskTagId[];
  title: string;
  description: TMarkdown;
  utility: TUtility;
  status: ETaskStatus;
  kind: TTaskKind;
}

export type TUtility =
  | { Fixed: { storypointsReward: TE8s } }
  | { Dynamic: { storypointsBudget: TE8s } };

export interface ISchedule {
  approveBy: TTimestamp;
  processBy: TTimestamp;
  reviewBy: TTimestamp;
}

export function taskKind(task: ITask): "External" | "Internal" {
  return "External" in task.kind ? "External" : "Internal";
}

export function externalTaskDetails(task: ITask) {
  return "External" in task.kind
    ? task.kind.External
    : err(ErrorCode.UNREACHEABLE, `the task #${task.id} is not external`);
}

export function internalTaskDetails(task: ITask) {
  return "Internal" in task.kind
    ? task.kind.Internal
    : err(ErrorCode.UNREACHEABLE, `the task #${task.id} is not internal`);
}

const mockDesk = `# Project Task: Develop User Authentication Module
    
## Overview
The goal of this task is to develop a robust and secure user authentication module for our web application. This module will handle user registration, login, password recovery, and user session management. The module should be designed to integrate seamlessly with our existing application architecture and adhere to best practices for security and user experience.

## Objectives
1. **User Registration**
    - Create a registration form that collects necessary user information such as username, email, and password.
    - Implement validation for form inputs to ensure data integrity (e.g., email format, password strength).
    - Store user information securely in the database, with passwords hashed using a strong hashing algorithm (e.g., bcrypt).

2. **User Login**
    - Develop a login form that allows users to authenticate using their email and password.
    - Implement error handling for invalid login attempts and display appropriate error messages.
    - Establish a user session upon successful login, with secure session management practices (e.g., HTTP-only cookies, CSRF protection).

3. **Password Recovery**
    - Create a password recovery process that allows users to reset their password if they forget it.
    - Implement a "Forgot Password" form where users can request a password reset link.
    - Send a password reset email to the user with a unique, time-limited token.
    - Develop a password reset form that verifies the token and allows the user to set a new password.

4. **User Session Management**
    - Implement functionality to check the user's authentication status and manage user sessions.
    - Create a logout mechanism that invalidates the user's session and clears relevant cookies.
    - Ensure that sensitive routes are protected and accessible only to authenticated users.

## Deliverables
1. **Codebase**
    - A fully functional user authentication module integrated into the existing codebase.
    - Well-documented code with comments explaining key sections and logic.
    - Unit tests covering all major functionalities of the authentication module.

2. **Documentation**
    - A comprehensive README file that explains how to set up and use the authentication module.
    - API documentation detailing the endpoints, request/response formats, and any required parameters.

3. **Security Review**
    - A security audit report highlighting potential vulnerabilities and measures taken to mitigate them.
    - Compliance with relevant security standards and best practices (e.g., OWASP Top Ten).

## Timeline
| Phase                   | Start Date   | End Date     |
|-------------------------|--------------|--------------|
| Requirements Gathering  | 2024-06-01   | 2024-06-07   |
| Design & Planning       | 2024-06-08   | 2024-06-14   |
| Implementation          | 2024-06-15   | 2024-06-30   |
| Testing & Debugging     | 2024-07-01   | 2024-07-07   |
| Documentation & Review  | 2024-07-08   | 2024-07-14   |
| Final Deployment        | 2024-07-15   | 2024-07-16   |

## Resources
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
- [OWASP Top Ten Security Risks](https://owasp.org/www-project-top-ten/)
- [Express.js Documentation](https://expressjs.com/)
- [Jest Testing Framework](https://jestjs.io/)

## Notes
- Ensure that all user data is handled in accordance with GDPR and other relevant data protection regulations.
- Collaborate with the frontend team to ensure seamless integration of the authentication module with the user interface.
- Regularly update the project manager on progress and any potential roadblocks.

## Contact
For any questions or clarifications regarding this task, please reach out to:

- **Project Manager**: Jane Doe (jane.doe@example.com)
- **Lead Developer**: John Smith (john.smith@example.com)
- **Security Expert**: Alice Johnson (alice.johnson@example.com)`;

export function fetchMockTasks(): Promise<ITask[]> {
  return Promise.resolve([
    {
      id: 10032,
      milestoneId: 763,
      teamId: 2,
      title:
        "Example Task With Some Really Really Long Title That Doesn't End Until It Is That Long Oh My God How Long That Title Is",
      description: mockDesk,
      tagIds: [1, 2, 3, 4, 5, 6],
      utility: { Fixed: { storypointsReward: 100_0000_0000n } },
      status: ETaskStatus.Created,
      kind: {
        Internal: {
          hoursToComplete: 24_0000_0000n,
          assignee: Principal.fromText(
            "4hh3y-c5een-zwqtw-jamjb-h5ces-ilqi7-sgehf-3n2l7-7xczu-lf4fa-sae"
          ),
          sprintId: 2,
        },
      },
    },
    {
      id: 10033,
      milestoneId: 763,
      teamId: 2,
      title: "Short name",
      description: mockDesk,
      tagIds: [1],
      utility: { Dynamic: { storypointsBudget: 100_0000_0000n } },
      status: ETaskStatus.Created,
      kind: {
        External: {
          assignees: [
            Principal.fromText(
              "4hh3y-c5een-zwqtw-jamjb-h5ces-ilqi7-sgehf-3n2l7-7xczu-lf4fa-sae"
            ),
            Principal.fromText("aaaaa-aa"),
          ],
          schedule: {
            approveBy: 1717595721449000000n,
            processBy: 1717595721449000000n,
            reviewBy: 1717595721449000000n,
          },
        },
      },
    },
  ]);
}

export async function fetchMockTask(id: TTaskId): Promise<ITask> {
  const it = await fetchMockTasks();
  return it[0];
}

export interface ITaskTag {
  id: TTaskTagId;
  name: string;
  color: string;
}

export async function fetchMockTags(ids: TTaskTagId[]): Promise<ITaskTag[]> {
  return Promise.resolve(
    [
      {
        id: 1,
        name: "User Authentication",
        color: "#007BFF",
      },
      {
        id: 2,
        name: "Web Security",
        color: "#DC3545",
      },
      {
        id: 3,
        name: "Module Development",
        color: "#28A745",
      },
      {
        id: 4,
        name: "Example tag 1",
        color: "#FE1265",
      },
      {
        id: 5,
        name: "Tag tag",
        color: "#15C811",
      },
    ].filter((_, idx) => idx < ids.length - 1)
  );
}
