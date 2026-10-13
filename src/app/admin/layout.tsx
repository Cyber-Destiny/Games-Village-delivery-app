import type { Metadata } from "next";
import { AdminSidebar, AdminTopNav } from "@/components/admin/admin-nav";
import { getAdminBadges } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin");
  const badges = await getAdminBadges();
  return (
    <div className="flex min-h-dvh bg-bg">
      <AdminSidebar name={user.name ?? "Admin"} badges={badges} />
      <div className="min-w-0 flex-1">
        <AdminTopNav badges={badges} />
        <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 sm:px-8 lg:pt-10">{children}</main>
      </div>
    </div>
  );
}
