// Nigerian phone number helpers. Canonical format: 234XXXXXXXXXX (13 digits).

export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("2340")) d = "234" + d.slice(4);
  if (d.length === 11 && d.startsWith("0")) d = "234" + d.slice(1);
  else if (d.length === 10 && /^[789]/.test(d)) d = "234" + d;
  if (!/^234[789][01]\d{8}$/.test(d)) return null;
  return d;
}

/** 2348031234567 → "0803 123 4567" */
export function formatPhoneLocal(phone: string): string {
  const d = phone.startsWith("234") ? "0" + phone.slice(3) : phone;
  return d.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
}

/** 2348031234567 → "+234 803 123 4567" */
export function formatPhoneIntl(phone: string): string {
  return phone.replace(/^234(\d{3})(\d{3})(\d{4})$/, "+234 $1 $2 $3");
}

export function maskPhone(phone: string): string {
  const local = formatPhoneLocal(phone);
  return local.slice(0, 4) + " ••• " + local.slice(-4);
}

// ── shop contact numbers ─────────────────────────────────────
// Shops may give a landline, so anything that isn't a Nigerian mobile is kept as digits.

export function normalizeContactPhone(input: string): string | null {
  const mobile = normalizePhone(input);
  if (mobile) return mobile;
  const d = input.replace(/\D/g, "");
  return /^0\d{6,12}$/.test(d) ? d : null;
}

export function isMobile(phone: string): boolean {
  return /^234[789][01]\d{8}$/.test(phone);
}

export function displayContactPhone(phone: string): string {
  return isMobile(phone) ? formatPhoneLocal(phone) : phone;
}

export function telHref(phone: string): string {
  return isMobile(phone) ? `tel:+${phone}` : `tel:${phone}`;
}

/** WhatsApp only works with mobile numbers. */
export function whatsappHref(phone: string, text?: string): string | null {
  if (!isMobile(phone)) return null;
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
