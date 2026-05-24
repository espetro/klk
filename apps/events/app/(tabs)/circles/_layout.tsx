import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { Pressable } from "react-native";

function ProfileHeaderButton() {
  return (
    <Pressable onPress={() => router.push("/profile")} hitSlop={8}>
      <Ionicons name="person-circle-outline" size={28} color="#6366f1" />
    </Pressable>
  );
}

export default function CirclesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Circles",
          // oxlint-disable-next-line react/no-unstable-nested-components
          headerRight: () => <ProfileHeaderButton />,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
