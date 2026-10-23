import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { APP_NAME } from "@/lib/brand";
import { LEGAL_NAME, SERVICE_AREA } from "@/lib/legal";
import { formatPhoneLocal } from "@/lib/phone";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
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
      id: "who",
      title: "Who we are",
      body: (
        <p>
          {LEGAL_NAME} (&ldquo;{APP_NAME}&rdquo;, &ldquo;we&rdquo;) runs the {APP_NAME} errand service in {SERVICE_AREA}. We are the data controller for the personal data
          described here, and we handle it in line with the Nigeria Data Protection Act 2023 (NDPA).
        </p>
      ),
    },
    {
      id: "collect",
      title: "What we collect",
      body: (
        <>
          <p>
            <strong>Everyone:</strong> your phone number, your name, and (if you give it) your email address. We also keep a record of when you sign in.
          </p>
          <p>
            <strong>Residents:</strong> your address in the estate (block, house, street and any landmark), the errands you request, notes and photos you add, budgets,
            ratings, your wallet balance and history, and your chats with runners, shops and our support team.
          </p>
          <p>
            <strong>Runners:</strong> your name and phone number, National Identification Number (NIN), your guarantor&apos;s name and phone number, your bank account for
            payouts, the errands you run, receipt photos, ratings and earnings.
          </p>
          <p>
            <strong>Shop staff:</strong> your name, phone number and the shop you work for, and the chats you have with customers.
          </p>
          <p>
            <strong>Payments:</strong> payment references, amounts, how you paid (for example card or transfer) and whether it succeeded. Card payments are handled by Paystack;
            we never receive your full card number or PIN. If you withdraw from your wallet, we keep the bank account you send it to.
          </p>
          <p>
            <strong>Calls:</strong> who called whom, when, and for how long. Calls are not recorded and we never hear or store what is said.
          </p>
          <p>
            <strong>Technical data:</strong> if you turn on notifications, a notification token for your device. Our hosting provider also keeps short-lived logs, such as IP
            addresses, for security. We do not track your GPS location.
          </p>
        </>
      ),
    },
    {
      id: "use",
      title: "How we use it, and why",
      body: (
        <>
          <ul>
            <li>
              <strong>To provide the service</strong> (because we have an agreement with you): signing you in, running and tracking errands, matching you with a runner,
              taking payments, paying shops and runners, refunds, chats and calls.
            </li>
            <li>
              <strong>To keep {APP_NAME} safe</strong> (our legitimate interest): vetting runners, preventing fraud and misuse, hiding phone numbers in chats, and
              investigating complaints.
            </li>
            <li>
              <strong>To improve the service</strong> (our legitimate interest): understanding which errands are popular and where things go wrong, and checking in with
              regular residents who stop ordering.
            </li>
            <li>
              <strong>To send notifications</strong> (with your consent): push notifications about your errands, chats and calls. You can turn them off at any time in your
              account or device settings.
            </li>
            <li>
              <strong>To meet the law</strong> (legal obligation): keeping financial records and responding to lawful requests from authorities.
            </li>
          </ul>
          <p>We don&apos;t sell your data, and we don&apos;t use it for advertising.</p>
        </>
      ),
    },
    {
      id: "share",
      title: "Who can see your information",
      body: (
        <>
          <ul>
            <li>
              <strong>Your runner</strong> sees your first name, your address in the estate and the details of your errand, so they can deliver it.
            </li>
            <li>
              <strong>Shops</strong> you chat with see your first name and last initial, your messages, and the name your order is under. They never see your phone number or
              address.
            </li>
            <li>
              <strong>Residents</strong> see their runner&apos;s first name, rating and bag number, and the shop&apos;s name.
            </li>
            <li>
              <strong>Our team</strong> can see what&apos;s needed to run the service, settle disputes and keep people safe.
            </li>
          </ul>
          <p>We also use trusted service providers who handle data only on our instructions:</p>
          <ul>
            <li>Paystack, to take payments and send transfers to shops, runners and your bank;</li>
            <li>an SMS provider (such as Termii), to send your sign-in codes;</li>
            <li>Vercel and Neon, to host the app and its database;</li>
            <li>Google, Apple and Mozilla notification services, to deliver push notifications;</li>
            <li>internet relay services (such as Cloudflare), to connect in-app calls. They help route encrypted call audio and can&apos;t listen to it.</li>
          </ul>
          <p>We may share information with the police or other authorities when the law requires it, or to protect someone&apos;s safety.</p>
        </>
      ),
    },
    {
      id: "transfers",
      title: "Where your data is stored",
      body: (
        <p>
          Our servers and database are in London, United Kingdom, and some of our providers may process data in other countries. When your data leaves Nigeria we rely on
          the protections allowed by the NDPA, such as the destination&apos;s data protection laws and our providers&apos; contractual commitments, so it stays protected to
          the same standard.
        </p>
      ),
    },
    {
      id: "keep",
      title: "How long we keep it",
      body: (
        <ul>
          <li>Your account details, for as long as your account is open.</li>
          <li>Errand, payment, wallet and payout records, for as long as Nigerian law requires us to keep financial records (generally up to six years).</li>
          <li>Chats and call records, while your account is open and for a reasonable time afterwards to settle any disputes.</li>
          <li>Runner vetting details (NIN and guarantor), while the runner works with us and for one year afterwards.</li>
          <li>Sign-in codes, only as a scrambled (hashed) value that expires within minutes.</li>
        </ul>
      ),
    },
    {
      id: "security",
      title: "How we protect it",
      body: (
        <p>
          The app only works over encrypted connections, sign-in codes are stored in scrambled form, calls are encrypted between devices, and access to personal data inside
          our team is limited to people who need it. No system is perfectly secure, so if we ever have a data breach that puts you at risk, we&apos;ll tell you and the Nigeria
          Data Protection Commission as the law requires.
        </p>
      ),
    },
    {
      id: "rights",
      title: "Your rights",
      body: (
        <>
          <p>Under the NDPA you can ask us to:</p>
          <ul>
            <li>give you a copy of the personal data we hold about you;</li>
            <li>correct anything that&apos;s wrong or out of date;</li>
            <li>delete your data, unless we must keep it by law (for example payment records);</li>
            <li>stop or limit how we use it, or object to how we use it for our legitimate interests;</li>
            <li>send your data to you or another service in a common format;</li>
            <li>withdraw consent you&apos;ve given, such as for notifications.</li>
          </ul>
          <p>
            Contact us {contact} and we&apos;ll respond within 30 days. If you&apos;re not happy with our response, you can complain to the Nigeria Data Protection Commission
            (NDPC).
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies",
      body: (
        <p>
          We use one essential cookie to keep you signed in. Your browser also stores parts of the app so it loads faster and works when your connection drops. We don&apos;t
          use advertising or tracking cookies.
        </p>
      ),
    },
    {
      id: "children",
      title: "Children",
      body: <p>{APP_NAME} is for adults aged 18 and over. We don&apos;t knowingly collect data from children. If you think a child has created an account, please let us know and we&apos;ll remove it.</p>,
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: <p>If we change how we use your data in an important way, we&apos;ll tell you in the app before the change takes effect. The date at the top shows when this policy was last updated.</p>,
    },
    {
      id: "contact",
      title: "Contact us",
      body: (
        <p>
          For any question about your data, contact {LEGAL_NAME} {contact}. You can also read our <Link href="/terms">Terms of Service</Link>.
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      title="Privacy Policy"
      other={{ href: "/terms", label: "Terms of Service" }}
      intro={
        <p>
          This policy explains what personal data {APP_NAME} collects, why, who can see it, and the choices you have. We collect only what we need to run errands safely
          inside the estate.
        </p>
      }
      sections={sections}
    />
  );
}
