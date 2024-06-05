import { TMarkdown, TTeamId } from "../../utils/types";

export interface ITeam {
  id: TTeamId;
  name: string;
  description: TMarkdown;
  color: string;
}

export function fetchMockTeams(ids: TTeamId[]): Promise<ITeam[]> {
  return Promise.resolve([
    {
      id: 1,
      name: "Development Team",
      description:
        "This team is responsible for the development, testing, and deployment of the user authentication module for our web application. The team consists of skilled professionals with expertise in frontend development, backend development, security, and project management. Each member plays a crucial role in ensuring the module is secure, user-friendly, and seamlessly integrated into our existing system.",
      color: "#ABCDEF",
    },
  ]);
}
