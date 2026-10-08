// Native storage: expo-sqlite's kv-store gives synchronous KV persistence
// (SQLite-backed), which the domain layer needs — circle keys decrypt
// inline during event ingest, so an async API won't fit. Falls back to
// memory when the native module isn't linked (e.g. a stale dev binary).
import type { KvStorage } from "./storage.ts";

declare const require: (id: string) => unknown;

interface SqliteKv {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): void;
  getAllKeysSync(): string[];
}

const memoryStorage = (): KvStorage => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
  };
};

const sqlite = (): KvStorage | null => {
  try {
    // conditional native module — falls back when not linked
    const mod = require("expo-sqlite/kv-store") as { default?: SqliteKv } & SqliteKv;
    const kv = mod.default ?? mod;
    if (typeof kv.getItemSync !== "function") return null;
    return {
      getItem: (k) => kv.getItemSync(k),
      setItem: (k, v) => kv.setItemSync(k, v),
      removeItem: (k) => kv.removeItemSync(k),
      clear: () => {
        for (const k of kv.getAllKeysSync()) kv.removeItemSync(k);
      },
    };
  } catch {
    return null;
  }
};

export const storage: KvStorage = sqlite() ?? memoryStorage();
