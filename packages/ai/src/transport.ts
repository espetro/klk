import { signHttpAuth } from "@klk/proto";
import type { Keypair } from "@klk/proto";

// Assistant transports (spec §3.3). The assistant is not an actor: it
// calls an LLM over plain HTTP and its output lands in a compose draft —
// it never authors an event. Two runtimes, one interface:
//   ManagedTransport     — relay-mediated, hosted circles only, NIP-98
//   OpenAICompatTransport — client-direct BYOK, the only path on sealed

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
}

export interface AiTransport {
  chat(messages: ChatMessage[], opts?: { signal?: AbortSignal }): Promise<ChatResult>;
}

export class AiError extends Error {
  status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

async function readError(resp: Response): Promise<never> {
  let msg = `AI request failed (${resp.status})`;
  try {
    const data = (await resp.json()) as { error?: { message?: string } };
    if (typeof data.error?.message === "string") msg = data.error.message;
  } catch {
    // upstream said nothing parseable — keep the status-line message
  }
  throw new AiError(msg, resp.status);
}

function firstChoiceContent(data: unknown): string {
  const choices = (data as { choices?: { message?: { content?: unknown } }[] }).choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new AiError("the model returned an empty reply");
  }
  return content;
}

// Managed: POST {apiOrigin}/api/ai/chat, NIP-98 signed with the member's
// identity, circle-scoped so the relay can enforce tier + membership.
export class ManagedTransport implements AiTransport {
  constructor(
    private apiOrigin: string,
    private identity: Keypair,
    private circleCoord: string,
  ) {}

  async chat(messages: ChatMessage[], opts?: { signal?: AbortSignal }): Promise<ChatResult> {
    const url = `${this.apiOrigin}/api/ai/chat`;
    const body = JSON.stringify({
      circle: this.circleCoord,
      messages,
      max_tokens: 1024,
    });
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: signHttpAuth(url, body, this.identity.secretKey),
      },
      body,
      signal: opts?.signal ?? null,
    });
    if (!resp.ok) return readError(resp);
    return { content: firstChoiceContent(await resp.json()) };
  }
}

// Custom BYOK: direct browser→endpoint call, plaintext never touches our
// infra. Some providers block browser CORS — documented limitation, not
// something we proxy around (spec §3.2).
export class OpenAICompatTransport implements AiTransport {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private model: string,
  ) {}

  async chat(messages: ChatMessage[], opts?: { signal?: AbortSignal }): Promise<ChatResult> {
    const resp = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey !== "" ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: this.model, messages, max_tokens: 1024 }),
      signal: opts?.signal ?? null,
    });
    if (!resp.ok) return readError(resp);
    return { content: firstChoiceContent(await resp.json()) };
  }
}

/** Probe an OpenAI-compatible endpoint's /models — settings validation. */
export async function probeModels(
  baseUrl: string,
  apiKey: string,
  opts?: { signal?: AbortSignal },
): Promise<string[]> {
  const resp = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
    headers: apiKey !== "" ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: opts?.signal ?? null,
  });
  if (!resp.ok) return readError(resp);
  const data = (await resp.json()) as { data?: { id?: unknown }[] };
  return (data.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string")
    .toSorted();
}
