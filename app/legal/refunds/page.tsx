import { contactEmail, legalEntity } from "@/lib/legal";

export const metadata = { title: "Refunds" };

export default function RefundsPage() {
  const entity = legalEntity();
  const email = contactEmail();
  return (
    <article className="mx-auto grid max-w-2xl gap-4 text-sm leading-relaxed text-muted">
      <h1 className="font-display text-4xl text-foam">Refunds</h1>
      <p>{entity} sells digital access. This policy is a starting point for a UK consumer business. Have it reviewed. Contact {email}.</p>
      <h2 className="font-display text-2xl text-foam">If we never deliver</h2>
      <p>If a finalized USDC payment matches an order and we do not issue the licence, email us the order id and the transaction signature. We will either issue the licence or return the USDC to the paying wallet. That return is manual. There is no automatic on-chain refund.</p>
      <h2 className="font-display text-2xl text-foam">After the key is shown</h2>
      <p>A pass or kit is digital content. Once the key is revealed, or the kit link is opened, you ask us to start supply and you acknowledge that the usual 14-day cancellation right for digital content can end at that point, where the Consumer Contracts Regulations allow that. Market losses from using an agent are not refundable.</p>
      <h2 className="font-display text-2xl text-foam">Expired or unmatched payments</h2>
      <p>An order lasts 30 minutes. A payment that finalizes after that window is not turned into a licence. Email us and we will review a return of that USDC. A transfer that uses the wrong mint, the wrong amount, the wrong treasury, or a reference from another order is not a purchase. The same transaction cannot pay two orders.</p>
      <h2 className="font-display text-2xl text-foam">Devnet</h2>
      <p>This build takes devnet USDC only. Devnet tokens have no cash value. Do not send mainnet USDC. A mainnet transfer is not a purchase on this deployment, and we do not want one.</p>
    </article>
  );
}
