import { Landing } from "@/components/landing/landing";
import { getCurrentUser, homeFor } from "@/lib/auth/dal";
import { naira } from "@/lib/money";
import { getSettings } from "@/lib/settings";

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return m ? `${hr}:${String(m).padStart(2, "0")}${suffix}` : `${hr}${suffix}`;
}

export default async function Page() {
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  const minFee = Math.min(...Object.values(s.fees));
  return (
    <Landing
      signedIn={!!user}
      appHref={user ? homeFor(user) : "/login"}
      minFee={naira(minFee)}
      hours={`${to12h(s.openTime)} – ${to12h(s.closeTime)}`}
      loyaltyEvery={s.loyaltyEvery}
    />
  );
}
