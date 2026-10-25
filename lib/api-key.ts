import { createHash, randomBytes, timingSafeEqual } from "crypto";

const PREFIX = "sk_soda_";

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString("base64url");
  const plaintext = `${PREFIX}${raw}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: `${PREFIX}${raw.slice(0, 6)}`,
  };
}

export function keyLooksValid(token: string): boolean {
  return token.startsWith(PREFIX) && token.length >= PREFIX.length + 32 && token.length <= 120;
}

export function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
