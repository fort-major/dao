import { time } from "console";
import { TMarkdown, TMilestoneId, TTimestamp } from "../../utils/types";

export interface IMilestone {
  id: TMilestoneId;
  title: string;
  description: TMarkdown;
  color: string;
  beginBy: TTimestamp;
  completeBy: TTimestamp;
}

export async function fetchMockMilestones(
  ids: TMilestoneId[]
): Promise<IMilestone[]> {
  return [
    await fetchMockMilestone(1),
    await fetchMockMilestone(1),
    await fetchMockMilestone(1),
  ];
}

export function fetchMockMilestone(id: TMilestoneId): Promise<IMilestone> {
  return Promise.resolve({
    id: 1,
    title: "Beta 1.0",
    color: "#DEADBE",
    description: `# Milestone: Launch Beta Version of User Authentication Module

      ## Overview
      The goal of this milestone is to launch the beta version of the user authentication module, which will be tested by a selected group of users. This milestone is critical for ensuring the reliability, security, and usability of the module before it is released to all users. The beta version will include user registration, login, password recovery, and session management functionalities. Feedback collected during this phase will be used to make necessary improvements and fix any bugs.
      
      ## Objectives
      1. **User Registration**
         - **Functionality**: Implement a user registration system that allows new users to create accounts with a username, email, and password.
         - **Security**: Ensure that passwords are hashed using bcrypt before storing them in the database.
         - **Validation**: Add input validation to ensure that email addresses are in the correct format and passwords meet strength requirements.
         - **User Experience**: Design a user-friendly registration form with clear error messages and success notifications.
      
      2. **User Login**
         - **Functionality**: Create a login system that authenticates users using their email and password.
         - **Security**: Implement measures to prevent brute-force attacks, such as rate limiting and account lockout after multiple failed login attempts.
         - **Session Management**: Establish secure sessions using HTTP-only cookies and CSRF tokens to protect against cross-site scripting (XSS) and cross-site request forgery (CSRF) attacks.
         - **User Experience**: Design a user-friendly login form with clear error messages for invalid login attempts.
      
      3. **Password Recovery**
         - **Functionality**: Develop a password recovery system that allows users to reset their passwords if they forget them.
         - **Security**: Send password reset links via email with a unique, time-limited token to ensure security.
         - **Validation**: Validate the token and allow users to set a new password that meets strength requirements.
         - **User Experience**: Design a user-friendly password recovery form with clear instructions and notifications.
      
      4. **User Session Management**
         - **Functionality**: Implement functionality to manage user sessions, including checking authentication status and handling logout.
         - **Security**: Ensure secure session management practices, such as using secure cookies and properly handling session expiration.
         - **User Experience**: Provide a seamless user experience for session management, including automatic redirection to the login page for unauthenticated users.
      
      ## Deliverables
      1. **Codebase**
         - Fully functional user authentication module integrated into the existing application.
         - Well-documented code with comments explaining key sections and logic.
         - Unit tests covering all major functionalities to ensure reliability and stability.
      
      2. **Documentation**
         - Comprehensive README file explaining how to set up and use the authentication module.
         - API documentation detailing the endpoints, request/response formats, and any required parameters.
         - User guide for beta testers, explaining how to register, log in, recover passwords, and provide feedback.
      
      3. **Beta Testing Feedback**
         - Collect feedback from beta testers regarding the functionality, usability, and security of the authentication module.
         - Analyze feedback to identify common issues, bugs, and areas for improvement.
         - Document feedback and proposed changes in a report to be reviewed by the development team.
      
      ## Timeline
      | Phase                   | Start Date   | End Date     |
      |-------------------------|--------------|--------------|
      | Development             | 2024-06-01   | 2024-06-20   |
      | Internal Testing        | 2024-06-21   | 2024-06-25   |
      | Beta Testing            | 2024-06-26   | 2024-07-05   |
      | Feedback Analysis       | 2024-07-06   | 2024-07-10   |
      | Final Adjustments       | 2024-07-11   | 2024-07-15   |
      | Beta Launch             | 2024-07-16   | 2024-07-16   |
      
      ## Resources
      - [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
      - [OWASP Top Ten Security Risks](https://owasp.org/www-project-top-ten/)
      - [Express.js Documentation](https://expressjs.com/)
      - [Jest Testing Framework](https://jestjs.io/)
      - [Tailwind CSS Documentation](https://tailwindcss.com/docs)
      
      ## Notes
      - Ensure that all user data is handled in accordance with GDPR and other relevant data protection regulations.
      - Collaborate with the frontend team to ensure seamless integration of the authentication module with the user interface.
      - Regularly update the project manager on progress and any potential roadblocks.
      - Plan for a thorough security review before the beta launch to identify and mitigate any vulnerabilities.
      
      ## Contact
      For any questions or clarifications regarding this milestone, please reach out to:
      
      - **Project Manager**: Jane Doe (jane.doe@example.com)
      - **Lead Developer**: John Smith (john.smith@example.com)
      - **Security Expert**: Alice Johnson (alice.johnson@example.com)
      `,
    beginBy: 1717595721449000000n,
    completeBy: 1717595721449000000n,
  });
}
