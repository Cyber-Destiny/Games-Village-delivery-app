import { requireRole } from "@/lib/auth/dal";
import { appUrl, paystackLive, paystackTestKey } from "@/lib/paystack";
import { getSettings } from "@/lib/settings";
import { smsConfigured } from "@/lib/sms";
import { SettingsView } from "./settings-view";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole("admin");
  const s = await getSettings();
  return (
    <SettingsView
      initial={s}
      status={{
        paystack: !paystackLive() ? "demo" : paystackTestKey() ? "test" : "live",
        sms: smsConfigured(),
        push: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
        webhook: `${appUrl()}/api/paystack/webhook`,
        callback: `${appUrl()}/pay/callback`,
      }}
    />
  );
}
