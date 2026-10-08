// Native DateTimeField: a split date (YYYY-MM-DD) + time (HH:mm) pair over
// the same local "YYYY-MM-DDTHH:mm" string contract — no datetime-local
// input on RN, and no native picker dep for v0.
import { Input, XStack } from "tamagui";
import { palette } from "./palette.ts";

const DATE_RE = /^\d{0,4}-?\d{0,2}-?\d{0,2}$/;
const TIME_RE = /^\d{0,2}:?\d{0,2}$/;

export const DateTimeField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [date = "", time = ""] = value.split("T");
  const emit = (d: string, t: string) => onChange(`${d}T${t}`);
  return (
    <XStack gap="$2">
      <Input
        flex={3}
        value={date}
        onChangeText={(d) => {
          if (DATE_RE.test(d)) emit(d, time);
        }}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        borderColor={palette.border}
        backgroundColor={palette.surface}
      />
      <Input
        flex={2}
        value={time}
        onChangeText={(t) => {
          if (TIME_RE.test(t)) emit(date, t);
        }}
        placeholder="HH:mm"
        keyboardType="numbers-and-punctuation"
        borderColor={palette.border}
        backgroundColor={palette.surface}
      />
    </XStack>
  );
};
