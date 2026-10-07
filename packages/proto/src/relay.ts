import { Relay, finalizeEvent } from "nostr-tools";
import { useWebSocketImplementation } from "nostr-tools/pool";
import type { Event, EventTemplate, Filter } from "nostr-tools";

export type { Event, EventTemplate, Filter } from "nostr-tools";

export interface KlkHandlers {
  onevent: (evt: Event) => void;
  oneose?: () => void;
  onclose?: (reason: string) => void;
}

export interface PublishResult {
  ok: boolean;
  reason: string;
}

/**
 * Thin client over nostr-tools Relay for our auth-required app relay.
 * NIP-42: the relay sends AUTH on connect; we answer by signing with
 * the local keypair (`onauth` is invoked lazily by the library).
 */
export class KlkRelay {
  private constructor(
    public readonly relay: Relay,
    private readonly secretKey: Uint8Array,
  ) {}

  static async connect(url: string, secretKey: Uint8Array): Promise<KlkRelay> {
    // Node 18-21 lacks a global WebSocket; nostr-tools wants the impl set
    if (typeof WebSocket === "undefined") {
      const { WebSocket: WSImpl } = await import("ws");
      useWebSocketImplementation(WSImpl as unknown as typeof WebSocket);
    }
    const relay = new Relay(url, {
      enablePing: true,
      enableReconnect: true,
      idleTimeout: 0,
    });
    const signer = async (tpl: EventTemplate) => finalizeEvent(tpl, secretKey);
    // NIP-42: the challenge arrives async after ws open. Our relay requires
    // auth for reads, so don't return until the handshake has settled.
    let sawChallenge: (() => void) | undefined;
    const challenged = new Promise<void>((res) => {
      sawChallenge = res;
    });
    relay.onauth = async (tpl: EventTemplate) => {
      sawChallenge?.();
      return signer(tpl);
    };
    await relay.connect();
    await Promise.race([challenged, new Promise((r) => setTimeout(r, 3000))]);
    try {
      // resolves on the relay's OK for the AUTH event (shared authPromise
      // with the lib's own auto-auth, so this never double-signs)
      await relay.auth(signer);
    } catch {
      // relay never challenged, or doesn't require auth — proceed
    }
    return new KlkRelay(relay, secretKey);
  }

  async publish(tpl: EventTemplate): Promise<PublishResult> {
    const ev = finalizeEvent(tpl, this.secretKey);
    try {
      const reason = await this.relay.publish(ev);
      return { ok: true, reason };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }

  /** One-shot fetch: collect until EOSE (or timeout), then close. */
  query(filters: Filter[], timeoutMs = 5000): Promise<Event[]> {
    return new Promise((resolve) => {
      const out: Event[] = [];
      let finished = false;
      const timer = setTimeout(done, timeoutMs);
      const sub = this.relay.subscribe(filters, {
        onevent: (ev) => out.push(ev),
        oneose: done,
        onclose: () => done(),
      });
      function done() {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        sub.close();
        resolve(out);
      }
    });
  }

  /** Live subscription. The returned handle is both callable and
   * `Disposable`, so `using sub = relay.subscribe(...)` cleans up on
   * scope exit — the pattern harness/tests should prefer. */
  subscribe(filters: Filter[], handlers: KlkHandlers): () => void {
    const sub = this.relay.subscribe(filters, {
      onevent: handlers.onevent,
      oneose: handlers.oneose ?? (() => {}),
      onclose: handlers.onclose ?? (() => {}),
    });
    const stop = () => sub.close();
    stop[Symbol.dispose] = stop;
    return stop;
  }

  close(): void {
    this.relay.close();
  }

  [Symbol.dispose](): void {
    this.close();
  }
}
