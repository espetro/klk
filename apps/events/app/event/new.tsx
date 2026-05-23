import { useContext, useState } from "react";
import { Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { NDKContext } from "@/app/_layout";
import { useCity } from "@/features";
import { EventForm, EventFormValues } from "@/components";
import { publishPublicEvent } from "@klk/infrastructure";

export default function NewEventScreen() {
  const { ndk } = useContext(NDKContext);
  const city = useCity();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (values: EventFormValues) => {
    if (!ndk) return;
    setSubmitting(true);
    try {
      await publishPublicEvent(ndk, {
        title: values.title,
        start: Math.floor(values.start.getTime() / 1000),
        end: Math.floor(values.end.getTime() / 1000),
        location: values.location,
        summary: values.summary,
        image: values.image || undefined,
        city,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to publish event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <EventForm onSubmit={handleSubmit} submitting={submitting} submitLabel="Publish Event" />
    </>
  );
}
