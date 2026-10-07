// Client e2e against a live relay — run with KLK_E2E=1 and a klk-relay
// listening on KLK_RELAY_URL (default ws://localhost:3334).
import { describe, expect, it } from "vitest";
import { generateKeypair } from "@klk/proto";
import {
  $circles,
  $events,
  $rsvps,
  connect,
  createCircle,
  disconnect,
  inviteLinkFor,
  joinCircle,
  postEvent,
  setRsvp,
} from "./client.ts";

const RUN = process.env.KLK_E2E === "1";
const RELAY_URL = process.env.KLK_RELAY_URL ?? "ws://localhost:3334";

const wait = async (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => boolean, ms = 5000): Promise<void> => {
  const deadline = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > deadline) throw new Error("timed out waiting for condition");
    await wait(50);
  }
};

describe.skipIf(!RUN)("v0 loop over a live relay", () => {
  it("circle → invite → join → event → rsvp", async () => {
    const owner = generateKeypair();
    const member = generateKeypair();

    await connect(owner, { relayUrl: RELAY_URL });
    const circle = await createCircle("e2e crew", "hosted");
    expect($circles.get()[circle.coord]?.name).toBe("e2e crew");
    const inviteFragment = inviteLinkFor(circle, "http://localhost").split("/join")[1]!;

    // second identity joins via the invite payload
    await disconnect();
    await connect(member, { relayUrl: RELAY_URL });
    const joined = await joinCircle(inviteFragment);
    expect(joined.coord).toBe(circle.coord);
    await until(() => ($circles.get()[circle.coord]?.members.length ?? 0) >= 2);

    const ev = await postEvent({
      coord: circle.coord,
      title: "e2e hang",
      starts: Math.floor(Date.now() / 1000) + 3600,
      location: "Somewhere",
    });
    await until(() => ($events.get()[circle.coord] ?? []).some((e) => e.id === ev.id));

    await setRsvp(circle.coord, ev.eventId, "yes");
    await until(() =>
      ($rsvps.get()[`${circle.coord}:${ev.eventId}`] ?? []).some(
        (r) => r.pubkey === member.pubkey && r.status === "yes",
      ),
    );

    await disconnect();
  }, 20000);
});
