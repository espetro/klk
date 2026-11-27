import { describe, expect, it } from "vitest";
import {
  parseEventDraft,
  parseSuggestionDraft,
  eventDraftMessages,
  recapMessages,
  loadAiSettings,
  saveAiSettings,
  customEndpointReady,
} from "./index.ts";

describe("parseEventDraft", () => {
  it("parses a clean JSON reply", () => {
    const draft = parseEventDraft(
      `{"title":"Climbing","start":"2026-11-28T09:00:00.000Z","end":null,"location":"Montgat crag","summary":"Bring ropes"}`,
    );
    expect(draft?.title).toBe("Climbing");
    expect(draft?.starts).toBe(Math.floor(new Date("2026-11-28T09:00:00.000Z").getTime() / 1000));
    expect(draft?.ends).toBeUndefined();
    expect(draft?.location).toBe("Montgat crag");
  });

  it("tolerates markdown fences", () => {
    const draft = parseEventDraft('```json\n{"title":"Run","start":"2026-11-29T07:00:00Z"}\n```');
    expect(draft?.title).toBe("Run");
  });

  it("rejects empty-useless drafts", () => {
    expect(parseEventDraft(`{"location":null}`)).toBeNull();
    expect(parseEventDraft("not json at all")).toBeNull();
  });

  it("drops inverted end times", () => {
    const draft = parseEventDraft(
      `{"title":"X","start":"2026-11-29T10:00:00Z","end":"2026-11-29T09:00:00Z"}`,
    );
    expect(draft?.ends).toBeUndefined();
  });
});

describe("parseSuggestionDraft", () => {
  it("captures the note", () => {
    const draft = parseSuggestionDraft(
      `{"start":"2026-11-29T11:00:00Z","note":"Moving later so people can join after work"}`,
    );
    expect(draft?.starts).toBeDefined();
    expect(draft?.note).toContain("later");
  });

  it("rejects when nothing is proposed", () => {
    expect(parseSuggestionDraft(`{}`)).toBeNull();
  });
});

describe("prompts", () => {
  it("event draft prompt carries the current time", () => {
    const msgs = eventDraftMessages("climbing saturday", new Date("2026-11-24T12:00:00Z"));
    expect(msgs[1]?.content ?? "").toContain("2026-11-24");
    expect(msgs[1]?.content ?? "").toContain("climbing saturday");
  });

  it("recap prompt serializes events", () => {
    const msgs = recapMessages("Run club", [
      { title: "Sunday long run", starts: 1764496800, going: 3, maybe: 1, openSuggestions: 1 },
    ]);
    expect(msgs[1]?.content ?? "").toContain("Sunday long run");
    expect(msgs[1]?.content ?? "").toContain("Run club");
  });
});

describe("settings", () => {
  it("round-trips through localStorage", () => {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    } as Storage;
    expect(loadAiSettings().mode).toBe("managed");
    saveAiSettings({
      mode: "custom",
      baseUrl: "http://localhost:1234/v1",
      apiKey: "k",
      model: "m",
    });
    const loaded = loadAiSettings();
    expect(loaded.mode).toBe("custom");
    expect(customEndpointReady(loaded)).toBe(true);
    expect(customEndpointReady({ ...loaded, model: "" })).toBe(false);
  });
});
