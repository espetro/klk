/**
 * klk's event taxonomy — THE contract of record for the Nostr surface.
 *
 * Every kind klk writes or reads is declared here once: its number,
 * NIP-16 storage semantics, `d`-tag requirement, tag schema, content
 * shape, and the delegation capability (if any) that admits agent
 * writes. Two sides mirror this table and must not drift:
 *   - the builders in events.ts (emit-side, via `tagger()`)
 *   - the relay policy in apps/relay/internal/policy (consts there
 *     point back here)
 * Spec: docs/spec/2026-10-07-v0-design.md §4–5.
 */

/** NIP-16 storage class of a kind. */
export type KindLifetime =
  | "regular" // 1-9999 (except 0/3): stored, never auto-replaced — no klk kinds
  | "replaceable" // 0, 3, 10000-19999: latest per (author, kind)
  | "ephemeral" // 20000-29999: never stored — why the scope kind is 34134, not 24134
  | "addressable"; // 30000-39999: latest per (author, kind, `d`); `d` may be empty

/** One declared tag of a kind's wire schema. */
export interface TagSpec {
  /** Tag name — `tags[i][0]` on the wire. */
  name: string;
  /** True when a well-formed event must carry the tag. */
  required: boolean;
  /** True when the tag may repeat (`a`, `cap`, `p`). */
  repeatable?: boolean;
  /** What the tag value carries. */
  meaning: string;
}

/** What `content` carries for a kind. */
export interface ContentSpec {
  /** `empty` = always ""; `json` = serialized object (see `jsonKeys`);
   * `text` = free-form UTF-8. */
  shape: "empty" | "json" | "text";
  /** Documented keys when `shape` is `json`. */
  jsonKeys?: readonly string[];
  /** Sealed-circle marker: content may instead be a shared-key AES-GCM
   * ciphertext blob the relay cannot read (crypto.seal). */
  sealed?: boolean;
}

/** A delegation capability value carried in a scope's `cap` tag. */
export interface CapabilitySpec {
  /** The `cap` tag value. */
  cap: string;
  /** What the grant admits. */
  grants: string;
}

/** A kind's contract entry. */
export interface KindSpec {
  /** Nostr kind number. */
  kind: number;
  /** Contract name as used in the spec and relay comments. */
  name: string;
  /** NIP-16 storage class. */
  lifetime: KindLifetime;
  /** Whether a non-empty `d` tag is required. Addressable kinds without
   * one (RSVP, suggestion, member-claim) address on (author, kind, ""). */
  requiresDTag: boolean;
  /** The tag schema. */
  tags: readonly TagSpec[];
  /** The content shape. */
  content: ContentSpec;
  /** Capability admitting a delegated write of this kind — mirrors the
   * relay's capForKind. Omitted = never delegatable (defs, claims,
   * scopes, suggestions stay user-signed). `read` is absent on purpose:
   * it gates filters, not kinds. */
  delegationCap?: string;
}

/** Per-circle privacy tier — the `tier` tag value and content key on
 * kind 31950. `hosted` = server-readable; `sealed` = E2EE shared-key. */
export type CircleTier = "hosted" | "sealed";

/** `delegation` tag name — marks a write as agent-delegated; the value
 * is the scope coordinate. Declared optional on kinds with a
 * `delegationCap` and meaningless on the rest; a shared constant
 * because `withDelegation` wraps templates of any kind. */
export const TAG_DELEGATION = "delegation";

/** Capability values a kind-34134 scope may grant — the relay's `Cap*`
 * consts mirror these. Unknown `cap` tags are ignored on both sides. */
export const CAPABILITIES = {
  read: {
    cap: "read",
    grants: "filter-level reads of circle-scoped events (any kind)",
  },
  postEvent: {
    cap: "postEvent",
    grants: "writes of kind 31923 calendar events",
  },
  setRsvp: {
    cap: "setRsvp",
    grants: "writes of kind 31925 RSVPs",
  },
} as const satisfies Record<string, CapabilitySpec>;

