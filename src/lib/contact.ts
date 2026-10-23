// Links for contacting the support team by phone or WhatsApp (phone in 234… form).

export function telLink(phone: string) {
  return `tel:+${phone}`;
}

export function whatsappLink(phone: string, text?: string) {
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
