import { Landing } from "@/components/landing/landing";
import { getCurrentUser, homeFor } from "@/lib/auth/dal";
import { naira } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatHours } from "@/lib/time";

export default async function Page() {
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  const minFee = Math.min(...Object.values(s.fees));
  return (
    <Landing
      signedIn={!!user}
      appHref={user ? homeFor(user) : "/login"}
      minFee={naira(minFee)}
      hours={formatHours(s.openTime, s.closeTime)}
      loyaltyEvery={s.loyaltyEvery}
      supportPhone={s.supportPhone}
      runnerBuys={s.runnerBuys}
    />
  );
}
