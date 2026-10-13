import "server-only";

type Provider = "console" | "termii";

function provider(): Provider {
  return process.env.SMS_PROVIDER === "termii" ? "termii" : "console";
}

export function smsConfigured(): boolean {
  return provider() === "termii" && !!process.env.TERMII_API_KEY;
}

/** Sends an SMS. Never throws — SMS failures must not break the order flow. */
export async function sendSms(to: string, text: string): Promise<boolean> {
  if (!smsConfigured()) {
    console.info(`[sms:console] → ${to}: ${text}`);
    return provider() === "console";
  }
  try {
    const base = process.env.TERMII_BASE_URL || "https://v3.api.termii.com";
    const res = await fetch(`${base}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        to,
        from: process.env.TERMII_SENDER_ID || "Runam",
        sms: text,
        type: "plain",
        channel: process.env.TERMII_CHANNEL || "dnd",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[sms:termii] failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sms:termii] error", err);
    return false;
  }
}
