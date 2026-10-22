/**
 * Demo data so the app looks alive on first run.
 *   npm run db:seed            → adds demo data if the database is empty
 *   npm run db:seed -- --reset → wipes everything first (DANGER: deletes all data)
 *
 * All shops, people and phone numbers below are made up. Replace them with your
 * real vendors from the admin console before launch.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { DEFAULT_SETTINGS } from "../src/lib/settings-shared";
import { PHOTOS } from "../src/lib/photos";
import { weekStart } from "../src/lib/time";

try {
  process.loadEnvFile?.(".env");
} catch {
  // ignore
}

const ADMIN_PHONE = (process.env.ADMIN_PHONES ?? "2348000000000").split(",")[0].trim();

const client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const db = drizzle(client, { schema });
const { users, runnerProfiles, vendors, vendorItems, orders, orderEvents, runnerEarnings, settings } = schema;

const k = (naira: number) => naira * 100;
const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const code = () => Array.from({ length: 6 }, () => rand(ALPHA.split(""))).join("");

const SHOPS = [
  {
    name: "Mama Ngozi's Kitchen",
    image: PHOTOS.shopKitchen,
    contacts: [{ label: "Ngozi", phone: "2348050000001" }],
    category: "food",
    location: "Block D, by the basketball court",
    description: "Home-style Nigerian meals, cooked fresh daily",
    hours: "8am – 8pm",
    items: [
      ["Jollof rice & chicken", 3500, true],
      ["Fried rice & turkey", 4200, true],
      ["Pounded yam & egusi", 3000, false],
      ["Ofada rice & ayamase", 3800, false],
      ["Small chops (pack)", 2500, false],
    ],
  },
  {
    name: "Village Mart",
    image: PHOTOS.shopMart,
    contacts: [{ label: "Chika", phone: "2348050000002" }, { label: "Emeka", phone: "2348050000012" }],
    category: "groceries",
    location: "Estate market, shop 4",
    description: "Provisions, drinks, toiletries",
    hours: "7am – 9pm",
    items: [
      ["Bread (big loaf)", 1800, true],
      ["Peak milk (tin)", 900, true],
      ["Eggs (crate)", 6000, true],
      ["Indomie (pack of 5)", 1600, false],
      ["Bottled water (pack of 12)", 2500, false],
      ["Coke (50cl)", 500, false],
      ["Dettol soap", 900, false],
    ],
  },
  {
    name: "Prime Gas Point",
    image: PHOTOS.shopGas,
    contacts: [{ label: "Sani", phone: "2348050000003" }],
    category: "gas",
    location: "Gate 2 road",
    description: "Cooking gas refills, all cylinder sizes",
    hours: "7am – 7pm",
    items: [
      ["12.5kg refill", 18000, true],
      ["6kg refill", 8800, true],
      ["3kg refill", 4500, false],
    ],
  },
  {
    name: "FreshFold Dry Cleaners",
    image: PHOTOS.shopDryCleaner,
    contacts: [{ label: "Funmi", phone: "2348050000004" }],
    category: "laundry",
    location: "Block A shopping row",
    description: "Wash, iron and dry-clean",
    hours: "8am – 6pm",
    items: [
      ["Shirt / blouse", 700, true],
      ["Trousers", 800, false],
      ["Native (agbada)", 3000, false],
      ["Duvet", 4500, false],
    ],
  },
  {
    name: "Suya Junction",
    image: PHOTOS.shopSuya,
    contacts: [{ label: "Musa", phone: "2348050000005" }],
    category: "food",
    location: "Opposite the gym",
    description: "Evenings only — beef and chicken suya",
    hours: "5pm – 10pm",
    items: [
      ["Beef suya", 2000, true],
      ["Chicken suya", 3000, false],
      ["Kilishi", 2500, false],
    ],
  },
  {
    name: "CarePlus Pharmacy",
    image: PHOTOS.shopPharmacy,
    contacts: [{ label: "Pharm. Bola", phone: "2348050000006" }],
    category: "other",
    location: "Estate market, shop 11",
    description: "Over-the-counter medicine and essentials",
    hours: "8am – 9pm",
    items: [
      ["Paracetamol (pack)", 600, true],
      ["Vitamin C (tabs)", 1500, false],
      ["ORS sachets", 400, false],
    ],
  },
] as const;

const RUNNERS = [
  { name: "Adaeze Okafor", phone: "2348011111111", tag: "RN-01" },
  { name: "Musa Bello", phone: "2348022222222", tag: "RN-02" },
  { name: "Tunde Adeyemi", phone: "2348033333333", tag: "RN-03" },
];

const RESIDENTS = [
  ["Amaka Obi", "C", "14"],
  ["Ibrahim Sule", "A", "3"],
  ["Funke Adebayo", "F", "22"],
  ["Emeka Nwosu", "B", "7"],
  ["Halima Garba", "D", "11"],
  ["Segun Lawal", "E", "5"],
  ["Ngozi Eze", "C", "2"],
  ["Yusuf Danjuma", "G", "18"],
  ["Bisi Ogunleye", "A", "9"],
  ["Chidi Okeke", "H", "1"],
  ["Zainab Musa", "B", "15"],
  ["Kemi Bakare", "F", "6"],
] as const;

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    console.log("Resetting all data…");
    await db.execute(sql`truncate table shop_messages, shop_threads, messages, order_events, topups, payments, runner_earnings, wallet_entries, payouts, orders, vendor_items, vendors, runner_profiles, otp_codes, uploads, push_subscriptions, settings, users restart identity cascade`);
  } else {
    const existing = await db.select({ id: vendors.id }).from(vendors).limit(1);
    if (existing.length) {
      console.log("Database already has data — skipping. Use `npm run db:seed -- --reset` to start over.");
      return;
    }
  }

  await db.insert(settings).values({ id: 1, data: DEFAULT_SETTINGS }).onConflictDoNothing();

  // Admin
  await db
    .insert(users)
    .values({ phone: ADMIN_PHONE, name: "Estate Admin", role: "admin" })
    .onConflictDoUpdate({ target: users.phone, set: { role: "admin" } });

  // Shops
  const shopRows: Array<{ id: string; name: string; category: string; prices: Array<[string, number]> }> = [];
  for (const [i, s] of SHOPS.entries()) {
    const [v] = await db
      .insert(vendors)
      .values({
        name: s.name,
        category: s.category,
        location: s.location,
        description: s.description,
        hours: s.hours,
        contacts: s.contacts.map((c) => ({ ...c })),
        image: s.image,
        bankCode: "058",
        bankName: "Guaranty Trust Bank",
        accountNumber: `01234567${String(i).padStart(2, "0")}`,
        accountName: `DEMO ${s.name.toUpperCase()}`.slice(0, 40),
        isPartner: true,
        sort: i,
      })
      .returning();
    await db.insert(vendorItems).values(
      s.items.map(([name, price, popular], j) => ({ vendorId: v.id, name, price: k(price), isPopular: popular, sort: j })),
    );
    shopRows.push({ id: v.id, name: v.name, category: v.category, prices: s.items.map(([n, p]) => [n, k(p)] as [string, number]) });
    // Shop staff sign in with these numbers to chat with customers.
    await db.insert(users).values(s.contacts.map((c) => ({ phone: c.phone, name: c.label, role: "vendor" as const, vendorId: v.id })));
  }

  // Runners
  const runnerIds: string[] = [];
  for (const r of RUNNERS) {
    const [u] = await db.insert(users).values({ phone: r.phone, name: r.name, role: "runner" }).returning();
    await db.insert(runnerProfiles).values({
      userId: u.id,
      tag: r.tag,
      nin: "12345678901",
      guarantorName: "Demo Guarantor",
      guarantorPhone: "2348070000000",
      bankCode: "058",
      bankName: "Guaranty Trust Bank",
      accountNumber: `09876543${r.tag.slice(-2)}`,
      accountName: r.name.toUpperCase(),
    });
    runnerIds.push(u.id);
  }

  // Residents
  const residentIds: string[] = [];
  for (const [i, [name, block, house]] of RESIDENTS.entries()) {
    const [u] = await db
      .insert(users)
      .values({ phone: `234809999${String(9999 - i).padStart(4, "0")}`, name, block, house, role: "resident" })
      .returning();
    residentIds.push(u.id);
  }

  // History: delivered errands over the past 3 weeks
  const now = Date.now();
  const fees = DEFAULT_SETTINGS.fees as Record<string, number>;
  let made = 0;
  const ratingSums = new Map<string, { sum: number; n: number }>();
  for (let day = 20; day >= 0; day--) {
    const perDay = day === 0 ? 3 : 3 + Math.floor(Math.random() * 6);
    for (let n = 0; n < perDay; n++) {
      const shop = rand(shopRows);
      const [itemName, price] = rand(shop.prices);
      const qty = 1 + Math.floor(Math.random() * 3);
      const budget = Math.ceil((price * qty * 1.1) / 10000) * 10000;
      const actual = price * qty;
      const resIdx = Math.floor(Math.random() * Math.random() * residentIds.length); // some residents order a lot
      // Residents 6+ haven't ordered in the last two weeks (for the "gone quiet" view)
      if (resIdx >= 6 && day < 15) continue;
      const residentId = residentIds[resIdx];
      const runnerId = rand(runnerIds);
      const placed = new Date(now - day * 86400000 - (2 + Math.random() * 10) * 3600000);
      const delivered = new Date(placed.getTime() + (18 + Math.random() * 30) * 60000);
      if (delivered.getTime() > now) continue;
      const fee = fees[shop.category] ?? fees.other;
      const rating = Math.random() < 0.7 ? (Math.random() < 0.8 ? 5 : 4) : null;
      const [o] = await db
        .insert(orders)
        .values({
          code: code(),
          residentId,
          runnerId,
          category: shop.category,
          kind: shop.category === "laundry" ? "pickup" : "buy",
          status: "delivered",
          vendorId: shop.id,
          vendorName: shop.name,
          items: [{ name: itemName, qty, price }],
          dropBlock: RESIDENTS[resIdx][1],
          dropHouse: RESIDENTS[resIdx][2],
          budget,
          serviceFee: fee,
          total: budget + fee,
          actualCost: actual,
          changeRefunded: 0,
          deliveryCode: "0000",
          rating,
          ratingTags: rating ? ["Fast", "Polite"] : null,
          createdAt: placed,
          paidAt: placed,
          assignedAt: placed,
          acceptedAt: placed,
          atVendorAt: new Date(placed.getTime() + 6 * 60000),
          onTheWayAt: new Date(placed.getTime() + 14 * 60000),
          arrivedAt: delivered,
          deliveredAt: delivered,
          updatedAt: delivered,
        })
        .returning();
      await db.insert(orderEvents).values({ orderId: o.id, type: "delivered", message: "Delivered — code confirmed", createdAt: delivered });
      await db.insert(runnerEarnings).values({
        runnerId,
        orderId: o.id,
        type: "commission",
        amount: Math.round((fee * DEFAULT_SETTINGS.runnerCommissionPct) / 100),
        weekStart: weekStart(delivered),
        createdAt: delivered,
      });
      await db
        .update(users)
        .set({ deliveredCount: sql`${users.deliveredCount} + 1`, lastOrderAt: delivered })
        .where(sql`${users.id} = ${residentId}`);
      if (rating) {
        const r = ratingSums.get(runnerId) ?? { sum: 0, n: 0 };
        ratingSums.set(runnerId, { sum: r.sum + rating, n: r.n + 1 });
      }
      made++;
    }
  }
  // A sample conversation between Amaka and Village Mart.
  const mart = shopRows.find((r) => r.name === "Village Mart");
  if (mart && residentIds[0]) {
    const base = Date.now() - 50 * 60_000;
    const at = (min: number) => new Date(base + min * 60_000);
    const [t] = await db
      .insert(schema.shopThreads)
      .values({ vendorId: mart.id, residentId: residentIds[0], lastMessageAt: at(9), lastPreview: "Your order is packed. Send a rider when you're ready.", residentReadAt: at(9), vendorReadAt: at(9) })
      .returning();
    const chika = (await db.select().from(users).where(sql`${users.phone} = '2348050000002'`))[0];
    await db.insert(schema.shopMessages).values([
      { threadId: t.id, side: "resident", senderId: residentIds[0], body: "Hi, do you have a crate of eggs and 2 tins of milk?", createdAt: at(0) },
      { threadId: t.id, side: "vendor", senderId: chika?.id ?? null, body: "Hi Amaka! Yes we do. That's ₦7,800 for everything.", createdAt: at(2) },
      { threadId: t.id, side: "vendor", senderId: chika?.id ?? null, body: "Please pay to Guaranty Trust Bank, 0123456701 (DEMO VILLAGE MART).", createdAt: at(3) },
      { threadId: t.id, side: "resident", senderId: residentIds[0], body: "Done, just sent it.", createdAt: at(6) },
      { threadId: t.id, side: "vendor", senderId: chika?.id ?? null, body: "Your order is packed. Send a rider when you're ready.", createdAt: at(9) },
    ]);
  }

  for (const [runnerId, r] of ratingSums) {
    await db.update(runnerProfiles).set({ ratingSum: r.sum, ratingCount: r.n }).where(sql`${runnerProfiles.userId} = ${runnerId}`);
  }

  console.log(`✓ Seeded ${SHOPS.length} shops, ${RUNNERS.length} runners, ${RESIDENTS.length} residents, ${made} past errands.`);
  console.log(`  Admin phone: ${ADMIN_PHONE}`);
  console.log(`  Demo resident: 0809 999 9999 (Amaka Obi) · Demo runner: 0801 111 1111 (Adaeze)`);
  console.log(`  Demo shop staff: 0805 000 0002 (Chika, Village Mart)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
