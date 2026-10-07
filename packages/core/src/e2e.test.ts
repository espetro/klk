// Client e2e against a live relay — run with KLK_E2E=1 and a klk-relay
// listening on KLK_RELAY_URL (default ws://localhost:3334).
import { describe, expect, it } from "vitest";
import {
  CAP_POST_EVENT,
  CAP_READ,
  KlkRelay,
  buildCalendarEvent,
  generateKeypair,
  withDelegation,
} from "@klk/proto";
import {
  $circles,
  $events,
  $rsvps,
  $suggestions,
  applySuggestion,
  connect,
  createCircle,
  disconnect,
  discoverCircles,
  grantAgentScope,
  inviteLinkFor,
  joinCircle,
  postEvent,
  setRsvp,
  suggestChange,
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

  it("member grants an agent a scoped write + read", async () => {
    const owner = generateKeypair();
    const agent = generateKeypair();

    await connect(owner, { relayUrl: RELAY_URL });
    const circle = await createCircle("agent e2e", "hosted");
    const scope = await grantAgentScope({
      scopeId: "my-agent",
      agent: agent.pubkey,
      circles: [circle.coord],
      caps: [CAP_READ, CAP_POST_EVENT],
    });
    expect(scope.startsWith("34134:")).toBe(true);
    await wait(150); // scope event lands in the store

    // agent connects with its OWN key and writes under delegation
    const ar = await KlkRelay.connect(RELAY_URL, agent.secretKey);
    const res = await ar.publish(
      withDelegation(
        buildCalendarEvent({
          id: "agent-e1",
          coord: circle.coord,
          title: "posted by the agent",
          starts: Math.floor(Date.now() / 1000) + 7200,
        }),
        scope,
      ),
    );
    expect(res.ok).toBe(true);

    // owner sees the delegated event land
    await until(() => ($events.get()[circle.coord] ?? []).some((e) => e.id === "agent-e1"));

    // out-of-scope write rejected: RSVP isn't a granted cap
    const bad = await ar.publish(
      withDelegation(
        {
          kind: 31925,
          created_at: Math.floor(Date.now() / 1000),
          content: "",
          tags: [
            ["e", "x"],
            ["a", circle.coord],
          ],
        },
        scope,
      ),
    );
    expect(bad.ok).toBe(false);

    ar.close();
    await disconnect();
  }, 20000);

  it("fresh realm re-discovers owned + joined circles", async () => {
    const owner = generateKeypair();
    const member = generateKeypair();

    await connect(owner, { relayUrl: RELAY_URL });
    const circle = await createCircle("restore me", "hosted");
    const inviteFragment = inviteLinkFor(circle, "http://localhost").split("/join")[1]!;

    await disconnect();
    await connect(member, { relayUrl: RELAY_URL });
    await joinCircle(inviteFragment);

    // simulate a document reload: all realm state drops
    await disconnect();
    expect(Object.keys($circles.get())).toHaveLength(0);

    await connect(member, { relayUrl: RELAY_URL });
    await discoverCircles();
    expect($circles.get()[circle.coord]?.coord).toBe(circle.coord);
    await until(() => ($circles.get()[circle.coord]?.members.length ?? 0) >= 2);

    await disconnect();
  }, 20000);

  it("member suggests a change; creator applies it on the same event", async () => {
    const owner = generateKeypair();
    const member = generateKeypair();

    await connect(owner, { relayUrl: RELAY_URL });
    const circle = await createCircle("suggest e2e", "hosted");
    const ev = await postEvent({
      coord: circle.coord,
      title: "original plan",
      starts: Math.floor(Date.now() / 1000) + 3600,
      suggestable: true,
    });
    const inviteFragment = inviteLinkFor(circle, "http://localhost").split("/join")[1]!;

    await disconnect();
    await connect(member, { relayUrl: RELAY_URL });
    await joinCircle(inviteFragment);

    const later = Math.floor(Date.now() / 1000) + 7200;
    await suggestChange({
      coord: circle.coord,
      eventId: ev.id,
      title: "moved to the park",
      starts: later,
      note: "weather looks better",
    });

    // creator's view: the suggestion lands on the event
    await disconnect();
    await connect(owner, { relayUrl: RELAY_URL });
    await discoverCircles();
    const skey = `${circle.coord}:${ev.id}`;
    await until(() => ($suggestions.get()[skey] ?? []).length >= 1);
    const suggestion = $suggestions.get()[skey]![0]!;
    expect(suggestion.pubkey).toBe(member.pubkey);
    expect(suggestion.title).toBe("moved to the park");

    await applySuggestion(ev, suggestion);
    await until(
      () =>
        ($events.get()[circle.coord] ?? []).find((e) => e.id === ev.id)?.title ===
        "moved to the park",
    );

    await disconnect();
  }, 20000);

  it("ICS feed serves hosted circles by invite secret, 403s sealed ones", async () => {
    const owner = generateKeypair();
    const httpBase = RELAY_URL.replace(/^ws/, "http");

    await connect(owner, { relayUrl: RELAY_URL });
    const hosted = await createCircle("feed hosted", "hosted");
    const sealed = await createCircle("feed sealed", "sealed");
    await postEvent({
      coord: hosted.coord,
      title: "feed hang",
      starts: Math.floor(Date.now() / 1000) + 3600,
      location: "the spot",
    });
    await wait(300); // events land in the store

    const url = `${httpBase}/ics/${hosted.owner}/${hosted.slug}?invite=${hosted.inviteSecret}`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("SUMMARY:feed hang");
    expect(body).toContain("LOCATION:the spot");

    const bad = await fetch(`${httpBase}/ics/${hosted.owner}/${hosted.slug}?invite=wrong`);
    expect(bad.status).toBe(403);
    const sealedRes = await fetch(
      `${httpBase}/ics/${sealed.owner}/${sealed.slug}?invite=${sealed.inviteSecret}`,
    );
    expect(sealedRes.status).toBe(403);

    await disconnect();
  }, 20000);
});
