/**
 * Local trial mode (DEMO_MODE=true): login codes are shown on screen and payments go
 * through a pretend checkout, so the app can be tried without Termii or Paystack.
 * Anyone could sign in as anyone, so never set this on the live site.
 */
export function demoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
