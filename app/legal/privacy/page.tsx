import { contactEmail, legalEntity } from "@/lib/legal";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  const entity = legalEntity();
  const email = contactEmail();
  return (
    <article className="mx-auto grid max-w-2xl gap-4 text-sm leading-relaxed text-muted">
      <h1 className="font-display text-4xl text-foam">Privacy</h1>
      <p>{entity} is the controller for the personal data this app stores. This notice is written for UK GDPR. Have counsel review it before launch. Contact {email}.</p>
      <h2 className="font-display text-2xl text-foam">What we store</h2>
      <p>Wallet address, optional email, optional country, orders, payment signatures, licences, a hash of your API key, and usage events that record which key called which agent. We do not store the prompt text. We do not store seed phrases. Free-check limits use a hash of the IP address, not the raw address.</p>
      <h2 className="font-display text-2xl text-foam">Why</h2>
      <p>We process this data to perform the contract (sell access, verify USDC, deliver a key), and for security (rate limits, replay prevention, fraud). Country and network headers are used to hide execution-style agents in the EU, and in the UK if that flag is on. The session cookie is strictly necessary.</p>
      <h2 className="font-display text-2xl text-foam">How long</h2>
      <p>Orders and payment records are kept so a payment cannot be replayed and so we can answer a dispute. You can ask us to delete a profile. We may keep a minimal payment record where the law requires it.</p>
      <h2 className="font-display text-2xl text-foam">Sharing</h2>
      <p>The wallet signature is checked by our server. Optional email goes through Resend if that key is set. Optional error reports go to Sentry if a DSN is set. Rate limits can use Upstash. The database is Supabase, or a local file in development. We do not sell personal data.</p>
      <h2 className="font-display text-2xl text-foam">Your rights</h2>
      <p>You can ask for access, correction, erasure, restriction, and a copy of your data, and you can complain to the ICO. Email {email}. We may need a signed message from the wallet to be sure the request is yours.</p>
      <h2 className="font-display text-2xl text-foam">Transfers</h2>
      <p>Supabase, Resend, Sentry, and Upstash may process data outside the UK. Put the right contract terms in place before production.</p>
    </article>
  );
}
