import { ScrollView, Pressable, Text } from "react-native";
import { CITIES } from "@klk/infrastructure";

interface Props {
  current: string;
  onChange: (slug: string) => void;
}

export function CityPicker({ current, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
      {CITIES.map((c) => (
        <Pressable
          key={c.slug}
          onPress={() => onChange(c.slug)}
          className={`mr-2 px-4 py-2 rounded-full ${
            current === c.slug ? "bg-indigo-600" : "bg-gray-100"
          }`}
        >
          <Text className={current === c.slug ? "text-white font-medium" : "text-gray-700"}>
            {c.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
