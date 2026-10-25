import { createHmac, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";
import { sessionSecret } from "./session";
import { zipFiles } from "./zip";

const DAY = 24 * 60 * 60;

export function signDownload(licenceId: string, exp: number): string {
  return createHmac("sha256", sessionSecret()).update(`download.${licenceId}.${exp}`).digest("base64url");
}

export function verifyDownload(licenceId: string, exp: number, signature: string): boolean {
  if (!Number.isFinite(exp)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (exp < now || exp > now + DAY + 120) return false;
  const expected = signDownload(licenceId, exp);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function readKit(slug: string): Buffer {
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) throw new Error("Bad kit.");
  const root = path.join(process.cwd(), "content", "kits", slug);
  if (!fs.existsSync(root)) throw new Error("Kit missing.");
  const files: { name: string; data: Buffer }[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.isFile()) files.push({ name: rel, data: fs.readFileSync(full) });
    }
  };
  walk(root, "");
  if (files.length === 0) throw new Error("Kit empty.");
  return zipFiles(files);
}
