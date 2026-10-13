import { getRunners } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { RunnersView } from "./runners-view";

export const metadata = { title: "Runners" };

export default async function RunnersPage() {
  await requireRole("admin");
  return <RunnersView runners={await getRunners()} />;
}
