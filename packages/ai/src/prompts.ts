import type { ChatMessage } from "./transport.ts";

// small models resolve relative dates much better with the weekday
// spelled out; local time (not UTC) because "saturday morning" means
// the member's own clock
const withWeekday = (d: Date) => {
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const offset = -d.getTimezoneOffset() / 60;
  return `${local} (${weekday}, UTC${offset >= 0 ? "+" : ""}${offset})`;
};

// Prompt builders + parsers per feature (spec §2/§3.3). Draft features
// get JSON-mode instructions and a field-by-field hand-rolled guard —
// the repo has no zod dep, validate like toSuggestion does. The recap
// is prose and needs no parser.

export interface EventDraft {
  title?: string;
  starts?: number; // unix seconds
  ends?: number;
  location?: string;
  summary?: string;
}

export interface SuggestionDraft extends EventDraft {
  note?: string;
}

const JSON_RULES = `Reply with ONLY a JSON object, no markdown fences, no commentary. Schema:
{"title": string, "start": "ISO-8601 datetime", "end": "ISO-8601 datetime or null", "location": "string or null", "summary": "string or null"}
Rules: title is short and concrete; resolve relative dates against the current time below; if no date is given pick the nearest plausible upcoming day; end is null unless stated or strongly implied; location is null if none is mentioned; summary is one casual sentence or null.`;

export function eventDraftMessages(text: string, now: Date = new Date()): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You fill in event details for a private group-events app from a member's casual description. ${JSON_RULES}`,
    },
    {
      role: "user",
      content: `Current time: ${withWeekday(now)}\n\nDescription: ${text}`,
    },
  ];
}

const isoOrNull = (ts?: number) => (ts === undefined ? null : new Date(ts * 1000).toISOString());

export function suggestionDraftMessages(
  text: string,
  event: { title: string; starts: number; ends?: number; location?: string; summary?: string },
  now: Date = new Date(),
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You turn a member's proposed change to a group event into structured fields. Reply with ONLY a JSON object, no markdown fences, no commentary. Schema:
{"title": string, "start": "ISO-8601 datetime", "end": "ISO-8601 datetime or null", "location": "string or null", "summary": "string or null", "note": "one sentence explaining the change to the organiser"}
Only include fields the proposal actually changes; copy the current value for the rest.`,
    },
    {
      role: "user",
      content: `Current time: ${withWeekday(now)}\n\nCurrent event: ${JSON.stringify({
        title: event.title,
        start: isoOrNull(event.starts),
        end: isoOrNull(event.ends),
        location: event.location ?? null,
        summary: event.summary ?? null,
      })}\n\nProposal: ${text}`,
    },
  ];
}

function extractJson(content: string): unknown {
  let s = content.trim();
  // tolerate ```json fences despite the instructions
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fence?.[1] !== undefined) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function isoToUnix(v: unknown): number | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? undefined : Math.floor(t / 1000);
}

// Field-by-field validation — anything malformed is dropped.
function parseFields(o: Record<string, unknown>): EventDraft {
  const draft: EventDraft = {};
  const title = str(o.title);
  const starts = isoToUnix(o.start);
  const ends = isoToUnix(o.end);
  const location = str(o.location);
  const summary = str(o.summary);
  if (title !== undefined) draft.title = title;
  if (starts !== undefined) draft.starts = starts;
  if (ends !== undefined) draft.ends = ends;
  if (location !== undefined) draft.location = location;
  if (summary !== undefined) draft.summary = summary;
  if (draft.ends !== undefined && draft.starts !== undefined && draft.ends <= draft.starts) {
    delete draft.ends;
  }
  return draft;
}

export function parseEventDraft(content: string): EventDraft | null {
  const raw = extractJson(content);
  if (raw === null || typeof raw !== "object") return null;
  const draft = parseFields(raw as Record<string, unknown>);
  // a draft with neither a title nor a start time is no draft at all
  if (draft.title === undefined && draft.starts === undefined) return null;
  return draft;
}

export function parseSuggestionDraft(content: string): SuggestionDraft | null {
  const raw = extractJson(content);
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const draft: SuggestionDraft = parseFields(o);
  const note = str(o.note);
  if (note !== undefined) draft.note = note;
  if (
    draft.title === undefined &&
    draft.starts === undefined &&
    draft.ends === undefined &&
    draft.location === undefined &&
    draft.note === undefined
  ) {
    return null;
  }
  return draft;
}

// Circle recap — context assembled client-side from the realm (spec §2:
// no new read path), output is plain prose for the card.
export interface RecapEventInput {
  title: string;
  starts: number;
  location?: string;
  going: number;
  maybe: number;
  openSuggestions: number;
}

export function recapMessages(circleName: string, events: RecapEventInput[]): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You write the 'what's on' recap for a private circle in a group-events app. Two or three short sentences, warm and plain — what's coming up, what needs a decision (open suggestions), anything missing RSVPs. No markdown, no bullet lists, no exclamation marks.",
    },
    {
      role: "user",
      content: `Circle: ${circleName}\nNow: ${new Date().toISOString()}\nUpcoming events: ${JSON.stringify(
        events.map((e) => ({
          ...e,
          starts: new Date(e.starts * 1000).toISOString(),
        })),
      )}`,
    },
  ];
}
