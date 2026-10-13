import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/dal";
import { getSettings } from "@/lib/settings";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireRole("resident", "admin");
  const s = await getSettings();
  return (
    <AccountView
      isAdmin={user.role === "admin"}
      supportPhone={s.supportPhone}
      delivered={user.deliveredCount}
      profile={{
        name: user.name ?? "",
        email: user.email ?? "",
        phone: user.phone,
        block: user.block ?? "",
        house: user.house ?? "",
        street: user.street ?? "",
        landmark: user.landmark ?? "",
      }}
    />
  );
}
