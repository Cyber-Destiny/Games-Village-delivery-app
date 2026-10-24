# Runam — errands inside Games Village

Live at **https://runam.app**

Runam is a web app for errands inside the estate: residents ask for food, groceries, gas refills, parcel pick-ups or laundry, a vetted runner does it, and **the shop is paid directly by the platform** so runners never handle residents' money.

It's a mobile-first web app (installable on the home screen). Everyone signs in at `/login` with their phone number, and the app opens the right part for them:

| Who | Where | What they do |
|---|---|---|
| **Residents** | `/home` | Start an errand, pay with Paystack or wallet, track it live, approve extra money, give the delivery code, get change back in their wallet, rate the runner |
| **Runners** | `/runner` | Go online, get errands (with sound + vibration), accept, confirm the purchase with a receipt photo, the shop is paid automatically, deliver, enter the resident's code |
| **Shop staff** | `/shop` | Chat with customers, see riders on their way |
| **You (admin)** | `/admin` | Live dashboard, errands, runners, shops & their items, payout approvals, runner payouts, residents (incl. "gone quiet" watch), support chats, fees and settings |

**Who gets in where.** Everyone signs in with their email and a 6-digit code we email them. Only the emails in `ADMIN_EMAILS` can open `/admin`. An email becomes a runner when you add it in Admin → Runners, and shop staff when you add it to a shop. Everyone else is a resident. If someone opens a page that isn't theirs (a runner trying `/admin`, say), they're sent back to their own home. Admins can also use the resident app, and there's an "Open admin console" button on their Account page.

> "Runam" is a working name. Change it in one place: set `NEXT_PUBLIC_APP_NAME` (and `NEXT_PUBLIC_ESTATE_NAME`) in your environment.

---

## Two ways to order

