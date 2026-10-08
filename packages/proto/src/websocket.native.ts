// React Native ships a global WebSocket — nothing to install, and the
// `ws` package (node streams) must stay out of the bundle.
export async function ensureWebSocket(): Promise<void> {}
