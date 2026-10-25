import { NextResponse } from "next/server";
import { captureServerError } from "./sentry";
import { sameOrigin } from "./siws";

export async function run(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    console.error(error);
    await captureServerError(error);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function clientIp(request: Request): string {
  const platform =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip = platform?.trim() || "local";
  return ip.slice(0, 64);
}

export function originOk(request: Request): boolean {
  return sameOrigin(request.headers.get("origin"));
}

export function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}
