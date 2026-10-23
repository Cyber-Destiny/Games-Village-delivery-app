import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { homeFor, requireUser } from "@/lib/auth/dal";
import { getSettings } from "@/lib/settings";
import { supportChat } from "@/lib/support";
import { SupportChat } from "./support-chat";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin/support");
  const [initial, s, { about }] = await Promise.all([supportChat(user), getSettings(), searchParams]);
  const code = about && /^[A-Z0-9]{3,10}$/i.test(about) ? about.toUpperCase() : null;
  return (
    <div className="relative mx-auto min-h-dvh max-w-[480px] bg-bg sm:border-x sm:border-line/70 sm:shadow-[0_0_60px_-30px_rgb(var(--shadow-color)/0.25)]">
      <SupportChat
        initial={initial}
        home={homeFor(user)}
        audience={user.role === "runner" ? "runner" : user.role === "vendor" ? "shop" : "resident"}
        phone={s.supportPhone}
        hours={`${s.openTime}–${s.closeTime}`}
        draft={code ? `About errand #${code}: ` : ""}
      />
    </div>
  );
}
