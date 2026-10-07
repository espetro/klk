import { Relay, finalizeEvent } from "nostr-tools";
import { useWebSocketImplementation } from "nostr-tools/pool";
import type { Event, EventTemplate, Filter } from "nostr-tools";

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
    await relay.connect();
    relay.onauth = async (tpl: EventTemplate) => finalizeEvent(tpl, secretKey);
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

  subscribe(filters: Filter[], handlers: KlkHandlers): () => void {
    const sub = this.relay.subscribe(filters, {
      onevent: handlers.onevent,
      oneose: handlers.oneose ?? (() => {}),
      onclose: handlers.onclose ?? (() => {}),
    });
    return () => sub.close();
  }

  close(): void {
    this.relay.close();
  }
}
