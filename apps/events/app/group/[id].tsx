import { useCallback, useContext, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { NDKContext } from "@/app/_layout";
import { getGroup, GroupRecord } from "@klk/infrastructure";
import { publishPrivateEvent } from "@klk/infrastructure";
import { useGroupEvents } from "@/features";
import { EventCard, InviteFriendSheet, EventForm, EventFormValues } from "@klk/ui";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ndk, signer } = useContext(NDKContext);
  const [group, setGroup] = useState<GroupRecord | null>(null);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [newEventVisible, setNewEventVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const privateEvents = useGroupEvents(group);

  useFocusEffect(
    useCallback(() => {
      if (id) getGroup(id).then(setGroup);
    }, [id]),
  );

  const handlePublishPrivateEvent = async (values: EventFormValues) => {
    if (!ndk || !group) return;
    setSubmitting(true);
    try {
      await publishPrivateEvent(ndk, group, {
        title: values.title,
        start: Math.floor(values.start.getTime() / 1000),
        end: Math.floor(values.end.getTime() / 1000),
        location: values.location,
        summary: values.summary,
        image: values.image || undefined,
        city: "",
      });
      setNewEventVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to publish event");
    } finally {
      setSubmitting(false);
    }
  };

  if (!group) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Loading…</Text>
      </View>
    );
  }

  if (newEventVisible) {
    return (
      <View className="flex-1">
        <EventForm
          onSubmit={handlePublishPrivateEvent}
          submitting={submitting}
          submitLabel="Publish to Group"
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white p-5 mb-2">
        <Text className="text-2xl font-bold text-gray-900">{group.name}</Text>
        <Text className="text-sm text-gray-500 mt-1">Private Group</Text>
      </View>

      <View className="bg-white p-5 mb-2">
        <Text className="text-sm font-medium text-gray-500 mb-2">
          Members ({group.members.length})
        </Text>
        {group.members.map((m) => (
          <Text key={m} className="text-xs text-gray-600 font-mono mb-1" numberOfLines={1}>
            {m.slice(0, 20)}…
          </Text>
        ))}
        {ndk && signer ? (
          <Pressable
            className="mt-3 border border-indigo-200 rounded-lg p-2 items-center"
            onPress={() => setInviteVisible(true)}
          >
            <Text className="text-indigo-600 text-sm font-medium">+ Invite Friend</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="px-4 mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-700">
          Private Events ({privateEvents.length})
        </Text>
        <Pressable
          className="bg-indigo-600 rounded-full px-3 py-1"
          onPress={() => setNewEventVisible(true)}
        >
          <Text className="text-white text-sm font-medium">+ New</Text>
        </Pressable>
      </View>

      {privateEvents.length === 0 ? (
        <View className="items-center mt-8 mb-8">
          <Text className="text-gray-400">No private events yet</Text>
        </View>
      ) : (
        <View className="px-4">
          {privateEvents.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </View>
      )}

      {inviteVisible && ndk && signer ? (
        <InviteFriendSheet
          visible={inviteVisible}
          onClose={() => setInviteVisible(false)}
          ndk={ndk}
          signer={signer}
          group={group}
          onGroupUpdated={(g) => setGroup(g)}
        />
      ) : null}
    </ScrollView>
  );
}
