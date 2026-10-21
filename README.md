# Runam — errands inside Games Village

Runam is a web app for errands inside the estate: residents ask for food, groceries, gas refills, parcel pick-ups or laundry, a vetted runner does it, and **the shop is paid directly by the platform** so runners never handle residents' money.

It's a mobile-first web app (installable on the home screen) with three parts:

| Who | Where | What they do |
|---|---|---|
| **Residents** | `/home` | Start an errand, pay with Paystack or wallet, track it live, approve extra money, give the delivery code, get change back in their wallet, rate the runner |
| **Runners** | `/runner` | Go online, get errands (with sound + vibration), accept, confirm the purchase with a receipt photo, the shop is paid automatically, deliver, enter the resident's code |
| **You (admin)** | `/admin` | Live dashboard, errands, runners, shops & their items, payout approvals, runner payouts, residents (incl. "gone quiet" watch), fees and settings |

> "Runam" is a working name. Change it in one place: set `NEXT_PUBLIC_APP_NAME` (and `NEXT_PUBLIC_ESTATE_NAME`) in your environment.

---

## Two ways to order

**Order from the shop directly.** Tap a shop to see its phone numbers, call or WhatsApp to order, and pay the shop yourself. Once it's packed, tap **Send a rider**, enter the name the order is under, and pay the delivery fee in the app. The rider asks the shop for the order by that name and never handles any money. Cancelling before the rider reaches the shop refunds the fee to the wallet.

**Let a runner buy it.** The resident pays everything up front and the app pays the shop, as described below.

## How the money flows (runner buys it)

1. The resident sets a **budget** for the items and pays *budget + service fee* up front (card, transfer or USSD via Paystack, or from their wallet).
2. At the shop the runner enters what it actually cost and snaps the receipt.
   - If it's **more** than the budget, the resident gets an in-app request to approve the extra amount.
   - Otherwise the app **transfers the money straight to the shop's bank account** (automatically for partner shops; one-off shops need your approval).
3. At the door the resident checks everything and gives the runner a **4-digit delivery code**. Only that code completes the errand.
4. On delivery, any **change goes to the resident's wallet** instantly, and the runner earns their commission (default 70% of the service fee), plus a weekly bonus when they hit the target.
5. Every 10th errand's service fee is free (configurable).

This is what keeps everyone in the app: residents are covered only for in-app payments, runners never hold cash, runners are assigned automatically (so nobody "owns" a household), phone numbers stay hidden behind in-app chat, and the admin "gone quiet" list flags regulars who suddenly stop ordering.

---

## Try it locally (demo mode)

