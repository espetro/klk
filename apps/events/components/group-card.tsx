import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { GroupRecord } from "@klk/infrastructure";

interface Props {
  group: GroupRecord;
}

export function GroupCard({ group }: Props) {
  const router = useRouter();
  return (
    <Pressable
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => router.push(`/group/${group.id}`)}
    >
      <Text className="text-lg font-semibold text-gray-900">{group.name}</Text>
      <Text className="text-sm text-gray-500 mt-1">
        {group.members.length} member{group.members.length !== 1 ? "s" : ""}
      </Text>
    </Pressable>
  );
}
