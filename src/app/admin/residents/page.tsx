import { getResidentsAdmin } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { ResidentsView } from "./residents-view";

export const metadata = { title: "Residents" };

export default async function ResidentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole("admin");
  const { q = "" } = await searchParams;
  return <ResidentsView residents={await getResidentsAdmin(q)} q={q} />;
}
