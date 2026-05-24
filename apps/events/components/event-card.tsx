import { PublicEventData } from "@klk/infrastructure";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

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
    <Pressable onPress={() => router.push(`/event/${event.id}`)}>
      <View className="mb-3 flex flex-col rounded-xl border border-gray-200 bg-white py-4 shadow-sm shadow-black/5">
        <View className="px-4">
          <Text className="text-lg font-semibold text-gray-900">{event.title || "Untitled"}</Text>
          <Text className="mt-1 text-sm text-indigo-600">{formatDate(event.start)}</Text>
          {event.location ? (
            <Text className="mt-1 text-sm text-gray-500">{event.location}</Text>
          ) : null}
          {event.summary ? (
            <Text className="mt-2 text-sm text-gray-600" numberOfLines={2}>
              {event.summary}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
