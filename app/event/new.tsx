import { useContext, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { NDKContext } from "@/app/_layout";
import { EventForm, EventFormValues } from "@/components/event-form";
import { publishPublicEvent } from "@/lib/nostr/events";

export default function NewEventScreen() {
  const { ndk, city } = useContext(NDKContext);
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

  return <EventForm onSubmit={handleSubmit} submitting={submitting} submitLabel="Publish Event" />;
}
