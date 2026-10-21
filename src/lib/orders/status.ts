// Shared (client + server) order status vocabulary.
import { APP_NAME } from "../brand";
import type { CategoryId, OrderKind } from "../categories";

export type OrderStatus =
  | "awaiting_payment"
  | "searching"
  | "assigned"
  | "to_vendor"
  | "at_vendor"
  | "on_the_way"
  | "arrived"
  | "delivered"
  | "cancelled";

export const ACTIVE_STATUSES: OrderStatus[] = ["searching", "assigned", "to_vendor", "at_vendor", "on_the_way", "arrived"];
export const RUNNER_ACTIVE_STATUSES: OrderStatus[] = ["assigned", "to_vendor", "at_vendor", "on_the_way", "arrived"];
export const RESIDENT_CANCELLABLE: OrderStatus[] = ["awaiting_payment", "searching", "assigned", "to_vendor"];

export function isActive(status: OrderStatus) {
  return ACTIVE_STATUSES.includes(status);
}

/** The six milestones shown on the resident's tracker. */
export const MILESTONES = ["placed", "runner", "shop", "way", "door", "done"] as const;
export type Milestone = (typeof MILESTONES)[number];

export function milestoneIndex(status: OrderStatus): number {
  switch (status) {
    case "awaiting_payment":
    case "searching":
      return 0;
    case "assigned":
    case "to_vendor":
      return 1;
    case "at_vendor":
      return 2;
    case "on_the_way":
      return 3;
    case "arrived":
      return 4;
    case "delivered":
      return 5;
    default:
      return 0;
  }
}

type CopyInput = {
  status: OrderStatus;
  kind: OrderKind;
  category: CategoryId | string;
  runnerName?: string | null;
  place?: string | null;
  /** Collecting an order the resident already paid the shop for. */
  collect?: boolean;
};

/** Headline + supporting line for the resident's tracking screen. */
export function statusCopy({ status, kind, category, runnerName, place, collect }: CopyInput): { title: string; line: string } {
  const who = runnerName?.split(" ")[0] ?? "Your runner";
  const where = place || (kind === "pickup" ? "the pick-up point" : "the shop");
  const gas = category === "gas";
  switch (status) {
    case "awaiting_payment":
      return { title: "Waiting for payment", line: "Complete payment to send your errand to a runner." };
    case "searching":
      return { title: "Finding you a runner", line: "We're matching your errand with the nearest free runner." };
    case "assigned":
      return { title: `${who} has your errand`, line: "They're confirming the details now." };
    case "to_vendor":
      return gas
        ? { title: `${who} is coming for your cylinder`, line: "Have your empty cylinder ready at the door." }
        : {
            title: `${who} is heading to ${where}`,
            line: collect ? "On the way to collect your order." : kind === "pickup" ? "On the way to collect it." : "On the way to buy your items.",
          };
    case "at_vendor":
      return kind === "pickup"
        ? { title: `${who} is at ${where}`, line: collect ? "Picking up your order. Nothing to pay." : "Collecting it now." }
        : { title: `${who} is at ${where}`, line: gas ? "Refilling your cylinder." : "Buying your items. We pay the shop directly." };
    case "on_the_way":
      return { title: "On the way to you", line: `${who} is bringing it to your door.` };
    case "arrived":
      return { title: `${who} is at your door`, line: "Give them your delivery code once you have everything." };
    case "delivered":
      return { title: "Delivered", line: `Enjoy! Thanks for using ${APP_NAME}.` };
    case "cancelled":
      return { title: "Cancelled", line: "This errand was cancelled." };
  }
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  searching: "Finding runner",
  assigned: "Assigned",
  to_vendor: "Heading out",
  at_vendor: "At the shop",
  on_the_way: "On the way",
  arrived: "At the door",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type StatusTone = "neutral" | "brand" | "accent" | "success" | "danger";

export function statusTone(status: OrderStatus): StatusTone {
  if (status === "delivered") return "success";
  if (status === "cancelled") return "danger";
  if (status === "awaiting_payment") return "accent";
  if (status === "searching") return "neutral";
  return "brand";
}
