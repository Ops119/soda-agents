import "server-only";
import { createFileStore } from "./file";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

const globalStore = globalThis as unknown as { __sodaStore?: Store };

export function getStore(): Store {
  if (globalStore.__sodaStore) return globalStore.__sodaStore;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if ((url && !key) || (!url && key)) {
    throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither for local dev.");
  }
  if (url && key) {
    globalStore.__sodaStore = createSupabaseStore(url, key);
    return globalStore.__sodaStore;
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORE !== "true") {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production.");
  }
  globalStore.__sodaStore = createFileStore();
  return globalStore.__sodaStore;
}

export type { Store } from "./types";
