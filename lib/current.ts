import "server-only";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "./session";
import { getStore } from "./store";
import type { Profile } from "./store/types";
import type { SessionPayload } from "./session";

export async function currentProfile(): Promise<{ session: SessionPayload; profile: Profile } | null> {
  const jar = await cookies();
  const session = readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const profile = await getStore().getProfile(session.profileId);
  if (!profile || profile.walletAddress !== session.wallet) return null;
  return { session, profile };
}
