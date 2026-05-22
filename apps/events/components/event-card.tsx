import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PublicEventData } from "@/lib/nostr/events";

interface Props {
  event: PublicEventData & { id: string };
}

function formatDate(ts: number) {
  if (!ts) return "TBD";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventCard({ event }: Props) {
  const router = useRouter();
  return (
    <Pressable
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <Text className="text-lg font-semibold text-gray-900">{event.title || "Untitled"}</Text>
      <Text className="text-sm text-indigo-600 mt-1">{formatDate(event.start)}</Text>
      {event.location ? (
        <Text className="text-sm text-gray-500 mt-1">{event.location}</Text>
      ) : null}
      {event.summary ? (
        <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>
          {event.summary}
        </Text>
      ) : null}
    </Pressable>
  );
}
