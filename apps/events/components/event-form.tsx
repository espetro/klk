import { HostedButton } from "@/components/hosted-button";
import { HostedInput as Input } from "@/components/hosted-input";
import { FieldGroup } from "@expo/ui";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

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
    <View style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section title="Event">
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {}}
          />
          <Input
            value={summary}
            onChangeText={setSummary}
            placeholder="What's the event about?"
            multiline
            numberOfLines={4}
          />
        </FieldGroup.Section>

        <FieldGroup.Section title="Schedule">
          <Pressable onPress={() => setShowStart(true)}>
            <Text selectable>{start.toLocaleString()}</Text>
          </Pressable>
          <Pressable onPress={() => setShowEnd(true)}>
            <Text selectable>{end.toLocaleString()}</Text>
          </Pressable>
        </FieldGroup.Section>

        <FieldGroup.Section title="Details">
          <Input value={location} onChangeText={setLocation} placeholder="Venue / address" />
          <Input
            value={image}
            onChangeText={setImage}
            placeholder="https://..."
            autoCapitalize="none"
          />
        </FieldGroup.Section>

        <HostedButton
          variant="filled"
          disabled={submitting || !title}
          onPress={handleSubmit}
          label={submitting ? "Publishing…" : submitLabel}
        />
      </FieldGroup>

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
    </View>
  );
}
