import { customEndpointReady, loadAiSettings, resolveTransport } from "@klk/ai";
import type { AiTransport } from "@klk/ai";
import type { Keypair } from "@klk/proto";
import { API_ORIGIN } from "./config.ts";

// One helper for every assistant surface: which transport serves this
// circle right now, and whether the sealed-circle notice should render
// instead (spec §4 — sealed only ever uses the member's own endpoint).
export interface AssistState {
  transport: AiTransport | null;
  sealedNotice: boolean;
}

export function assistState(
  identity: Keypair | null,
  coord: string,
  tier: "hosted" | "sealed",
): AssistState {
  const settings = loadAiSettings();
  const transport = resolveTransport({ identity, apiOrigin: API_ORIGIN, circleCoord: coord, tier });
  const customReady = settings.mode === "custom" && customEndpointReady(settings);
  return {
    transport,
    sealedNotice: tier === "sealed" && !customReady,
  };
}
