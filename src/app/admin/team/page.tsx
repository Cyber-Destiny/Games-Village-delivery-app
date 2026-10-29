import { getTeam } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { TeamView } from "./team-view";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  await requireRole("admin");
  return <TeamView team={await getTeam()} />;
}
