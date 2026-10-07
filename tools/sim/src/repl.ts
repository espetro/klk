import { join } from "node:path";
import * as readline from "node:readline";
import type { CalendarEvent } from "@klk/core";
import { npubDecode, npubEncode } from "@klk/proto";
import type { Actor } from "./actor.ts";
import { installFileStorage, spawnActor } from "./actor.ts";

const HELP = `commands (all drive @klk/core — same verbs the app uses):
  whoami                          name + npub
  circles                         list my circles
  use <n|coord>                   pick the active circle
  create-circle "<name>" [sealed] create a circle (hosted by default)
  invite                          print the invite link for the active circle
  join <fragment-or-url>          join a circle from an invite
  members                         member list of the active circle
  create-event "<title>" [--in H] [--suggestable]
  events                          events in the active circle (+rsvp/suggestion counts)
  rsvp <event> <yes|no|maybe>
  suggest <event> [--title X] [--in H] [--location X] [--note X]
  apply <event>                   apply the newest pending suggestion (creator)
  profile "<name>" ["<city>"]     publish my kind-0 profile
  contacts                        my contacts
  follow|unfollow <npub|hex>
  state                           store summary
  quit`;

/** split a line honoring "quoted phrases" */
function words(line: string): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(/"([^"]*)"|(\S+)/g)) out.push(m[1] ?? m[2]!);
  return out;
}

