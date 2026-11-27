import type { Keypair } from "@klk/proto";
import type { AiTransport, ChatMessage } from "./transport.ts";
import { ManagedTransport, OpenAICompatTransport } from "./transport.ts";
import { customEndpointReady, loadAiSettings } from "./settings.ts";
import type { EventDraft, RecapEventInput, SuggestionDraft } from "./prompts.ts";
import {
  eventDraftMessages,
  parseEventDraft,
  parseSuggestionDraft,
  recapMessages,
  suggestionDraftMessages,
} from "./prompts.ts";

// Feature-level wiring (spec §2): transport resolution + one function
// per assistant feature. The UI passes in what the realm already knows —
// nothing here reads events off the wire.

export interface AssistantContext {
  identity: Keypair | null;
  apiOrigin: string;
  circleCoord: string;
  tier: "hosted" | "sealed";
}

// Which transport, if any, may serve this circle right now (spec §4):
// managed is the default on hosted for real members; custom is the
// override everywhere and the only path on sealed. Guests (null
// identity) never get the managed path — their keypair is disposable.
export function resolveTransport(ctx: AssistantContext): AiTransport | null {
  const settings = loadAiSettings();
  if (settings.mode === "custom" && customEndpointReady(settings)) {
    return new OpenAICompatTransport(settings.baseUrl, settings.apiKey, settings.model);
  }
  if (ctx.tier === "sealed") return null; // managed can never serve sealed
  if (ctx.identity === null) return null; // guests: custom only
  return new ManagedTransport(ctx.apiOrigin, ctx.identity, ctx.circleCoord);
}

async function chat(transport: AiTransport, messages: ChatMessage[]): Promise<string> {
  const result = await transport.chat(messages);
  return result.content;
}

export async function draftEvent(transport: AiTransport, text: string): Promise<EventDraft | null> {
  return parseEventDraft(await chat(transport, eventDraftMessages(text)));
}

export async function draftSuggestion(
  transport: AiTransport,
  text: string,
  event: { title: string; starts: number; ends?: number; location?: string; summary?: string },
): Promise<SuggestionDraft | null> {
  return parseSuggestionDraft(await chat(transport, suggestionDraftMessages(text, event)));
}

export async function recapCircle(
  transport: AiTransport,
  circleName: string,
  events: RecapEventInput[],
): Promise<string> {
  return chat(transport, recapMessages(circleName, events));
}
