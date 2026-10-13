// Native storage: One.Storage (One v2's Nitro KV store) gives synchronous KV
// persistence, which the domain layer needs — circle keys decrypt inline
// during event ingest, so an async API won't fit. Falls back to memory when
// the native module isn't linked (e.g. a stale dev binary).
import type { KvStorage } from "./storage.ts";

declare const require: (id: string) => unknown;

interface OneStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  getAllKeys(): string[];
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

const one = (): KvStorage | null => {
  try {
    // conditional native module — falls back when not linked
    const mod = require("one") as { One?: { Storage?: OneStorage } };
    const kv = mod.One?.Storage;
    if (typeof kv?.getItem !== "function") return null;
    // Nitro throws at call time when the module isn't linked — probe once.
    kv.getItem("__probe__");
    return {
      getItem: (k) => kv.getItem(k),
      setItem: (k, v) => kv.setItem(k, v),
      removeItem: (k) => kv.removeItem(k),
      clear: () => {
        for (const k of kv.getAllKeys()) kv.removeItem(k);
      },
    };
  } catch {
    return null;
  }
};

export const storage: KvStorage = one() ?? memoryStorage();
