import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/dal";
import { getResidentHome } from "@/lib/resident";
import { greeting } from "@/lib/time";
import { HomeView } from "./home-view";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireRole("resident", "admin");
  const data = await getResidentHome(user);
  const address = [user.block && `Block ${user.block}`, user.house && `House ${user.house}`, user.street].filter(Boolean).join(" · ");
  return <HomeView name={user.name ?? "there"} address={address || "Add your address"} greeting={greeting()} data={data} />;
}