Requirements: Node 20.9+ and a Postgres database (local, or a free one from [Neon](https://neon.tech)).

```bash
npm install
cp .env.example .env        # then set DATABASE_URL, and DEMO_SHOW_OTP=true
npm run setup               # creates tables + demo data
npm run dev                 # http://localhost:3000
```

With no Paystack key the app runs in **demo mode**: payments go through a fake checkout and shop transfers "settle" after a few seconds. With `DEMO_SHOW_OTP=true` the login code is shown on screen (otherwise it's printed in the terminal).

> ⚠️ `DEMO_SHOW_OTP=true` lets anyone sign in as anyone — only use it for a private demo. It switches itself off as soon as SMS (Termii) is configured.

Demo accounts (all made up — sign in with these numbers):

| Role | Phone |
|---|---|
| Admin | `0800 000 0000` (whatever you put in `ADMIN_PHONES`) |
| Resident | `0809 999 9999` (Amaka) |
| Runner | `0801 111 1111` (Adaeze), `0802 222 2222`, `0803 333 3333` |

Start an errand as Amaka in one browser and accept it as Adaeze in another (or a private window) to see the whole flow.

To wipe everything and start again: `npm run db:seed -- --reset` (**deletes all data**).

---

## Going live

### 1. Database
Create a Postgres database (Neon free tier is plenty to start). Use the **pooled** connection string as `DATABASE_URL`.

### 2. Deploy (Vercel recommended)
1. Import this GitHub repo into Vercel.
2. Add the environment variables from `.env.example` (see the table below).
3. Deploy. The `vercel-build` script runs database migrations automatically before each build.
4. Don't run the demo seed on your live database. Instead, sign in with your admin number and add your real shops and runners in `/admin`.

### 3. Paystack
1. Create a Paystack business account and complete **business activation** (Paystack needs this before you can accept live payments and use Transfers — usually means CAC registration).
2. Put your secret key in `PAYSTACK_SECRET_KEY` (`sk_test_…` first, `sk_live_…` at launch).
3. In Paystack → *Settings → API Keys & Webhooks*, set:
   - **Webhook URL:** `https://YOUR-DOMAIN/api/paystack/webhook`
   - **Callback URL:** `https://YOUR-DOMAIN/pay/callback`

   (Both are shown with a copy button in `/admin/settings`.)
4. In Paystack → *Settings → Preferences*, **turn off OTP for transfers**, otherwise automatic shop payments will stop and ask for an OTP.
5. Keep your Paystack balance topped up so transfers to shops and runners go through.

Paystack charges a fee on every payment; build that into your service fees in `/admin/settings`.

### 4. SMS login codes (Termii)
Set `SMS_PROVIDER=termii`, `TERMII_API_KEY`, and `TERMII_SENDER_ID` (register a sender ID with Termii; use `TERMII_CHANNEL=dnd` so codes reach DND numbers). Once this is set, login codes are only ever sent by SMS.

### 5. Push notifications (recommended for runners)
```bash
npx web-push generate-vapid-keys
```
Put the keys in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Runners and residents can then switch on notifications from their profile. On iPhone this needs the app added to the home screen first.

### Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `APP_URL` | ✅ | Your public URL, e.g. `https://runam.vercel.app` (no trailing slash) |
| `SESSION_SECRET` | ✅ | Long random string — `openssl rand -base64 48` |
| `ADMIN_PHONES` | ✅ | Comma-separated admin numbers, e.g. `2348031234567` |
| `PAYSTACK_SECRET_KEY` | for payments | Empty = demo mode |
| `PAYSTACK_EMAIL_DOMAIN` | | Used to build an email for residents who haven't added one |
| `SMS_PROVIDER`, `TERMII_*` | for SMS | Login codes and key alerts |
| `DEMO_SHOW_OTP` | | `true` shows login codes on screen (demo only). Always off once SMS is configured. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | for push | Web push notifications |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ESTATE_NAME` | | Rename the app / estate |

---

## Day-to-day admin

- **Add runners** in `/admin/runners` with their phone, NIN, guarantor and bank account. They sign in with that phone number.
- **Add shops** in `/admin/vendors` (Shops) with their phone numbers, bank account and popular items. Residents see the numbers when they tap the shop. Partner shops are paid automatically.
- **Approve payouts** in `/admin/payouts` (one-off shops and wallet withdrawals), and pay runners their earnings weekly with one tap.
- **Watch the overview** for errands waiting too long, runners not accepting, failed transfers and unread chats.
- **Residents → Gone quiet** lists regulars who stopped ordering. Give them a call.
- **Settings**: fees per category, runner commission, weekly bonus, loyalty, opening hours, announcement banner, support phone. "Accepting errands" pauses the service instantly.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Drizzle ORM + Postgres · Paystack · Termii · Web Push.

```
src/app/(auth)       sign-in and onboarding
src/app/(resident)   resident app
src/app/runner       runner app
src/app/admin        admin console
src/app/api          JSON endpoints, Paystack webhook, uploads
src/lib/orders       order state machine, dispatch, queries
src/lib/payouts.ts   transfers to shops/runners
src/lib/db           schema (drizzle) — migrations live in /drizzle
```

Useful commands: `npm run typecheck`, `npm run db:generate` (after editing the schema), `npm run db:migrate`.
