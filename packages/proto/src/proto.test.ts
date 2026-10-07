import { describe, expect, it } from "vitest";
import { verifyEvent } from "nostr-tools";
import { KIND_CALENDAR_EVENT, KIND_CIRCLE, KIND_CIRCLE_MEMBER, KIND_RSVP } from "./kinds.ts";
import { generateKeypair, secretKeyFromHex, secretKeyToHex } from "./keys.ts";
import { circleKeyFromHex, circleKeyToHex, generateCircleKey, open, seal } from "./crypto.ts";
import { buildCalendarEvent, buildCircleDef, buildMemberClaim, buildRSVP, sign } from "./events.ts";
import { decodeInvite, encodeInvite } from "./invite.ts";

describe("crypto", () => {
  it("seals and opens with the shared key", () => {
    const key = generateCircleKey();
    const packed = seal(key, "weekend crew plans");
    expect(open(key, packed)).toBe("weekend crew plans");
  });

  it("rejects the wrong key", () => {
    const packed = seal(generateCircleKey(), "secret");
    expect(() => open(generateCircleKey(), packed)).toThrow();
  });

  it("roundtrips the key through hex", () => {
    const key = generateCircleKey();
    expect(circleKeyToHex(circleKeyFromHex(circleKeyToHex(key)))).toBe(circleKeyToHex(key));
  });
});

describe("events", () => {
  const kp = generateKeypair();
  const coord = `31950:${kp.pubkey}:weekend-crew`;

  it("builds + signs a circle def with invite tag", () => {
    const ev = sign(
      buildCircleDef({
        slug: "weekend-crew",
        name: "Weekend Crew",
        tier: "hosted",
        invite: "sesame",
      }),
      kp.secretKey,
    );
    expect(ev.kind).toBe(KIND_CIRCLE);
    expect(verifyEvent(ev)).toBe(true);
    const tags = ev.tags as string[][];
    expect(tags).toContainEqual(["d", "weekend-crew"]);
    expect(tags).toContainEqual(["invite", "sesame"]);
    expect(JSON.parse(ev.content).name).toBe("Weekend Crew");
  });

  it("builds a member claim pointing at the circle", () => {
    const ev = sign(buildMemberClaim({ coord, invite: "sesame" }), kp.secretKey);
    expect(ev.kind).toBe(KIND_CIRCLE_MEMBER);
    expect(ev.tags).toContainEqual(["a", coord]);
    expect(ev.tags).toContainEqual(["invite", "sesame"]);
  });

  it("builds a NIP-52 event with circle scope", () => {
    const ev = sign(
      buildCalendarEvent({
        id: "picnic-1",
        coord,
        title: "Picnic",
        starts: 1790000000,
        location: "Park",
      }),
      kp.secretKey,
    );
    expect(ev.kind).toBe(KIND_CALENDAR_EVENT);
    expect(ev.tags).toContainEqual(["a", coord]);
    expect(ev.tags).toContainEqual(["start", "1790000000"]);
  });

  it("builds an RSVP", () => {
    const ev = sign(buildRSVP({ eventId: "abcd", coord, status: "yes" }), kp.secretKey);
    expect(ev.kind).toBe(KIND_RSVP);
    expect(ev.tags).toContainEqual(["status", "yes"]);
  });
});

describe("invite links", () => {
  it("roundtrips coord + invite + key through the fragment", () => {
    const key = generateCircleKey();
    const frag = encodeInvite({ coord: "31950:aa:d1", invite: "sesame", key });
    const decoded = decodeInvite(frag);
    expect(decoded.coord).toBe("31950:aa:d1");
    expect(decoded.invite).toBe("sesame");
    expect(decoded.key && circleKeyToHex(decoded.key)).toBe(circleKeyToHex(key));
  });

  it("decodes a fragment without a key", () => {
    const decoded = decodeInvite(encodeInvite({ coord: "c", invite: "i" }));
    expect(decoded.key).toBeUndefined();
  });
});

describe("keys", () => {
  it("hex roundtrips a secret key", () => {
    const { secretKey } = generateKeypair();
    expect(secretKeyFromHex(secretKeyToHex(secretKey))).toEqual(secretKey);
  });
});
