/* eslint-disable max-classes-per-file */

/**
 * Mock for @nostr-dev-kit/ndk-mobile
 * Provides TypeScript-compatible interfaces without native dependencies.
 */

export class NDKCacheAdapterSqlite {
  constructor(_name?: string) {}
  initialize(): void {}
}

export interface NDKSigner {
  encrypt(user: NDKUser, plaintext: string, scheme?: string): Promise<string>;
  decrypt(user: NDKUser, ciphertext: string, scheme?: string): Promise<string>;
}

export interface NDKUser {
  pubkey: string;
  npub?: string;
}

export class NDKPrivateKeySigner implements NDKSigner {
  private readonly key: string | undefined;

  static generate(): NDKPrivateKeySigner {
    const mockHex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return new NDKPrivateKeySigner(mockHex);
  }

  constructor(privateKey?: string) {
    this.key = privateKey;
  }

  get privateKey(): string | undefined {
    return this.key;
  }

  encrypt(_user: NDKUser, plaintext: string, _scheme?: string): Promise<string> {
    return Promise.resolve(plaintext);
  }

  decrypt(_user: NDKUser, ciphertext: string, _scheme?: string): Promise<string> {
    return Promise.resolve(ciphertext);
  }

  user(): Promise<NDKUser> {
    return Promise.resolve({ pubkey: this.key ? generatePubkey(this.key) : 'mock-pubkey' });
  }
}

function generatePubkey(_privateKey: string): string {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export interface NDKEvent {
  id: string | undefined;
  pubkey: string;
  kind: number;
  content: string;
  tags: string[][];
  created_at: number | undefined;
}

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
export class NDKEvent {
  /* eslint-enable @typescript-eslint/no-unsafe-declaration-merging */
  id: string | undefined = undefined;
  pubkey: string = '';
  kind: number = 0;
  content: string = '';
  tags: string[][] = [];
  created_at: number | undefined = undefined;

  constructor(_ndk: unknown, event?: Partial<NDKEvent>) {
    if (event) {
      this.id = event.id;
      this.pubkey = (event.pubkey ?? '') as string;
      this.kind = event.kind ?? 0;
      this.content = (event.content ?? '') as string;
      this.tags = event.tags ?? [];
      this.created_at = event.created_at;
    }
  }

  tagId(): string {
    return this.id ?? '';
  }

  publish(): Promise<void> {
    return Promise.resolve();
  }
}

export interface NDKSubscription {
  on(event: 'event' | 'eose', cb: (event: NDKEvent) => void): void;
  stop(): void;
}

export default class NDK {
  signer: NDKSigner | null = null;

  constructor(_opts?: { explicitRelayUrls?: string[]; cacheAdapter?: NDKCacheAdapterSqlite }) {}

  connect(): Promise<void> {
    return Promise.resolve();
  }

  subscribe(_filter: unknown, _opts?: unknown): NDKSubscription {
    const handlers: { event: ((event: NDKEvent) => void)[]; eose: ((event: NDKEvent) => void)[] } =
      {
        event: [],
        eose: [],
      };

    return {
      on(event: 'event' | 'eose', cb: (event: NDKEvent) => void): void {
        handlers[event].push(cb);
      },
      stop(): void {
        handlers.event = [];
        handlers.eose = [];
      },
    };
  }

  getUser(opts: { pubkey: string }): Promise<NDKUser> {
    return Promise.resolve({ pubkey: opts.pubkey });
  }

  fetchEvent(id: string): Promise<NDKEvent> {
    const event = new NDKEvent(this);
    event.id = id;
    return Promise.resolve(event);
  }
}
