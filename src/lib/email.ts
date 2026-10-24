import "server-only";
import { APP_NAME } from "./brand";

// Sends email through Resend (https://resend.com). Without RESEND_API_KEY nothing is
// sent and the message is written to the server log instead.

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function sender() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  const host = new URL(process.env.APP_URL || "http://localhost").hostname;
  return `${APP_NAME} <codes@${host}>`;
}

/** Returns false if the email couldn't be handed to Resend. Never throws. */
export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  if (!emailConfigured()) {
    console.info(`[email:console] → ${msg.to}: ${msg.subject}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: sender(), to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("[email:resend] failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email:resend] error", err);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The sign-in code email. */
export function codeEmail(code: string, place: string) {
  const subject = `${code} is your ${APP_NAME} code`;
  const text = `Your ${APP_NAME} sign-in code is ${code}.\n\nIt expires in 10 minutes. Don't share it with anyone. If you didn't ask for it, you can ignore this email.\n\n${APP_NAME} · Errands in ${place}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f2eb;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1d17">
<div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px 28px">
<p style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#137049">${esc(APP_NAME.toLowerCase())}</p>
<p style="margin:0;font-size:15px;color:#3c4a43">Your sign-in code is</p>
<p style="margin:8px 0 20px;font-size:36px;font-weight:700;letter-spacing:8px">${esc(code)}</p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#5b6660">It expires in 10 minutes. Don't share it with anyone. If you didn't ask for it, you can ignore this email.</p>
</div>
<p style="max-width:440px;margin:16px auto 0;text-align:center;font-size:12px;color:#8a938e">${esc(APP_NAME)} · Errands in ${esc(place)}</p>
</body></html>`;
  return { subject, text, html };
}
