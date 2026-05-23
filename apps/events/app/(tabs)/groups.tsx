import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { GroupCard } from "@klk/ui";
import { getAllGroups, GroupRecord } from "@klk/infrastructure";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export default function GroupsScreen() {
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      getAllGroups().then(setGroups);
    }, []),
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">Groups</Text>
        <Pressable
          className="bg-indigo-600 rounded-full px-4 py-2"
          onPress={() => router.push("/group/new")}
        >
          <Text className="text-white font-medium">+ New</Text>
        </Pressable>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-gray-400 text-base">No private groups yet</Text>
            <Text className="text-gray-400 text-sm mt-1">Create one to invite friends</Text>
          </View>
        }
      />
    </View>
  );
}
