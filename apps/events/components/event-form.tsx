import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export interface EventFormValues {
  title: string;
  start: Date;
  end: Date;
  location: string;
  summary: string;
  image: string;
}

interface Props {
  onSubmit: (values: EventFormValues) => Promise<void>;
  submitting: boolean;
  submitLabel?: string;
}

export function EventForm({ onSubmit, submitting, submitLabel = "Publish" }: Props) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [image, setImage] = useState("");
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date(Date.now() + 2 * 3600 * 1000));
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const handleSubmit = async () => {
    await onSubmit({ title, start, end, location, summary, image });
  };

  return (
    <ScrollView
      className="flex-1 p-4 bg-white"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text className="text-sm font-medium text-gray-700 mb-1">Title *</Text>
      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-gray-900"
        value={title}
        onChangeText={setTitle}
        placeholder="Event title"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => {}}
        blurOnSubmit={true}
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Start</Text>
      <Pressable
        className="border border-gray-200 rounded-lg p-3 mb-4"
        onPress={() => setShowStart(true)}
      >
        <Text className="text-gray-900">{start.toLocaleString()}</Text>
      </Pressable>
      {showStart && (
        <DateTimePicker
          value={start}
          mode="datetime"
          onChange={(_, d) => {
            setShowStart(Platform.OS === "ios");
            if (d) setStart(d);
          }}
        />
      )}

      <Text className="text-sm font-medium text-gray-700 mb-1">End</Text>
      <Pressable
        className="border border-gray-200 rounded-lg p-3 mb-4"
        onPress={() => setShowEnd(true)}
      >
        <Text className="text-gray-900">{end.toLocaleString()}</Text>
      </Pressable>
      {showEnd && (
        <DateTimePicker
          value={end}
          mode="datetime"
          onChange={(_, d) => {
            setShowEnd(Platform.OS === "ios");
            if (d) setEnd(d);
          }}
        />
      )}

      <Text className="text-sm font-medium text-gray-700 mb-1">Location</Text>
      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-gray-900"
        value={location}
        onChangeText={setLocation}
        placeholder="Venue / address"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-4 text-gray-900"
        value={summary}
        onChangeText={setSummary}
        placeholder="What's the event about?"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Image URL (optional)</Text>
      <TextInput
        className="border border-gray-200 rounded-lg p-3 mb-6 text-gray-900"
        value={image}
        onChangeText={setImage}
        placeholder="https://..."
        autoCapitalize="none"
      />

      <Pressable
        className={`rounded-xl p-4 items-center ${submitting || !title ? "bg-gray-300" : "bg-indigo-600"}`}
        onPress={handleSubmit}
        disabled={submitting || !title}
      >
        <Text className="text-white font-semibold text-base">
          {submitting ? "Publishing…" : submitLabel}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
