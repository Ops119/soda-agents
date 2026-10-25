let started = false;

export async function captureServerError(error: unknown, context?: Record<string, string>) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const Sentry = await import("@sentry/node");
    if (!started) {
      Sentry.init({ dsn, tracesSampleRate: 0, environment: process.env.NODE_ENV });
      started = true;
    }
    Sentry.captureException(error, context ? { extra: context } : undefined);
    await Sentry.flush(2000);
  } catch {
    // Monitoring must not break checkout or the gateway.
  }
}
