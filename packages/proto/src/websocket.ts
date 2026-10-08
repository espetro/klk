import { useWebSocketImplementation } from "nostr-tools/pool";

// Node 18-21 lacks a global WebSocket; nostr-tools wants the impl set.
// The dynamic import keeps `ws` out of browser bundles — native runtimes
// (which have a global WebSocket) use websocket.native.ts instead, so
// the `ws` package never enters the Metro graph.
export async function ensureWebSocket(): Promise<void> {
  if (typeof WebSocket === "undefined") {
    const { WebSocket: WSImpl } = await import("ws");
    useWebSocketImplementation(WSImpl as unknown as typeof WebSocket);
  }
}
