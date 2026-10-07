import { describe, expect, it } from "vitest";
import { circleFromDef, coordFor } from "./domain.ts";
import { sealFor, openFor } from "./client.ts";

describe("domain", () => {
  it("parses a hosted circle def", () => {
    const c = circleFromDef(
      "31950:aa:weekend-crew",
      "aa",
      JSON.stringify({ name: "Weekend Crew", tier: "hosted" }),
      "sesame",
    );
    expect(c.name).toBe("Weekend Crew");
    expect(c.tier).toBe("hosted");
    expect(c.slug).toBe("weekend-crew");
    expect(c.members).toEqual(["aa"]);
  });

  it("builds a coordinate", () => {
    expect(coordFor("aa", "d1")).toBe("31950:aa:d1");
  });
});

describe("sealed content", () => {
  it("returns null for unknown circles", () => {
    expect(sealFor("31950:aa:nope", "x")).toBeNull();
    expect(openFor("31950:aa:nope", "x")).toBeNull();
  });
});
