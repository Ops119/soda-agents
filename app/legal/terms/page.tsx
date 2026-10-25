import { contactEmail, legalEntity } from "@/lib/legal";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  const entity = legalEntity();
  const email = contactEmail();
  return (
    <article className="mx-auto grid max-w-2xl gap-4 text-sm leading-relaxed text-muted">
      <h1 className="font-display text-4xl text-foam">Terms</h1>
      <p>These terms cover use of Soda.agents, operated by {entity}. By connecting a wallet or paying for a licence you agree to them. Replace this page after a lawyer reads it. Contact {email}.</p>
      <h2 className="font-display text-2xl text-foam">What you are buying</h2>
      <p>A pass is prepaid access to one or more hosted agents for 30 days. A bundle or all-access pass covers hosted passes only. One-off kits are files you download. Pay-per-call billing is not sold. Nothing renews by itself. When a pass ends, call the gateway again only after a new checkout.</p>
      <h2 className="font-display text-2xl text-foam">Wallets and keys</h2>
      <p>Your Solana address is your account. Soda never asks for a seed phrase or a private key. Agents that prepare trades only build a transaction. You sign it in your own wallet. If an agent asked you to paste a seed phrase, stop and treat it as hostile.</p>
      <h2 className="font-display text-2xl text-foam">Not advice</h2>
      <p>Agents can be wrong. Output is software, not financial, trading, legal, or tax advice. Crypto assets are high risk and you may lose everything. You decide whether to act.</p>
      <h2 className="font-display text-2xl text-foam">Acceptable use</h2>
      <p>Do not use the service to break the law, to probe other people&apos;s keys, or to overwhelm the gateway. We can revoke a licence that is used that way. Devnet is the only network this build will pay on.</p>
      <h2 className="font-display text-2xl text-foam">Liability</h2>
      <p>The service is provided as available. To the extent the law allows, {entity} is not liable for lost tokens, missed trades, bad agent output, or downtime. Nothing here limits liability that the law says cannot be limited.</p>
      <h2 className="font-display text-2xl text-foam">Law</h2>
      <p>These terms are intended to be read under the laws of England and Wales. Have them reviewed before you take mainnet payments.</p>
    </article>
  );
}
