import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor, needsOnboarding } from "@/lib/auth/dal";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(needsOnboarding(user) ? "/welcome" : homeFor(user));
  return (
    <AuthShell title="Your estate errands, sorted." subtitle="Sign in with your phone number to start an errand, track it live and get your change back instantly.">
      <LoginForm />
    </AuthShell>
  );
}
