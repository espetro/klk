import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { PublicEventData } from "@klk/infrastructure";
import { Card, CardContent } from "@klk/ui";

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
      <Card className="bg-white mb-3">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold text-gray-900">{event.title || "Untitled"}</Text>
          <Text className="text-sm text-indigo-600 mt-1">{formatDate(event.start)}</Text>
          {event.location ? <Text className="text-sm text-gray-500 mt-1">{event.location}</Text> : null}
          {event.summary ? (
            <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>
              {event.summary}
            </Text>
          ) : null}
        </CardContent>
      </Card>
    </Pressable>
  );
}
