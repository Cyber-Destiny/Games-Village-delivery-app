import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// All money is stored in kobo (₦1 = 100 kobo), matching Paystack.

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const roleEnum = pgEnum("role", ["resident", "runner", "admin"]);

export const orderStatusEnum = pgEnum("order_status", [
  "awaiting_payment",
  "searching",
  "assigned",
  "to_vendor",
  "at_vendor",
  "on_the_way",
  "arrived",
  "delivered",
  "cancelled",
]);

export const orderKindEnum = pgEnum("order_kind", ["buy", "pickup"]);

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "success", "failed", "abandoned"]);
export const paymentPurposeEnum = pgEnum("payment_purpose", ["order", "topup"]);

export const payoutTypeEnum = pgEnum("payout_type", ["vendor", "runner", "withdrawal"]);
export const payoutStatusEnum = pgEnum("payout_status", [
  "pending_approval",
  "processing",
  "success",
  "failed",
  "reversed",
  "rejected",
  "manual",
]);

export const topupStatusEnum = pgEnum("topup_status", ["pending", "approved", "declined", "paid"]);
export const earningTypeEnum = pgEnum("earning_type", ["commission", "bonus", "adjustment"]);
export const walletEntryTypeEnum = pgEnum("wallet_entry_type", [
  "change",
  "order_payment",
  "refund",
  "admin_credit",
  "withdrawal",
  "withdrawal_reversal",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    name: text("name"),
    email: text("email"),
    role: roleEnum("role").notNull().default("resident"),
    // Address inside the estate
    block: text("block"),
    house: text("house"),
    street: text("street"),
    landmark: text("landmark"),
    walletBalance: integer("wallet_balance").notNull().default(0),
    deliveredCount: integer("delivered_count").notNull().default(0),
    lastOrderAt: ts("last_order_at"),
    isActive: boolean("is_active").notNull().default(true),
    sessionVersion: integer("session_version").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_phone_idx").on(t.phone)],
);

export const runnerProfiles = pgTable("runner_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  online: boolean("online").notNull().default(false),
  lastAssignedAt: ts("last_assigned_at"),
  lastSeenAt: ts("last_seen_at"),
  nin: text("nin"),
  guarantorName: text("guarantor_name"),
  guarantorPhone: text("guarantor_phone"),
  bankCode: text("bank_code"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  recipientCode: text("recipient_code"),
  ratingSum: integer("rating_sum").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  tag: text("tag"), // vest / bag number
  createdAt: createdAt(),
});

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    attempts: smallint("attempts").notNull().default(0),
    consumedAt: ts("consumed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("otp_phone_idx").on(t.phone, t.createdAt)],
);

export type VendorContact = { label: string | null; phone: string };

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  location: text("location"),
  // Numbers residents can call or WhatsApp to order directly from the shop.
  contacts: jsonb("contacts").$type<VendorContact[]>().notNull().default(sql`'[]'::jsonb`),
  // Cover photo: an /api/uploads/… URL from the admin, or a bundled /images/… path.
  image: text("image"),
  hours: text("hours"),
  bankCode: text("bank_code"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  recipientCode: text("recipient_code"),
  isPartner: boolean("is_partner").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
});

export const vendorItems = pgTable(
  "vendor_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: integer("price").notNull(),
    unit: text("unit"),
    isActive: boolean("is_active").notNull().default(true),
    isPopular: boolean("is_popular").notNull().default(false),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("vendor_items_vendor_idx").on(t.vendorId)],
);

