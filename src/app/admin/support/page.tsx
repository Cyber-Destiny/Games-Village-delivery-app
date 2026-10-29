import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { getSettings } from "@/lib/settings";
import { supportInbox } from "@/lib/support";
import { SupportInbox } from "./support-inbox";

export const metadata = { title: "Support" };

export default async function AdminSupportPage() {
  await requireRole(...STAFF_ROLES);
  const [threads, s] = await Promise.all([supportInbox(), getSettings()]);
  return <SupportInbox initial={threads} phone={s.supportPhone} />;
}
