import type { NDKCacheAdapter, NDKEvent, NDKFilter, NDKRelay } from '@nostr-dev-kit/ndk';
import type { SQLiteDatabase } from 'expo-sqlite';

export class KlkSQLiteCacheAdapter implements NDKCacheAdapter {
  locking = true;
  private dbName: string;
  private db: SQLiteDatabase | null = null;
  private memoryCache: Map<string, NDKEvent> = new Map();

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  initialize(ndk: unknown): void {
    // No-op: DB is opened on-demand in query/setEvent
  }

  async initializeAsync(ndk?: unknown): Promise<void> {
    if (!this.db) {
      try {
        const { openDatabaseSync } = await import('expo-sqlite');
        this.db = openDatabaseSync(this.dbName);
        await this.setupSchema();
      } catch {
        this.db = null;
      }
    }
  }

  private async setupSchema(): Promise<void> {
    if (!this.db) return;
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS nostr_events (
        id TEXT PRIMARY KEY,
        kind INTEGER,
        pubkey TEXT,
        content TEXT,
        tags TEXT,
        created_at INTEGER
      )
    `);
  }

  async query(subscription: unknown): Promise<NDKEvent[]> {
    const events = Array.from(this.memoryCache.values());
    return events;
  }

  async setEvent(event: NDKEvent, filters: NDKFilter<any>[], relay?: NDKRelay): Promise<void> {
    this.memoryCache.set(event.id || '', event);

    if (!this.db) return;

    try {
      const tagsJson = JSON.stringify(event.tags || []);
      await this.db.runAsync(
        `INSERT OR REPLACE INTO nostr_events (id, kind, pubkey, content, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          event.id || '',
          event.kind,
          event.pubkey,
          event.content || '',
          tagsJson,
          event.created_at || Math.floor(Date.now() / 1000),
        ]
      );
    } catch (e) {
      console.error('Error storing event:', e);
    }
  }

  async deleteEventIds(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.memoryCache.delete(id);
    }

    if (!this.db) return;

    try {
      const placeholders = ids.map(() => '?').join(',');
      await this.db.runAsync(`DELETE FROM nostr_events WHERE id IN (${placeholders})`, ids);
    } catch (e) {
      console.error('Error deleting events:', e);
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (!this.db) return;

    try {
      await this.db.runAsync('DELETE FROM nostr_events');
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
  }
}