export type OrderItem = { name: string; qty: number; price?: number | null; note?: string | null };

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    residentId: uuid("resident_id")
      .notNull()
      .references(() => users.id),
    runnerId: uuid("runner_id").references(() => users.id),
    category: text("category").notNull(),
    kind: orderKindEnum("kind").notNull(),
    status: orderStatusEnum("status").notNull().default("awaiting_payment"),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    vendorName: text("vendor_name"),
    vendorLocation: text("vendor_location"),
    // For pick-up errands: where to collect from and where to take it (null = resident's address)
    pickupFrom: text("pickup_from"),
    deliverTo: text("deliver_to"),
    // Collecting an order the resident already paid the shop for: the name it's under.
    collectAs: text("collect_as"),
    items: jsonb("items").$type<OrderItem[]>().notNull().default(sql`'[]'::jsonb`),
    notes: text("notes"),
    photoId: uuid("photo_id"),
    // Drop-off snapshot
    dropBlock: text("drop_block"),
    dropHouse: text("drop_house"),
    dropStreet: text("drop_street"),
    dropLandmark: text("drop_landmark"),
    // Money (kobo)
    budget: integer("budget").notNull().default(0),
    serviceFee: integer("service_fee").notNull(),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    walletApplied: integer("wallet_applied").notNull().default(0),
    topupTotal: integer("topup_total").notNull().default(0),
    actualCost: integer("actual_cost"),
    changeRefunded: integer("change_refunded"),
    receiptId: uuid("receipt_id"),
    deliveryCode: text("delivery_code").notNull(),
    declinedRunnerIds: jsonb("declined_runner_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    loyaltyFree: boolean("loyalty_free").notNull().default(false),
    rating: smallint("rating"),
    ratingTags: jsonb("rating_tags").$type<string[]>(),
    ratingComment: text("rating_comment"),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    paidAt: ts("paid_at"),
    assignedAt: ts("assigned_at"),
    acceptedAt: ts("accepted_at"),
    atVendorAt: ts("at_vendor_at"),
    onTheWayAt: ts("on_the_way_at"),
    arrivedAt: ts("arrived_at"),
    deliveredAt: ts("delivered_at"),
    cancelledAt: ts("cancelled_at"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_code_idx").on(t.code),
    index("orders_resident_idx").on(t.residentId, t.createdAt),
    index("orders_runner_idx").on(t.runnerId, t.status),
    index("orders_status_idx").on(t.status, t.createdAt),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    actorId: uuid("actor_id"),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("messages_order_idx").on(t.orderId, t.createdAt)],
);

export const topups = pgTable(
  "topups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason"),
    status: topupStatusEnum("status").notNull().default("pending"),
    createdAt: createdAt(),
    resolvedAt: ts("resolved_at"),
  },
  (t) => [index("topups_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    orderId: uuid("order_id").references(() => orders.id),
    topupId: uuid("topup_id").references(() => topups.id),
    purpose: paymentPurposeEnum("purpose").notNull(),
    amount: integer("amount").notNull(),
    reference: text("reference").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    channel: text("channel"),
    raw: jsonb("raw"),
    createdAt: createdAt(),
    paidAt: ts("paid_at"),
  },
  (t) => [uniqueIndex("payments_reference_idx").on(t.reference), index("payments_order_idx").on(t.orderId)],
);

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: payoutTypeEnum("type").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    userId: uuid("user_id").references(() => users.id), // runner or resident (withdrawal)
    amount: integer("amount").notNull(),
    bankCode: text("bank_code"),
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
    accountName: text("account_name"),
    recipientCode: text("recipient_code"),
    reference: text("reference").notNull(),
    transferCode: text("transfer_code"),
    status: payoutStatusEnum("status").notNull(),
    note: text("note"),
    failureReason: text("failure_reason"),
    approvedBy: uuid("approved_by"),
    mockSettleAt: ts("mock_settle_at"),
    createdAt: createdAt(),
    completedAt: ts("completed_at"),
  },
  (t) => [
    uniqueIndex("payouts_reference_idx").on(t.reference),
    index("payouts_status_idx").on(t.status),
    index("payouts_order_idx").on(t.orderId),
  ],
);

export const runnerEarnings = pgTable(
  "runner_earnings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runnerId: uuid("runner_id")
      .notNull()
      .references(() => users.id),
    orderId: uuid("order_id").references(() => orders.id),
    type: earningTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    weekStart: date("week_start").notNull(),
    payoutId: uuid("payout_id").references(() => payouts.id),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("earnings_runner_idx").on(t.runnerId, t.createdAt),
    uniqueIndex("earnings_bonus_once_idx")
      .on(t.runnerId, t.weekStart)
      .where(sql`type = 'bonus'`),
    uniqueIndex("earnings_commission_once_idx")
      .on(t.orderId)
      .where(sql`type = 'commission'`),
  ],
);

export const walletEntries = pgTable(
  "wallet_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    orderId: uuid("order_id").references(() => orders.id),
    payoutId: uuid("payout_id").references(() => payouts.id),
    type: walletEntryTypeEnum("type").notNull(),
    amount: integer("amount").notNull(), // positive = credit, negative = debit
    balanceAfter: integer("balance_after").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("wallet_user_idx").on(t.userId, t.createdAt)],
);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  orderId: uuid("order_id"),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  data: jsonb("data").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("push_endpoint_idx").on(t.endpoint)],
);

export type User = typeof users.$inferSelect;
export type RunnerProfile = typeof runnerProfiles.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type VendorItem = typeof vendorItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type Payout = typeof payouts.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Topup = typeof topups.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
