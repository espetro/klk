// Per-circle agent management (spec §5): grant narrow, replaceable
// scopes to a member's own agents. Replace-not-merge is the wire truth —
// the UI says so and presets the previous grant, never presenting it as
// additive. Revoke is a re-grant with a past expiration.
import { useState } from "react";
import { Button, Input, Text, XStack, YStack } from "tamagui";
import { displayName, grantAgentScope, listAgentScopes } from "@klk/core";
import type { AgentScopeInfo } from "@klk/core";
import { npubDecode } from "@klk/proto";
import { palette } from "@klk/ui";
import { notify } from "./notify";

const CAPS = [
  { id: "read", label: "Read what you can see" },
  { id: "postEvent", label: "Post events" },
  { id: "setRsvp", label: "Set RSVPs" },
] as const;

const BUNDLES = [
  { id: "event-helper", label: "Event helper", caps: ["postEvent", "setRsvp"] },
  { id: "read-companion", label: "Read companion", caps: ["read"] },
] as const;

const capLabel = (id: string) => CAPS.find((c) => c.id === id)?.label ?? id;

const nowSec = () => Math.floor(Date.now() / 1000);

export const AgentPanel = ({
  coord,
  tier,
  connected,
}: {
  coord: string;
  tier: "hosted" | "sealed";
  connected: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [scopes, setScopes] = useState<AgentScopeInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [caps, setCaps] = useState<Record<string, boolean>>({});
  const [editingScope, setEditingScope] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  const load = () => {
    void listAgentScopes()
      .then((all) => {
        const now = Math.floor(Date.now() / 1000);
        setScopes(
          all.filter(
            (s) => s.circles.includes(coord) && (s.expiration === undefined || s.expiration > now),
          ),
        );
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  };

  const expand = () => {
    setExpanded(true);
    if (!loaded) load();
  };

  const live = scopes;

  const selectedCaps = CAPS.filter((c) => caps[c.id] === true).map((c) => c.id);
  const hasRead = caps["read"] === true;
  const hasWrite = caps["postEvent"] === true || caps["setRsvp"] === true;
  const lethalCombo = tier === "hosted" && hasRead && hasWrite;

  const startEdit = (s: AgentScopeInfo) => {
    // re-grant: preset exactly what the scope currently allows
    setAgentInput(s.agent);
    const next: Record<string, boolean> = {};
    for (const c of s.caps) next[c] = true;
    setCaps(next);
    setEditingScope(s.scopeId);
  };

  const grant = () => {
    const pk = npubDecode(agentInput);
    if (pk === null) {
      setErr("That's not a valid pubkey or npub");
      return;
    }
    if (selectedCaps.length === 0) {
      setErr("Pick at least one capability");
      return;
    }
    setBusy(true);
    setErr(undefined);
    // replace-not-merge is the wire truth only when the `d` tag matches —
    // granting the same agent again must reuse its existing scope id, or
    // the old grant stays live alongside the new one
    const existing = live.find((sc) => sc.agent === pk);
    const scopeId =
      editingScope ?? existing?.scopeId ?? `scope-${Math.random().toString(36).slice(2, 8)}`;
    const prior = live.find((sc) => sc.scopeId === scopeId);
    void grantAgentScope({
      scopeId,
      agent: pk,
      circles: [coord],
      caps: selectedCaps,
      ...(prior?.expiration !== undefined ? { expiration: prior.expiration } : {}),
    })
      .then(() => {
        notify(editingScope !== undefined ? "Agent scope updated" : "Agent added");
        setAgentInput("");
        setCaps({});
        setEditingScope(undefined);
        load();
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  const revoke = (s: AgentScopeInfo) => {
    setBusy(true);
    // one-click revoke: same `d` re-published with a past expiration —
    // the addressable replace supersedes the grant relay-side
    void grantAgentScope({
      scopeId: s.scopeId,
      agent: s.agent,
      circles: s.circles,
      caps: s.caps.length > 0 ? s.caps : ["read"],
      expiration: nowSec() - 60,
    })
      .then(() => {
        notify("Agent access revoked");
        load();
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  if (!expanded) {
    return (
      <Button
        borderRadius={6}
        borderWidth={1}
        borderColor={palette.border}
        backgroundColor={palette.surface}
        color={palette.ink}
        disabled={!connected}
        onPress={expand}
      >
        Agents
      </Button>
    );
  }

  return (
    <YStack
      gap="$3"
      borderWidth={1}
      borderColor={palette.border}
      borderRadius={10}
      padding="$3"
      backgroundColor={palette.canvas}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={15} fontWeight="600" color={palette.ink}>
          Agents
        </Text>
        <Text
          fontSize={12}
          color={palette.muted}
          cursor="pointer"
          onPress={() => setExpanded(false)}
        >
          Close
        </Text>
      </XStack>
      <Text fontSize={12} color={palette.muted} lineHeight={17}>
        Your agents act on your behalf, with only the capabilities you grant. Re-granting an agent
        replaces its previous scope — it never adds to it.
      </Text>

      {live.length === 0 ? (
        <Text fontSize={13} color={palette.muted}>
          No agents in this circle yet.
        </Text>
      ) : (
        live.map((s) => (
          <XStack
            key={s.scopeId}
            alignItems="center"
            gap="$2"
            borderWidth={1}
            borderColor={palette.border}
            borderRadius={8}
            padding="$3"
            backgroundColor={palette.surface}
          >
            <YStack flex={1} gap={2}>
              <Text fontSize={14} fontWeight="500" color={palette.ink}>
                {displayName(s.agent)}
              </Text>
              <Text fontSize={11} color={palette.muted}>
                {s.caps.map(capLabel).join(" · ")}
              </Text>
              <Text fontSize={10} color={palette.muted} fontFamily="monospace" selectable>
                scope: {s.scopeId}
              </Text>
            </YStack>
            <Button
              size="$2"
              chromeless
              color={palette.ink}
              disabled={busy}
              onPress={() => startEdit(s)}
            >
              Edit
            </Button>
            <Button size="$2" chromeless color="#9F2F2D" disabled={busy} onPress={() => revoke(s)}>
              Revoke
            </Button>
          </XStack>
        ))
      )}

      <YStack gap="$2">
        <Text fontSize={13} fontWeight="600" color={palette.ink}>
          {editingScope !== undefined ? "Edit scope" : "Add an agent"}
        </Text>
        <Input
          value={agentInput}
          onChangeText={setAgentInput}
          placeholder="Agent pubkey or npub"
          autoCapitalize="none"
          borderColor={palette.border}
          backgroundColor={palette.surface}
        />
        <XStack gap="$2" flexWrap="wrap">
          {BUNDLES.map((b) => (
            <Button
              key={b.id}
              size="$2"
              borderRadius={6}
              borderWidth={1}
              borderColor={palette.border}
              backgroundColor={palette.surface}
              color={palette.ink}
              onPress={() => {
                const next: Record<string, boolean> = {};
                for (const c of b.caps) next[c] = true;
                setCaps(next);
              }}
            >
              {b.label}
            </Button>
          ))}
        </XStack>
        {CAPS.map((c) => (
          <XStack
            key={c.id}
            gap="$2"
            alignItems="center"
            cursor="pointer"
            onPress={() => setCaps({ ...caps, [c.id]: caps[c.id] !== true })}
          >
            <YStack
              width={16}
              height={16}
              borderRadius={4}
              borderWidth={1}
              borderColor={palette.border}
              backgroundColor={caps[c.id] === true ? palette.ink : palette.surface}
            />
            <Text fontSize={13} color={palette.ink}>
              {c.label}
            </Text>
          </XStack>
        ))}
        {lethalCombo ? (
          <Text fontSize={12} color="#9F2F2D" lineHeight={16}>
            Careful: reading plus posting means this agent could copy private circle content and
            publish anywhere. Only grant both to agents you fully control.
          </Text>
        ) : null}
        {err !== undefined ? (
          <Text fontSize={12} color="#9F2F2D">
            {err}
          </Text>
        ) : null}
        <XStack gap="$2">
          <Button
            size="$3"
            borderRadius={6}
            backgroundColor={palette.ink}
            color="#FFFFFF"
            disabled={busy || agentInput.trim() === "" || selectedCaps.length === 0}
            opacity={busy || agentInput.trim() === "" || selectedCaps.length === 0 ? 0.5 : 1}
            onPress={grant}
          >
            {busy ? "Saving…" : editingScope !== undefined ? "Replace scope" : "Grant access"}
          </Button>
          {editingScope !== undefined ? (
            <Button
              size="$3"
              chromeless
              color={palette.muted}
              onPress={() => {
                setEditingScope(undefined);
                setAgentInput("");
                setCaps({});
              }}
            >
              Cancel
            </Button>
          ) : null}
        </XStack>
      </YStack>
    </YStack>
  );
};
