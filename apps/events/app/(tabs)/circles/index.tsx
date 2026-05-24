import { GroupCard } from "@/components";
import { getAllGroups, GroupRecord } from "@klk/infrastructure";
import { useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { FlatList, Text, View } from "react-native";

export default function CirclesScreen() {
  const [groups, setGroups] = useState<GroupRecord[]>([]);

  useFocusEffect(
    useCallback(function loadAllGroups() {
      getAllGroups().then(setGroups);
    }, []),
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-gray-400 text-base">No circles yet</Text>
            <Text className="text-gray-400 text-sm mt-1">Create one to invite friends</Text>
          </View>
        }
      />
    </View>
  );
}