**Chat with the shop.** Residents tap a shop and chat with it in the app: ask what's in stock, agree the price, and pay the shop directly (the shop can send its bank details in one tap). Once they've paid, they tap **Send rider**, enter the name the order is under, and pay the delivery fee in the app. The shop is then asked in the chat (and on its "Riders coming" tab) whether the payment reached them: only after **Payment received** is a rider sent. **Not yet** tells the resident to check their transfer or cancel. (Shops with nobody on chat skip this step; an admin can also confirm on the shop's behalf from the errand page.) The shop sees in the same chat when the rider arrives. At the door the rider enters the resident's delivery code and takes a photo of the handover as proof of delivery. Cancelling before the rider reaches the shop refunds the fee to the wallet.

Phone numbers and WhatsApp links typed into chats are hidden, so orders stay on the platform.

**Let a runner buy it.** The resident pays everything up front and the app pays the shop, as described below. This needs Paystack Transfers, so it's **off by default**: switch it on in Admin → Settings once your Paystack account can send transfers. While it's off, the Food, Groceries and Gas tiles show those shops, and Pick up / Laundry errands (no buying involved) still work.

### In-app calls

Residents can call a shop from its chat, and residents and runners can call each other during an errand, using the call button. Calls go over the internet (WebRTC), so phone numbers are never shared, and they aren't recorded; the chat or errand timeline gets a line like "Voice call · 2:31" or "Missed call".

Calls connect directly between phones. On some mobile networks that isn't possible without a relay, so for reliable calls add a TURN service (for example Cloudflare Realtime TURN or Metered) and set `TURN_URLS`, `TURN_USERNAME` and `TURN_CREDENTIAL`. Microphone access needs HTTPS, which the live site has.

### Support

Residents, runners and shop staff can tap **Chat with support** (Account, Profile or the shop inbox, and "Get help" on any errand). Messages arrive in **Admin → Support** with a badge and a push notification to every admin; replies go straight back to them. Next to the chat there are **Call** and **WhatsApp** buttons for the support phone set in Admin → Settings (also shown on the landing page, the login screen, and in the Terms and Privacy Policy).

### Shop staff

In `/admin/vendors`, add each shop's staff under **Shop staff on chat** (email + name). They sign in with that email like everyone else and land in the shop inbox at `/shop`: chats with customers, and riders on their way. Residents never see it. Removing someone signs them out.

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

Everything in this section is for a test copy on your own computer. The live site has no demo data and no demo mode.

Requirements: Node 20.9+ and a Postgres database (local, or a free one from [Neon](https://neon.tech)).

```bash
npm install
cp .env.example .env        # then set DATABASE_URL, and DEMO_MODE=true
npm run setup               # creates tables + demo data
npm run dev                 # http://localhost:3000
```

With `DEMO_MODE=true` and no Paystack key, payments go through a pretend checkout and shop transfers "settle" after a few seconds, and the login code is shown on screen (without it, codes are only printed in the terminal).

> ⚠️ `DEMO_MODE=true` lets anyone sign in as anyone. Never set it on the live site. Without it and without a Paystack key, the app refuses payments with "Online payments aren't switched on yet".

Demo accounts (all made up, local only; the seed script refuses to run against anything but a local database):

| Role | Email |
|---|---|
| Admin | `admin@example.com` (whatever you put first in `ADMIN_EMAILS`) |
| Resident | `amaka.obi@example.com` |
| Runner | `adaeze.okafor@example.com`, `musa.bello@example.com`, `tunde.adeyemi@example.com` |
| Shop staff | `chika@example.com` (Village Mart) |

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
4. Sign in at `/login` with your admin email and add your real shops and runners in `/admin`. Don't set `DEMO_MODE` and don't run the demo seed on the live database.

### 3. Paystack
1. Create a Paystack business account and complete **business activation**. A **Starter** (unregistered) business can take payments but can't send transfers; a **Registered** business (CAC) can do both.
2. Put your secret key in `PAYSTACK_SECRET_KEY` (`sk_test_…` first, `sk_live_…` at launch). On a Starter business also set `PAYSTACK_TRANSFERS=off`: bank account names are then typed in, and runner payouts and wallet withdrawals appear in Admin → Payouts for you to pay from your bank app and tap **Mark as paid**.
3. In Paystack → *Settings → API Keys & Webhooks*, set:
   - **Webhook URL:** `https://YOUR-DOMAIN/api/paystack/webhook`
   - **Callback URL:** `https://YOUR-DOMAIN/pay/callback`

   (Both are shown with a copy button in `/admin/settings`.)
4. In Paystack → *Settings → Preferences*, **turn off OTP for transfers**, otherwise automatic shop payments will stop and ask for an OTP.
5. Keep your Paystack balance topped up so transfers to shops and runners go through.

Paystack charges a fee on every payment; build that into your service fees in `/admin/settings`.

### 4. Sign-in codes by email (Resend)
Create a Resend account, add your domain (it gives you a few DNS records to add), and set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Runam <codes@runam.app>`). **Nobody can sign in on the live site until this is done**: without it, codes are only written to the server logs (Vercel → your project → Logs, search for `email:console`). Resend's free plan covers 3,000 emails a month (100 a day).

SMS (Termii) is optional and only used for a few errand alerts. A Nigerian SMS sender ID needs CAC documents.

### 5. Push notifications (recommended for runners)
```bash
npx web-push generate-vapid-keys
```
Put the keys in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Runners and residents can then switch on notifications from their profile. On iPhone this needs the app added to the home screen first.

### 6. Terms and privacy
The Terms of Service (`/terms`) and Privacy Policy (`/privacy`) are written for a Nigerian business under the Nigeria Data Protection Act 2023. Set `NEXT_PUBLIC_LEGAL_NAME` to your registered business name and the support phone in `/admin/settings`, and have a lawyer look over both before launch. Depending on how many people's data you handle, you may also need to register with the Nigeria Data Protection Commission.

### Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `APP_URL` | ✅ | Your public URL, e.g. `https://runam.app` (no trailing slash) |
| `SESSION_SECRET` | ✅ | Long random string — `openssl rand -base64 48` |
| `ADMIN_EMAILS` | ✅ | Comma-separated admin emails |
| `RESEND_API_KEY`, `EMAIL_FROM` | ✅ | Sends sign-in codes by email |
| `PAYSTACK_SECRET_KEY` | for payments | Empty = no payments (pretend checkout only with `DEMO_MODE=true`) |
| `PAYSTACK_TRANSFERS` | | `off` for a Starter Paystack business (no transfers): payouts are paid by hand |
| `PAYSTACK_EMAIL_DOMAIN` | | Used to build an email for residents who haven't added one |
| `SMS_PROVIDER`, `TERMII_*` | | Optional SMS alerts |
| `DEMO_MODE` | | Local demo only: on-screen login codes and a pretend checkout. Never set on the live site. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | for push | Web push notifications |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ESTATE_NAME` | | Rename the app / estate |
| `NEXT_PUBLIC_LEGAL_NAME` | | Your registered business name, used in the Terms and Privacy Policy |
| `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` | for calls on mobile data | TURN relay for in-app calls |

---

## Day-to-day admin

- **Add runners** in `/admin/runners` with their phone, NIN, guarantor and bank account. They sign in with that phone number.
- **Add shops** in `/admin/vendors` (Shops) with a photo, the staff who reply to chats, their bank account and popular items. Partner shops are paid automatically.
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
