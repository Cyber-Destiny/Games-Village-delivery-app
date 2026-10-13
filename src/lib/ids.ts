import { randomBytes, randomInt } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L

export function orderCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export function deliveryCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

/** Paystack references: lowercase alphanumerics, 16–50 chars. */
export function reference(prefix: "pay" | "po"): string {
  return `${prefix}${randomBytes(12).toString("hex")}`;
}
