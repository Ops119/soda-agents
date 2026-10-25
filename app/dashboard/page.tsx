import { headers } from "next/headers";
import { ConnectPrompt } from "@/components/connect-prompt";
import { DashboardClient, type DashboardLicence } from "@/components/dashboard-client";
import { currentProfile } from "@/lib/current";
import { countryFromHeaders, executionBlocked } from "@/lib/geo";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const current = await currentProfile();
  if (!current) {
    return (
      <ConnectPrompt
        title="Your licences"
        body="Connect the wallet you paid with. Soda uses that address as your id."
      />
    );
  }
  const store = getStore();
  const [licences, agents] = await Promise.all([
    store.listLicencesByProfile(current.profile.id),
    store.listAgents(),
  ]);
  const headerCountry = countryFromHeaders(await headers());
  const blocked = executionBlocked(current.profile.country, headerCountry);
  const rows: DashboardLicence[] = await Promise.all(
    licences.map(async (licence) => {
      const agent = agents.find((item) => item.id === licence.agentId);
      const keys = await store.listKeysByLicence(licence.id);
      const activeKey = keys.find((key) => !key.revokedAt);
      const expired = licence.endsAt != null && new Date(licence.endsAt).getTime() <= Date.now();
      return {
        id: licence.id,
        name: agent?.name ?? "Agent",
        slug: agent?.slug ?? "",
        delivery: agent?.delivery ?? "hosted",
        status: licence.status === "active" && expired ? "expired" : licence.status,
        endsAt: licence.endsAt,
        prefix: activeKey?.prefix ?? null,
        hint: agent?.hint ?? "",
        execution: Boolean(agent?.execution),
        blocked: Boolean(agent?.execution) && blocked,
      };
    }),
  );

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <h1 className="font-display text-4xl">Your licences</h1>
      <p className="text-sm text-muted">Renewal is another prepaid checkout. Nothing bills itself.</p>
      <DashboardClient licences={rows} email={current.profile.email} country={current.profile.country} />
    </div>
  );
}