/** Every kind klk stores or emits, keyed by contract name. */
export const TAXONOMY = {
  profile: {
    kind: 0,
    name: "profile",
    lifetime: "replaceable",
    requiresDTag: false,
    tags: [],
    content: { shape: "json", jsonKeys: ["name", "username", "city"] },
  },
  contacts: {
    kind: 3,
    name: "contacts",
    lifetime: "replaceable",
    requiresDTag: false,
    tags: [
      {
        name: "p",
        required: false,
        repeatable: true,
        meaning: "contact pubkey — the friend graph",
      },
    ],
    content: { shape: "empty" },
  },
  calendarEvent: {
    kind: 31923,
    name: "calendar-event",
    lifetime: "addressable",
    requiresDTag: true,
    tags: [
      {
        name: "d",
        required: true,
        meaning: "stable event id — survives republish (applySuggestion)",
      },
      {
        name: "a",
        required: true,
        repeatable: true,
        meaning: "circle coordinate(s) 31950:<owner>:<slug>",
      },
      { name: "title", required: true, meaning: "display title" },
      { name: "start", required: true, meaning: "start time, unix seconds" },
      { name: "end", required: false, meaning: "end time, unix seconds" },
      { name: "location", required: false, meaning: "place name or address" },
      { name: "g", required: false, meaning: '"lat,lon" for map pins' },
      { name: "image", required: false, meaning: "NIP-52 image URL — pin/card thumbnail" },
      { name: "suggestable", required: false, meaning: '"1" lets members post 31926 suggestions' },
      {
        name: TAG_DELEGATION,
        required: false,
        meaning: "agent scope coordinate — delegated writes",
      },
    ],
    content: { shape: "text", sealed: true }, // summary; sealed blob in sealed circles
    delegationCap: CAPABILITIES.postEvent.cap,
  },
  rsvp: {
    kind: 31925,
    name: "rsvp",
    lifetime: "addressable", // no `d` — latest per (author, kind, "")
    requiresDTag: false,
    tags: [
      {
        name: "e",
        required: true,
        meaning: "target event's `d` — stable across edits, never the hash",
      },
      { name: "a", required: true, repeatable: true, meaning: "circle coordinate(s)" },
      { name: "status", required: true, meaning: '"yes" | "no" | "maybe"' },
      {
        name: TAG_DELEGATION,
        required: false,
        meaning: "agent scope coordinate — delegated writes",
      },
    ],
    content: { shape: "text" }, // optional comment
    delegationCap: CAPABILITIES.setRsvp.cap,
  },
  suggestion: {
    kind: 31926,
    name: "suggestion",
    lifetime: "addressable",
    requiresDTag: false,
    tags: [
      { name: "e", required: true, meaning: "target event's `d`" },
      { name: "a", required: true, repeatable: true, meaning: "circle coordinate(s)" },
      { name: "title", required: false, meaning: "proposed title" },
      { name: "start", required: false, meaning: "proposed start, unix seconds" },
      { name: "end", required: false, meaning: "proposed end, unix seconds" },
      { name: "location", required: false, meaning: "proposed location" },
      { name: "g", required: false, meaning: 'proposed "lat,lon"' },
    ],
    content: { shape: "text", sealed: true }, // the note; sealed blob in sealed circles
    // never delegatable — a member's own judgment is the point
  },
  circle: {
    kind: 31950,
    name: "circle-definition",
    lifetime: "addressable",
    requiresDTag: true,
    tags: [
      { name: "d", required: true, meaning: "slug — stable circle id, last leg of the coordinate" },
      {
        name: "invite",
        required: false,
        meaning: "join secret carried in invite links; omitted = closed circle",
      },
      { name: "tier", required: true, meaning: '"hosted" | "sealed" — privacy tier' },
    ],
    content: { shape: "json", jsonKeys: ["name", "tier"], sealed: true },
  },
  circleMember: {
    kind: 31951,
    name: "member-claim",
    lifetime: "addressable", // no `d` — latest per (author, kind, "")
    requiresDTag: false,
    tags: [
      { name: "a", required: true, repeatable: true, meaning: "claimed circle coordinate(s)" },
      {
        name: "invite",
        required: true,
        meaning: "circle's join secret — proof of invite (owner self-claim exempt)",
      },
    ],
    content: { shape: "empty" },
  },
  agentScope: {
    kind: 34134,
    name: "agent-scope",
    lifetime: "addressable",
    requiresDTag: true,
    tags: [
      {
        name: "d",
        required: true,
        meaning: "scope id — replaces by (delegator, d); re-publish emptied to revoke",
      },
      { name: "p", required: true, meaning: "agent pubkey — author of delegated writes" },
      {
        name: "a",
        required: true,
        repeatable: true,
        meaning: "circle coordinates the scope covers",
      },
      {
        name: "cap",
        required: true,
        repeatable: true,
        meaning: "granted capability — CAP_* values",
      },
      {
        name: "expiration",
        required: false,
        meaning: "unix seconds after which the scope is dead (NIP-40)",
      },
    ],
    content: { shape: "text" }, // free-form comment
  },
} as const satisfies Record<string, KindSpec>;

/** Keys of TAXONOMY — contract names for klk's kinds. */
export type TaxonomyKey = keyof typeof TAXONOMY;

/** Tag names declared in a kind's schema. */
export type TagNames<K extends TaxonomyKey> = (typeof TAXONOMY)[K]["tags"][number]["name"];

/**
 * Bind a tag emitter to a kind's schema: the returned function only
 * accepts tag names the kind declares, so a typo'd tag fails to compile
 * (and throws for untyped callers).
 */
export function tagger<K extends TaxonomyKey>(kind: K) {
  const names = new Set<string>(TAXONOMY[kind].tags.map((t) => t.name));
  return (name: TagNames<K>, value: string): [string, string] => {
    if (!names.has(name)) throw new Error(`undeclared ${kind} tag: ${name}`);
    return [name, value];
  };
}

/** Spec lookup by kind number — undefined for kinds klk doesn't use. */
export function kindSpec(kind: number): KindSpec | undefined {
  return KIND_INDEX.get(kind);
}

const KIND_INDEX: ReadonlyMap<number, KindSpec> = new Map(
  Object.values(TAXONOMY).map((spec) => [spec.kind, spec]),
);
