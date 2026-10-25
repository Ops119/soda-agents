import { currentProfile } from "@/lib/current";
import { json, run } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return run(async () => {
    const current = await currentProfile();
    if (!current) return json({ session: null });
    return json({
      session: {
        profileId: current.profile.id,
        wallet: current.profile.walletAddress,
        email: current.profile.email,
        country: current.profile.country,
      },
    });
  });
}
