# Klk — AI Integration Spec

**Status:** Draft v1.0 (2026-10-08)
**Extends:** `docs/spec/2026-10-07-v0-design.md` (spec of record). Where this
document and the v0 spec disagree on agent-surface details, this document
amends; everything else defers to v0.

---

## 1. Two surfaces, one rule

Klk ships AI on two surfaces that are **different things** and must never
blur together:

- **The assistant** — in-app product features. It calls an LLM transport
  over plain HTTP, has no Nostr identity, signs nothing, and its output
  lands in the user's own compose box as a draft. The user reviews and
  posts; the assistant never authors an event.
- **Agents** — the kind-34134 delegated user-kind from v0 §5: external
  identities (a member's own Claude, a future MCP client, a hosted runtime)
  admitted by a member-signed scope and constrained by relay-enforced caps.

The assistant is a feature of our own app; an agent is a user we host. An
agent never gets broader rights than its delegator — and the assistant has
no rights at all, because it is not an actor. Keeping this line sharp is
what lets the moat rule (no bulk-read surface, scoped capabilities only)
survive the AI tier.

## 2. Assistant v1 — what ships

A tight set; each maps to an existing beat of the circle → event → RSVP
loop and is implementable as "prompt + structured JSON → fill a form the
UI already has".

| Feature                     | What it does                                                                                                                                                                                                                                  | Tier gate                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Event-draft assist**      | Free text ("climbing saturday morning at the usual crag, bring ropes") → filled `EventForm` fields (title, start/end, location, summary). The loop's core write — biggest time-save.                                                          | hosted (managed) or custom |
| **Suggestion-draft assist** | On a `suggestable` event, prose → proposed fields + note, staged into the existing kind-31926 compose flow. Same fields as `SuggestionField` in `packages/proto/src/kinds.ts`.                                                                | hosted or custom           |
| **Circle recap**            | "What's on this week" card per circle: events + open suggestions + RSVP counts → short summary. Context is assembled client-side from the realm (`$events`/`$rsvps`/`$suggestions` are already in memory) — no new read path, no bulk export. | hosted or custom           |

Explicitly **not** in v1: chat-with-your-circle (needs a message kind we
don't have), assistant-authored events (violates §1), onboarding AI
explainer (static copy does the job).

## 3. Transport: managed by default, BYOK as the override

Decision: **hybrid, with a sharp default.** The managed path is what every
user gets for free — no keys, no setup. The custom path is a per-device
override for power users, and the _only_ path on sealed circles.

### 3.1 Managed path — relay-mediated gateway

```
PWA ──POST /api/ai/chat (NIP-98 auth)──▶ apps/relay ──CLIENT_KEYS s2s──▶ api.illo.fyi ──▶ Cloudflare AI Gateway ──▶ lanes
```

- `api.illo.fyi` is Quim's existing OpenAI-compatible ingress
  (`espetro/just-ai-illo`): a ~150-LOC Cloudflare Worker in front of
  Cloudflare AI Gateway. Client-facing paths are
  `/v1/chat/completions` + `/v1/models`; the worker rewrites `model` to its
  configured `dynamic/<route>`, so model selection is a server-side
  decision and clients just post chat. Klk gets a `klk` entry in the
  `CLIENT_KEYS` secret map (`wrangler secret put`, no redeploy) and a
  dedicated AIG dynamic route for lane/fallback config.
- **Auth is Nostr-native:** the client signs a NIP-98 HTTP-auth event
  (kind 27235, `u` tag = endpoint URL, `payload` tag = request-body hash)
  and sends `Authorization: Nostr <base64>`. No second credential system —
  the same identity that answers NIP-42 signs AI requests.
- **The relay is the policy point**, and it is one BoltDB lookup away from
  everything it needs: verify the signature → load the `circle` coord in
  the request body → require member + `tier == "hosted"` → check
  rate/token budget (§6) → proxy upstream with the server-held client
  key. An authed stranger can't turn our relay into an open LLM proxy.
- Responses (SSE streams included) pass straight through, same as the
  worker does for the gateway. Go `io.Copy` — one goroutine per request,
  no buffering service.
- The gateway's visitor fingerprint (`cf-aig-metadata`) gets
  `{client: "klk", u: <pubkey hash>}` so per-user cost attribution lands
  in AIG analytics without plaintext identity leaving our boundary.

**Why the relay mediates instead of the PWA calling `api.illo.fyi`
directly:** direct would need Turnstile in the app (a third-party script,
off-brand for a privacy product), would rate-limit per IP rather than per
member, would pin the PWA to `*.illo.fyi` hosting (the origin allowlist
only admits `*.illo.fyi` and keyed localhost), and would put
request-shaping policy in the client where it can't be enforced. The
relay proxy costs ~80 LOC and buys per-member metering, circle-aware
authorization, and domain independence — the PWA works on any host, which
is required for self-hosted relays anyway.

Rejected:

- **BYOK-only** — a key-entry wall is the anti-thesis of "baked in"; the
  whole point is AI that works out of the box for non-technical members.
- **Client-direct to `api.illo.fyi`** — above; keeps as a documented
  fallback only if the relay path ever proves too heavy (it won't at v0
  scale).
- **Relay-side context assembly** (relay reads events and builds prompts)
  — deferred; §2's features work fine on client-assembled context, and
  server-side prompt assembly is the paid hosted-agent runtime's job.

### 3.2 Custom path — client-direct BYOK

A settings surface modeled on calca's proven shape: `{ baseUrl, apiKey,
model }` for any OpenAI-compatible endpoint, stored in `localStorage`
under `klk.ai` — device-scoped, exactly like sealed circle keys and the
identity wrap key. "Probe `/models`" validates on save (calca's
`use-probe-models` pattern). A `mode: "managed" | "custom"` flag picks
which transport the assistant uses; `managed` is the default.

When `custom` is configured, the client calls the endpoint **directly**
with `fetch` — plaintext never touches our infra. That is the only
honorable transport for sealed circles (§4).

Known limitation, documented not engineered around: some remote providers
block browser CORS. Local endpoints (LM Studio, ollama) and permissive
providers (OpenRouter) work; a user whose endpoint refuses browser calls
is told to pick a different endpoint or use the managed path.

### 3.3 Client shape

New **`packages/ai`** — `packages/core` is pure domain logic with no IO
(v0 §3), and AI transport is IO:

```ts
interface AiTransport {
  chat(messages: ChatMessage[], opts: { signal?: AbortSignal }): Promise<ChatResult>;
  // stream variant yields tokens; v1 UI may render incrementally or await
}
```

- `ManagedTransport` — builds the request, signs the NIP-98 event with the
  current identity, `POST {relayUrl}/api/ai/chat`.
- `OpenAICompatTransport` — `fetch {baseUrl}/chat/completions` with the
  configured key. Plain fetch, not the AI SDK: the surface is two
  endpoints and a stream, and a vendored SDK buys nothing here (the
  gateway already normalizes providers behind OpenAI-compat).
- Prompt builders + response parsers per feature (`eventDraft`,
  `suggestionDraft`, `recap`) — JSON-mode output with a zod-less
  hand-rolled guard (repo has no zod dep; validate field-by-field like
  `toSuggestion` does).

Guests (null identity, ephemeral keypair) get `custom` only: a per-pubkey
managed budget is meaningless against disposable keys, and anonymous
drain of the token budget is exactly what the budget exists to stop.

## 4. Tier rules — where AI calls may run

| Circle tier | Managed (relay → gateway) | Custom (client-direct) |
| ----------- | ------------------------- | ---------------------- |
| `hosted`    | default                   | opt-in override        |
| `sealed`    | **never**                 | the only path          |

The sealed rule is architectural, not a flag: sealed's promise is that the
operator cannot produce plaintext. A relay-mediated AI call sends
plaintext to the operator — it cannot exist on that tier without lying to
the user. On sealed circles the assistant UI renders only when a custom
endpoint is configured, with copy that says so ("AI on sealed circles uses
your own endpoint — nothing leaves your device").

`cap`-style enforcement: the relay checks `tier == "hosted"` on every
managed request against the stored circle def — not client-supplied — so
the tier gate can't be bypassed by request shape.

## 5. The 34134 surface — coexistence and gap closure

The assistant does not touch the agent surface at all: no scopes, no
delegation tags, no caps. Kind-34134 stays as the power-user/MCP lane —
external agents a member explicitly admits. What changes is hardening,
from the agent-surface audit (verified: our model already matches or
beats shipping practice — Slack granular bot scopes, Google granular
consent, AP2 Intent Mandate, NIP-26 conditions).

**Close in code now** — cheap, security- or trust-relevant:

- **Agent self-label + badge.** Convention: agent kind-0 carries
  `{"bot": true}`; the client renders an `agent · via @<delegator>` badge
  everywhere a delegated author appears. Any event carrying a `delegation`
  tag gets a "via agent" chip regardless of profile — the tag is
  ground truth, the profile field is presentation.
- **Per-cap rate-limit buckets.** `policy/ratelimit.go` keys on agent
  pubkey alone; rekey to `(agent, cap)` so a chatty reader can't starve an
  event helper, and read quota (a heavier, separate bucket) doesn't share
  the 60/hr delegated-write window.
- **Replace-not-merge re-grant copy.** The wire already replaces by
  (delegator, `d`) — the grant UI must say "re-granting replaces the
  previous scope" and always preset the bundle checkboxes, never present
  it as additive.
- **Preset cap bundles.** "Event helper" = `postEvent` + `setRsvp`;
  "Read companion" = `read`. Underlying caps stay enumerated in the UI —
  bundles are UX sugar over the same `cap` tags, not new semantics.
- **Read+post caution on hosted.** Granting `read` + a write cap on a
  hosted circle is the lethal trifecta (private data + untrusted content
  - a post channel): the grant screen shows a plain-language caution when
    both classes are selected. Copy, not a block — some agents legitimately
    need both.
- **One-click revoke.** Republish the same `d` with an `expiration` in
  the past; relay treats the superseded scope as dead (addressable replace
  already lands this). The UI change is a "revoke" button per scope —
  wire behavior already correct.

**Defer:**

- Member-facing agent activity view (a circle-level "what did agents do"
  list — needs a UI surface we don't have yet; the audit trail is the
  signed events, so the data is already there when we build it).
- Mute-agent-without-revoke (client-side filter list in `localStorage` —
  cheap but pure UX polish, no safety content).
- Hosted agent runtime — the paid tier from v0 §5: same tool schema run
  inside our boundary. Blocked on billing existing at all.
- `act_as_user` for the assistant — permanently rejected: the assistant
  drafts, the user posts (§1).

## 6. Cost & rate limits on a <1GB VPS

LLM spend happens off-box (gateway + providers); what the relay must do is
throttle and account. All counters live in BoltDB — no new services.

- **Per-member managed budget:** 20 requests/hour and 50k tokens/day per
  authed pubkey, sliding window (same in-memory `RateLimiter` shape as
  delegated writes; token counter persisted daily in BoltDB). Tokens from
  the response `usage` field on non-streamed calls; `chars/4` estimate on
  streams.
- **Request clamps** (relay-side, before upstream): `max_tokens` ≤ 1024,
  serialized `messages` ≤ 8 KB, 30s upstream timeout, one in-flight
  managed request per pubkey.
- **Gateway side:** the `klk` dynamic route points at cheap lanes via the
  `config:models` KV map (groq/zai/deepseek-class — same posture as dits'
  demo path, never the paid key); AIG response caching on for identical
  prompts; per-`klk`-key edge rate limit (60/60s) stays as a second wall
  under relay limits.
- **Kill switches:** `AI_ENABLED=false` env on the relay returns 503 on
  `/api/ai/*`; deleting the `klk` entry from `CLIENT_KEYS` kills the path
  at the edge with no relay redeploy.
- Assistant calls carry the member's pubkey only to our own relay and a
  `u` hash upstream — the model provider sees prompts and a fingerprint,
  never a Nostr identity.

## 7. Deferred (explicit)

- Assistant chat UI / free-form circle Q&A (needs a thread surface;
  re-evaluate after dogfood).
- Onboarding AI explainer — static copy suffices at v0 scale.
- Assistant memory/personalization, multi-modal input (photos → event
  details), proactive/push AI.
- Tool-calling assistant — including `act_as_user` for the assistant —
  permanently rejected (§1); drafts only.
- Managed AI for guests — requires a real identity by design (§3.3).
- Server-assembled prompt context — arrives with the hosted agent runtime
  (paid tier).
- Federated/multi-relay managed AI — single-relay v0 only; a foreign
  relay may implement whatever it wants for its own hosted circles.
- Browser-only BYOK for endpoints that block CORS — documented
  limitation, not a proxy feature.