export async function runRepl(opts: {
  actor: string;
  runDir: string;
  relayUrl: string;
}): Promise<number> {
  // per-actor file storage → sealed keys survive a pane restart
  installFileStorage(join(opts.runDir, `${opts.actor}.storage.json`));
  const actor: Actor = await spawnActor(opts.actor, opts.relayUrl, opts.runDir);
  const realm = actor.realm;
  let activeCoord: string | null = null;

  const activeCircle = () => {
    const circles = Object.values(realm.$circles.get());
    if (activeCoord !== null && realm.$circles.get()[activeCoord] !== undefined) {
      return realm.$circles.get()[activeCoord]!;
    }
    if (circles.length === 0) throw new Error("no circle yet — create-circle or join first");
    return circles[0]!;
  };

  const resolveEvent = (prefix: string): CalendarEvent => {
    const coord = activeCircle().coord;
    const matches = (realm.$events.get()[coord] ?? []).filter((e) => e.id.startsWith(prefix));
    if (matches.length === 0) throw new Error(`no event matching "${prefix}"`);
    if (matches.length > 1)
      throw new Error(`ambiguous event "${prefix}" — ${matches.length} matches`);
    return matches[0]!;
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${actor.name}> `,
  });
  let closed = false;
  rl.on("close", () => {
    closed = true;
  });
  const print = (s: string) => {
    process.stdout.write(`\x1b[2K\r${s}\n`);
    if (!closed) rl.prompt();
  };

  // ── watchers: terse inbound notices so panes visibly react ──────────
  const lastMembers = new Map<string, number>();
  realm.$circles.subscribe((cs) => {
    for (const c of Object.values(cs)) {
      const prev = lastMembers.get(c.coord) ?? 0;
      if (c.members.length > prev) {
        print(`⟐ members: ${c.members.length} (${c.name || c.slug})`);
      }
      lastMembers.set(c.coord, c.members.length);
    }
  });
  const lastEventTitles = new Map<string, string>();
  realm.$events.subscribe((all) => {
    for (const list of Object.values(all)) {
      for (const e of list) {
        const prev = lastEventTitles.get(e.id);
        if (prev === undefined) {
          print(`⟐ new event: "${e.title}" (${e.id})`);
        } else if (prev !== e.title) {
          print(`⟐ event updated: "${prev}" → "${e.title}" (${e.id})`);
        }
        lastEventTitles.set(e.id, e.title);
      }
    }
  });
  let lastRsvpTotal = 0;
  realm.$rsvps.subscribe((all) => {
    const total = Object.values(all).reduce((n, l) => n + l.length, 0);
    if (total > lastRsvpTotal) print(`⟐ rsvps: ${total}`);
    lastRsvpTotal = total;
  });
  let lastSuggTotal = 0;
  realm.$suggestions.subscribe((all) => {
    const total = Object.values(all).reduce((n, l) => n + l.length, 0);
    if (total > lastSuggTotal) print(`⟐ suggestions pending: ${total}`);
    lastSuggTotal = total;
  });

  console.log(`${actor.name} online — npub ${npubEncode(actor.keypair.pubkey)}`);
  console.log(`relay ${opts.relayUrl} · run dir ${opts.runDir} · "help" for commands`);
  rl.prompt();

  let done = false;
  for await (const line of rl) {
    const args = words(line.trim());
    const cmd = args.shift();
    try {
      switch (cmd) {
        case undefined:
        case "":
          break;
        case "help":
          console.log(HELP);
          break;
        case "whoami":
          console.log(`${actor.name} — ${npubEncode(actor.keypair.pubkey)}`);
          console.log(`  hex ${actor.keypair.pubkey}`);
          break;
        case "circles": {
          const cs = Object.values(realm.$circles.get());
          if (cs.length === 0) console.log("(none)");
          cs.forEach((c, i) =>
            console.log(
              `  ${i}: ${c.name || "(loading…)"} — ${c.members.length} members — ${c.coord}${c.coord === activeCoord ? " ← active" : ""}`,
            ),
          );
          break;
        }
        case "use": {
          const arg = args[0];
          if (arg === undefined) throw new Error("use <n|coord>");
          const cs = Object.values(realm.$circles.get());
          const hit = /^\d+$/.test(arg) ? cs[Number(arg)] : cs.find((c) => c.coord.startsWith(arg));
          if (hit === undefined) throw new Error(`no circle matching "${arg}"`);
          activeCoord = hit.coord;
          console.log(`active → ${hit.name || hit.coord}`);
          break;
        }
        case "create-circle": {
          const name = args[0];
          if (name === undefined) throw new Error('create-circle "<name>" [sealed]');
          const c = await realm.createCircle(name, args[1] === "sealed" ? "sealed" : "hosted");
          activeCoord = c.coord;
          console.log(`created ${c.coord} — invite: ${realm.inviteLinkFor(c, "http://localhost")}`);
          break;
        }
        case "invite": {
          const c = activeCircle();
          console.log(realm.inviteLinkFor(c, "http://localhost"));
          break;
        }
        case "join": {
          const arg = args[0];
          if (arg === undefined) throw new Error("join <fragment-or-url>");
          const frag = arg.includes("/join") ? arg.split("/join")[1]! : arg;
          const c = await realm.joinCircle(frag);
          activeCoord = c.coord;
          console.log(`joined ${c.coord}`);
          break;
        }
        case "members": {
          const c = activeCircle();
          c.members.forEach((pk) =>
            console.log(`  ${realm.displayName(pk)} — ${pk.slice(0, 12)}…`),
          );
          break;
        }
        case "create-event": {
          const title = args[0];
          if (title === undefined)
            throw new Error('create-event "<title>" [--in H] [--suggestable]');
          const inIdx = args.indexOf("--in");
          const hours = inIdx !== -1 ? Number(args[inIdx + 1] ?? 24) : 24;
          const ev = await realm.postEvent({
            coord: activeCircle().coord,
            title,
            starts: Math.floor(Date.now() / 1000) + Math.round(hours * 3600),
            ...(args.includes("--suggestable") ? { suggestable: true } : {}),
          });
          console.log(`event ${ev.id} "${ev.title}"`);
          break;
        }
        case "events": {
          const coord = activeCircle().coord;
          const list = realm.$events.get()[coord] ?? [];
          if (list.length === 0) console.log("(none)");
          for (const e of list) {
            const n = (realm.$rsvps.get()[`${coord}:${e.id}`] ?? []).length;
            const s = (realm.$suggestions.get()[`${coord}:${e.id}`] ?? []).length;
            console.log(
              `  ${e.id} "${e.title}" — ${new Date(e.starts * 1000).toISOString().slice(0, 16)} — ${n} rsvp${s > 0 ? `, ${s} pending` : ""}`,
            );
          }
          break;
        }
        case "rsvp": {
          const ev = resolveEvent(args[0] ?? "");
          const status = args[1];
          if (status !== "yes" && status !== "no" && status !== "maybe") {
            throw new Error("rsvp <event> <yes|no|maybe>");
          }
          await realm.setRsvp(activeCircle().coord, ev.id, status);
          console.log(`rsvp ${status} → ${ev.id}`);
          break;
        }
        case "suggest": {
          const ev = resolveEvent(args[0] ?? "");
          const rest = args.slice(1);
          const opt = (flag: string) => {
            const i = rest.indexOf(flag);
            return i === -1 ? undefined : rest[i + 1];
          };
          const inH = opt("--in");
          const input: Parameters<typeof realm.suggestChange>[0] = {
            coord: activeCircle().coord,
            eventId: ev.id,
          };
          const t = opt("--title");
          const loc = opt("--location");
          const note = opt("--note");
          if (t !== undefined) input.title = t;
          if (loc !== undefined) input.location = loc;
          if (note !== undefined) input.note = note;
          if (inH !== undefined) input.starts = Math.floor(Date.now() / 1000) + Number(inH) * 3600;
          await realm.suggestChange(input);
          console.log(`suggested on ${ev.id}`);
          break;
        }
        case "apply": {
          const ev = resolveEvent(args[0] ?? "");
          const coord = activeCircle().coord;
          const pending = realm.$suggestions.get()[`${coord}:${ev.id}`] ?? [];
          if (pending.length === 0) throw new Error(`no pending suggestions on ${ev.id}`);
          const s = pending[pending.length - 1]!;
          const updated = await realm.applySuggestion(ev, s);
          console.log(`applied → "${updated.title}"`);
          break;
        }
        case "profile": {
          const name = args[0];
          const city = args[1];
          await realm.publishProfile({
            ...(name !== undefined ? { name } : {}),
            ...(city !== undefined ? { city } : {}),
          });
          console.log("profile published");
          break;
        }
        case "contacts": {
          const cs = realm.$contacts.get();
          if (cs.length === 0) console.log("(none)");
          cs.forEach((pk) => console.log(`  ${realm.displayName(pk)} — ${npubEncode(pk)}`));
          break;
        }
        case "follow": {
          const pk = npubDecode(args[0] ?? "");
          if (pk === null) throw new Error("follow <npub|hex>");
          await realm.addContact(pk);
          console.log(`following ${realm.displayName(pk)}`);
          break;
        }
        case "unfollow": {
          const pk = npubDecode(args[0] ?? "");
          if (pk === null) throw new Error("unfollow <npub|hex>");
          await realm.removeContact(pk);
          console.log("unfollowed");
          break;
        }
        case "state": {
          const cs = realm.$circles.get();
          console.log(
            `circles: ${Object.keys(cs).length} · events: ${Object.values(realm.$events.get()).reduce((n, l) => n + l.length, 0)} · rsvps: ${Object.values(realm.$rsvps.get()).reduce((n, l) => n + l.length, 0)} · contacts: ${realm.$contacts.get().length} · connected: ${realm.$connected.get()}`,
          );
          break;
        }
        case "quit":
        case "exit":
          done = true;
          rl.close();
          break;
        default:
          console.log(`unknown command "${cmd}" — "help" for the list`);
      }
    } catch (err) {
      console.log(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!done && !closed) rl.prompt();
  }

  await realm.disconnect();
  return 0;
}
