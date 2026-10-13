import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RunnerNav } from "@/components/app/runner-nav";
import { needsOnboarding, requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: { default: "Runner", template: "%s · Runner" } };

export default async function RunnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("runner");
  if (needsOnboarding(user)) redirect("/welcome");
  return (
    <div className="relative mx-auto min-h-dvh max-w-[480px] bg-bg sm:border-x sm:border-line/70">
      {children}
      <RunnerNav />
    </div>
  );
}
