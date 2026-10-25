import fs from "fs";
import path from "path";
import { withLock } from "../lock";
import { createMemoryStore, emptyDatabase } from "./memory";
import type { Database, Store } from "./types";

function dataFile(): string {
  const dir = process.env.SODA_DATA_DIR ?? path.join(process.cwd(), ".data");
  return path.join(dir, "store.json");
}

function load(): Database {
  const file = dataFile();
  if (!fs.existsSync(file)) return emptyDatabase();
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Database;
  return {
    profiles: parsed.profiles ?? [],
    agents: parsed.agents ?? [],
    listings: parsed.listings ?? [],
    orders: parsed.orders ?? [],
    payments: parsed.payments ?? [],
    licences: parsed.licences ?? [],
    apiKeys: parsed.apiKeys ?? [],
    usage: parsed.usage ?? [],
    nonces: parsed.nonces ?? [],
    freeChecks: parsed.freeChecks ?? [],
  };
}

export function createFileStore(): Store {
  const db = load();
  const file = dataFile();
  const memory = createMemoryStore(db, () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, file);
  });
  return new Proxy(memory, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => withLock("file-store", () => value.apply(target, args));
    },
  }) as Store;
}
