import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { homeFor, needsOnboarding, requireUser } from "@/lib/auth/dal";
import { AuthShell } from "../auth-shell";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const user = await requireUser();
  if (!needsOnboarding(user)) redirect(homeFor(user));
  return (
    <AuthShell title="One quick thing." subtitle="We save your address once so every errand afterwards is a few taps.">
      <WelcomeForm
        isResident={user.role === "resident"}
        initial={{
          name: user.name ?? "",
          phone: user.phone ? "0" + user.phone.slice(3) : "",
          block: user.block ?? "",
          house: user.house ?? "",
          street: user.street ?? "",
          landmark: user.landmark ?? "",
        }}
      />
    </AuthShell>
  );
}
