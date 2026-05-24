import { HostedButton as Button } from "@/components/hosted-button";
import { useRsvps } from "@/features";
import { useEventDetail } from "@/features/useEventDetail";
import { useFeatureFlag } from "@/features/useFeatureFlag";
import { NDKContext } from "@/lib/context/ndk-context";
import { User } from "@klk/core";
import {
  parsePublicEvent,
  PublicEventData,
  buildEventCoordinate,
  publishRsvp,
} from "@klk/infrastructure";
import { Stack, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

function formatDate(ts: number) {
  if (!ts) return "TBD";
  return new Date(ts * 1000).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ndk, currentUser } = useContext(NDKContext);
  const { getFlag } = useFeatureFlag();
  const useNewArch = getFlag("useNewArchitecture");

  const [event, setEvent] = useState<(PublicEventData & { id: string; pubkey: string }) | null>(
    null,
  );
  const [coordinate, setCoordinate] = useState("");
  const [rsvping, setRsvping] = useState(false);
  const rsvps = useRsvps(coordinate);

  useEffect(
    function loadEventDetail() {
      if (!ndk || !id) return;
      ndk.fetchEvent(id).then((e) => {
        if (!e) return;
        const parsed = parsePublicEvent(e);
        setEvent(parsed);
        setCoordinate(buildEventCoordinate(e));
      });
    },
    [ndk, id],
  );

  const hasRsvpd = rsvps.some((r) => r.pubkey === currentUser?.pubkey);

  const handleRsvp = async () => {
    if (!ndk || !coordinate || hasRsvpd) return;
    setRsvping(true);
    try {
      await publishRsvp(ndk, coordinate);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "RSVP failed");
    } finally {
      setRsvping(false);
    }
  };

  if (useNewArch && id) {
    return <NewEventDetail eventId={id} />;
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Loading…</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1.0],
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <ScrollView className="flex-1 bg-gray-50" contentInsetAdjustmentBehavior="automatic">
        <View className="bg-white p-5 mb-2">
          <Text className="text-2xl font-bold text-gray-900">{event.title}</Text>
          <Text className="text-indigo-600 mt-2">{formatDate(event.start)}</Text>
          {event.end ? (
            <Text className="text-gray-400 text-sm">– {formatDate(event.end)}</Text>
          ) : null}
          {event.location ? <Text className="text-gray-600 mt-2">{event.location}</Text> : null}
        </View>

        {event.summary ? (
          <View className="bg-white p-5 mb-2">
            <Text className="text-sm font-medium text-gray-500 mb-2">About</Text>
            <Text className="text-gray-700">{event.summary}</Text>
          </View>
        ) : null}

        <View className="bg-white p-5 mb-2">
          <Text className="text-sm font-medium text-gray-500 mb-2">Attendees ({rsvps.length})</Text>
          {rsvps.length === 0 ? (
            <Text className="text-gray-400 text-sm">No RSVPs yet</Text>
          ) : (
            rsvps.map((r) => (
              <Text key={r.pubkey} className="text-xs text-gray-600 font-mono" numberOfLines={1}>
                {r.pubkey.slice(0, 16)}…
              </Text>
            ))
          )}
        </View>

        <View className="p-4">
          <Button
            label={hasRsvpd ? "You're going!" : rsvping ? "RSVP-ing…" : "RSVP"}
            variant={hasRsvpd || rsvping ? "outlined" : "filled"}
            onPress={handleRsvp}
            disabled={hasRsvpd || rsvping}
          />
        </View>
      </ScrollView>
    </>
  );
}

function NewEventDetail({ eventId }: { eventId: string }) {
  const { currentUser } = useContext(NDKContext);
  const { event, loading, error, rsvp, rsvping, hasRsvpd } = useEventDetail(
    eventId,
    currentUser ? ({ npub: currentUser.pubkey } as User) : null,
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Loading…</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">{error ?? "Event not found"}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75, 1.0],
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <ScrollView className="flex-1 bg-gray-50" contentInsetAdjustmentBehavior="automatic">
        <View className="bg-white p-5 mb-2">
          <Text className="text-2xl font-bold text-gray-900">{event.title}</Text>
          <Text className="text-indigo-600 mt-2">{formatDate(event.start)}</Text>
          {event.end ? (
            <Text className="text-gray-400 text-sm">– {formatDate(event.end)}</Text>
          ) : null}
          {event.location ? <Text className="text-gray-600 mt-2">{event.location}</Text> : null}
        </View>

        {event.summary ? (
          <View className="bg-white p-5 mb-2">
            <Text className="text-sm font-medium text-gray-500 mb-2">About</Text>
            <Text className="text-gray-700">{event.summary}</Text>
          </View>
        ) : null}

        <View className="bg-white p-5 mb-2">
          <Text className="text-sm font-medium text-gray-500 mb-2">Attendees (0)</Text>
          <Text className="text-gray-400 text-sm">No RSVPs yet</Text>
        </View>

        <View className="p-4">
          <Button
            label={hasRsvpd ? "You're going!" : rsvping ? "RSVP-ing…" : "RSVP"}
            variant={hasRsvpd || rsvping ? "outlined" : "filled"}
            onPress={rsvp}
            disabled={hasRsvpd || rsvping}
          />
        </View>
      </ScrollView>
    </>
  );
}
