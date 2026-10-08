// Sync key-value storage shared by identity keys, sealed-circle keys, and
// small UI flags. Web builds resolve this file (localStorage); native
// builds resolve ./storage.native.ts (SQLite via expo-sqlite/kv-store) so
// domain code stays platform-free and synchronous.
export interface KvStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
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

// non-DOM realms (tests, node agents) fall back to memory — same behavior
// the call sites already relied on via try/catch around localStorage.
export const storage: KvStorage =
  typeof localStorage === "undefined" ? memoryStorage() : localStorage;
