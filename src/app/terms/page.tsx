import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { APP_NAME } from "@/lib/brand";
import { LEGAL_NAME, SERVICE_AREA } from "@/lib/legal";
import { formatPhoneLocal } from "@/lib/phone";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const s = await getSettings();
  const contact = s.supportPhone ? (
    <>
      through Chat with support in the app, or by phone or WhatsApp on <strong>{formatPhoneLocal(s.supportPhone)}</strong>
    </>
  ) : (
    "through Chat with support in the app"
  );

  const sections: LegalSection[] = [
    {
      id: "about",
      title: "About these terms",
      body: (
        <>
          <p>
            These terms are an agreement between you and {LEGAL_NAME} (&ldquo;{APP_NAME}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). They apply whenever you use the{" "}
            {APP_NAME} website or app as a resident, a runner or a member of a shop&apos;s staff.
          </p>
          <p>By creating an account or using {APP_NAME}, you agree to these terms and to our <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the service.</p>
        </>
      ),
    },
    {
      id: "service",
      title: "What Runam does",
      body: (
        <>
          <p>{APP_NAME} helps residents of {SERVICE_AREA} get errands done inside the estate. There are two ways to use it:</p>
          <ul>
            <li>
              <strong>Order from a shop yourself.</strong> You chat with or call a shop in the app, agree what you want and pay the shop directly. When your order is ready,
              you book a runner in the app to collect it and bring it to you.
            </li>
            <li>
              <strong>Let a runner buy it for you.</strong> You tell us what you need and set a budget. The runner buys it, we pay the shop from your budget, and the
              runner delivers it.
            </li>
          </ul>
          <p>
            Shops on {APP_NAME} are independent businesses. They decide their own prices, stock and opening hours, and they are responsible for the goods they sell. We
            provide the app and the delivery service, not the goods.
          </p>
          <p>We only run errands inside {SERVICE_AREA}, during the opening hours shown in the app.</p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "Your account",
      body: (
        <>
          <ul>
            <li>You must be at least 18 years old to create an account.</li>
            <li>You sign in with your email address and a one-time code we email you. Keep your email account and codes to yourself; you&apos;re responsible for what happens on your account.</li>
            <li>Give us accurate details, especially your name and address in the estate, so runners can find you.</li>
            <li>One account per person. Don&apos;t sign in as someone else or let others use your account.</li>
            <li>Tell us straight away if you think someone else has access to your account.</li>
          </ul>
        </>
      ),
    },
    {
      id: "payments",
      title: "Fees and payments",
      body: (
        <>
          <ul>
            <li>
              <strong>Delivery and service fees</strong> are shown before you confirm an errand, and you pay them up front in the app by card, bank transfer, USSD or
              wallet. Payments are processed by Paystack; we never see or store your full card details.
            </li>
            <li>
              <strong>When a runner buys for you,</strong> you pay the items budget up front too. If the items cost more, the runner asks you in the app before buying, and
              nothing extra is charged unless you approve it. If they cost less, the difference goes to your {APP_NAME} wallet when the errand is delivered.
            </li>
            <li>
              <strong>When you order from a shop yourself,</strong> you pay the shop for your items directly. That payment is between you and the shop. We only charge you
              for delivery.
            </li>
            <li>Every so often, a service fee is free as part of our loyalty offer. We may change or end offers at any time.</li>
            <li>Prices and fees can change, but never for an errand you have already paid for.</li>
          </ul>
        </>
      ),
    },
    {
      id: "wallet",
      title: "Your wallet",
      body: (
        <>
          <p>
            Your wallet holds change from errands, refunds and any credit we give you. It&apos;s a balance you can spend on {APP_NAME} or withdraw to your own Nigerian bank
            account. It isn&apos;t a bank account, it doesn&apos;t earn interest, and it can&apos;t be transferred to another person.
          </p>
          <p>Withdrawals are sent by bank transfer, usually within a short time, but may be delayed by your bank or by checks we need to make.</p>
        </>
      ),
    },
    {
      id: "cancel",
      title: "Cancellations and refunds",
      body: (
        <>
          <ul>
            <li>You can cancel an errand until your runner reaches the shop or pick-up point. What you paid goes back to your wallet.</li>
            <li>After that, an errand can only be cancelled by us. If a runner has already bought items or made the trip, we may not refund the fee or the items.</li>
            <li>
              If you book a rider to collect an order and the shop says it isn&apos;t ready or hasn&apos;t been paid, the trip may still be charged. Only book once the shop
              confirms your order is packed.
            </li>
            <li>
              If something a runner bought for you is wrong or missing, don&apos;t give your delivery code. Tell us in the errand chat and we&apos;ll put it right or refund
              you.
            </li>
            <li>
              For orders you placed with a shop yourself, problems with the goods (quality, quantity, price) are for you and the shop to resolve. We&apos;ll help where we
              can, but the shop is responsible for what it sells.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "delivery",
      title: "Delivery codes",
      body: (
        <p>
          Every errand has a 4-digit delivery code that only you can see. Give it to the runner only when you have everything you expected. Giving the code confirms the
          errand is complete. If you share it before you&apos;ve checked your items, we may not be able to help with problems afterwards.
        </p>
      ),
    },
    {
      id: "off-platform",
      title: "Dealings outside the app",
      body: (
        <>
          <p>
            <strong>
              {APP_NAME} only covers errands that are booked and paid for in the app. If you arrange anything directly with a runner or a shop outside {APP_NAME}, you do so
              at your own risk.
            </strong>
          </p>
          <p>This includes, for example:</p>
          <ul>
            <li>paying a runner in cash or by transfer to their own account;</li>
            <li>booking a runner privately, by phone or in person, instead of through the app;</li>
            <li>meeting a runner or shop staff somewhere other than for an errand booked in the app;</li>
            <li>asking a shop to deliver using its own staff or a rider you found outside the app.</li>
          </ul>
          <p>
            We are not responsible for, and will not compensate you for, any loss, theft, damage, injury, delay or dispute that comes from an arrangement made outside the
            app. We can&apos;t trace or recover money paid outside the app. Runners and shops are not allowed to ask you to deal outside {APP_NAME}; please report it if they
            do.
          </p>
        </>
      ),
    },
    {
      id: "chat",
      title: "Chats and calls",
      body: (
        <>
          <p>
            You can chat with and call shops, and your runner during an errand, inside the app. Calls go over the internet and use your mobile data or Wi-Fi. Phone numbers
            are never shared, and numbers or WhatsApp links typed into a chat are hidden.
          </p>
          <ul>
            <li>We store chat messages so they appear on all your devices and so we can help with disputes. We don&apos;t record calls; we keep only the time and length of each call.</li>
            <li>Be respectful. Harassment, threats, abusive language, spam or sharing other people&apos;s private information isn&apos;t allowed.</li>
            <li>We may read chats when someone reports a problem, to investigate fraud or abuse, or when the law requires it.</li>
          </ul>
        </>
      ),
    },
    {
      id: "rules",
      title: "What you can't use Runam for",
      body: (
        <>
          <p>You may not use {APP_NAME} to buy, carry or deliver:</p>
          <ul>
            <li>anything illegal in Nigeria, including illegal drugs, weapons or stolen goods;</li>
            <li>prescription-only medicine without a valid prescription from the pharmacy;</li>
            <li>alcohol or tobacco for anyone under 18;</li>
            <li>cash, or high-value items like jewellery or phones, unless we&apos;ve agreed it with you first;</li>
            <li>animals, or anything dangerous, too heavy or too large for one person to carry safely.</li>
          </ul>
          <p>Runners may refuse any errand they believe breaks these rules or isn&apos;t safe.</p>
        </>
      ),
    },
    {
      id: "runners",
      title: "If you're a runner",
      body: (
        <ul>
          <li>Only accept and run errands through the app. Never ask a resident for cash, a transfer to your own account, or private bookings.</li>
          <li>Keep receipts and confirm what you paid in the app. Shops are paid by {APP_NAME}, not by you.</li>
          <li>Hand items over only after the resident gives you their delivery code.</li>
          <li>Your earnings are your share of the service fee plus any bonus shown in the app, paid to the bank account you gave us.</li>
          <li>Breaking these rules, including taking jobs outside the app, can lead to your account being removed and unpaid earnings being withheld where the law allows.</li>
        </ul>
      ),
    },
    {
      id: "shops",
      title: "If you're a shop",
      body: (
        <ul>
          <li>Keep your prices, stock and hours accurate, and only take orders you can fulfil.</li>
          <li>You are responsible for the goods you sell, including their quality, safety, labelling and any licences they need.</li>
          <li>Hand orders only to the runner booked in the app, and only for the name shown in your chat.</li>
          <li>Each staff member signs in with their own number. Tell us when someone leaves so we can remove their access.</li>
          <li>Payouts for errands where a runner buys from you are sent to the bank account you gave us.</li>
        </ul>
      ),
    },
    {
      id: "liability",
      title: "Our responsibility to you",
      body: (
        <>
          <p>
            We work hard to keep {APP_NAME} running smoothly, but the service is provided as it is and as available. We can&apos;t promise it will always be uninterrupted or
            error-free, or that a runner will always be free.
          </p>
          <p>
            Nothing in these terms limits any rights you have under Nigerian consumer protection law that can&apos;t be limited. Otherwise, as far as the law allows, our total
            responsibility to you for any errand is limited to the amount you paid us for that errand, and we are not responsible for indirect losses, or for the goods sold
            by shops.
          </p>
          <p>We aren&apos;t responsible for delays or failures caused by things outside our control, such as bad weather, power or network outages, or estate security restrictions.</p>
        </>
      ),
    },
    {
      id: "suspension",
      title: "Suspending or closing accounts",
      body: (
        <p>
          You can stop using {APP_NAME} at any time. We may suspend or close an account that breaks these terms, is used for fraud or abuse, or puts other people at risk.
          If we close your account for reasons other than misuse, any wallet balance will be paid to your bank account.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to these terms",
      body: <p>We may update these terms as {APP_NAME} grows. If a change is important, we&apos;ll tell you in the app before it takes effect. Continuing to use {APP_NAME} after that means you accept the new terms.</p>,
    },
    {
      id: "law",
      title: "Law and disputes",
      body: (
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria. If you have a complaint, contact us first and we&apos;ll try to resolve it quickly. If we
          can&apos;t, the courts of the Federal Capital Territory, Abuja will have jurisdiction.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact us",
      body: <p>Questions about these terms? Contact {LEGAL_NAME} {contact}.</p>,
    },
  ];

  return (
    <LegalPage
      title="Terms of Service"
      other={{ href: "/privacy", label: "Privacy Policy" }}
      intro={
        <p>
          Please read these terms carefully. They explain how {APP_NAME} works, what you can expect from us, and what we expect from residents, runners and shops. Section 8
          explains that we can&apos;t take responsibility for anything arranged outside the app.
        </p>
      }
      sections={sections}
    />
  );
}
