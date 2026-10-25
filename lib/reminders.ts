import { sendEmail } from "./email";
import { appOrigin } from "./siws";
import type { Store } from "./store/types";

export async function sendExpiryReminders(store: Store, now = new Date()) {
  const rows = await store.licencesNeedingReminder(now);
  let sent = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.email) {
      skipped += 1;
      continue;
    }
    const when = new Date(row.endsAt ?? now).toUTCString();
    const ok = await sendEmail(
      row.email,
      `Your ${row.agentName} access ends in 3 days`,
      [
        `Your Soda.agents licence for ${row.agentName} ends on ${when}.`,
        "Renewal is a new prepaid USDC checkout. There is no recurring charge.",
        `Open your dashboard: ${appOrigin()}/dashboard`,
        "This note does not include an API key.",
      ].join("\n\n"),
    );
    if (!ok) {
      skipped += 1;
      continue;
    }
    await store.saveLicence({ ...row, reminderSentAt: now.toISOString() });
    sent += 1;
  }
  return { checked: rows.length, sent, skipped };
}
