import type { Metadata } from "next";
import { CallProvider } from "@/components/call/call-provider";
import { requireShopStaff } from "@/lib/auth/dal";

export const metadata: Metadata = { title: { default: "Shop", template: "%s · Shop" } };

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  await requireShopStaff();
  return (
    <div className="relative mx-auto min-h-dvh max-w-[480px] bg-bg sm:border-x sm:border-line/70">
      <CallProvider>{children}</CallProvider>
    </div>
  );
}
