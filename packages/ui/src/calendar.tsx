// RangeCalendar — week strip (collapsed) / month grid (expanded) with
// day-or-range selection, capped at `maxRangeDays` (default 21). Dots
// under a day carry circle colors so pins read at a glance.
import { Text, XStack, YStack } from "tamagui";
import { palette } from "./palette.ts";

export interface DayRange {
  /** inclusive "YYYY-MM-DD" local day keys */
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k: string) => {
  const [y = 1970, m = 1, d = 1] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const rangeDays = (r: DayRange) =>
  Math.round((parseKey(r.to).getTime() - parseKey(r.from).getTime()) / 86400000) + 1;

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
// "today" is per page-load — the underline is cosmetic, so module scope is fine
const TODAY = dayKey(new Date());

const DayCell = ({
  date,
  selected,
  inRange,
  endpoint,
  today,
  dots,
  dim,
  onPress,
}: {
  date: Date;
  selected: boolean;
  inRange: boolean;
  endpoint: boolean;
  today: boolean;
  dots: string[];
  dim: boolean;
  onPress: () => void;
}) => (
  <YStack
    flex={1}
    alignItems="center"
    paddingVertical={6}
    borderRadius={8}
    backgroundColor={endpoint ? palette.ink : inRange ? "#F0EFED" : "transparent"}
    pressStyle={{ opacity: 0.7 }}
    onPress={onPress}
    cursor="pointer"
    userSelect="none"
  >
    <Text
      fontSize={13}
      fontWeight={selected || today ? "700" : "400"}
      color={endpoint ? "#FFF" : dim ? palette.border : palette.ink}
      textDecorationLine={today && !endpoint ? "underline" : "none"}
    >
      {date.getDate()}
    </Text>
    <XStack gap={2} height={4} marginTop={2}>
      {dots.slice(0, 3).map((c) => (
        <YStack key={c} width={4} height={4} borderRadius={2} backgroundColor={c} />
      ))}
    </XStack>
  </YStack>
);

export const RangeCalendar = ({
  mode,
  anchor,
  selected,
  maxRangeDays = 21,
  dots,
  onSelect,
  onNavigate,
}: {
  mode: "week" | "month";
  /** the day the strip/grid is centered on */
  anchor: string;
  selected: DayRange | null;
  maxRangeDays?: number;
  /** day key → accent colors of events that day */
  dots: Map<string, string[]>;
  onSelect: (range: DayRange) => void;
  onNavigate: (anchor: string) => void;
}) => {
  const anchorDate = parseKey(anchor);
  const today = TODAY;

  const pick = (d: Date) => {
    const k = dayKey(d);
    if (selected === null || selected.from !== selected.to) {
      onSelect({ from: k, to: k });
      return;
    }
    const a = parseKey(selected.from);
    const lo = k < selected.from ? d : a;
    const hi = k < selected.from ? a : d;
    // cap the span at maxRangeDays, anchored at the picked end
    const cappedHi = addDays(lo, maxRangeDays - 1);
    onSelect({ from: dayKey(lo), to: dayKey(hi > cappedHi ? cappedHi : hi) });
  };

  const weeks: Date[][] = [];
  if (mode === "week") {
    const start = startOfWeek(anchorDate);
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  } else {
    const first = startOfWeek(startOfMonth(anchorDate));
    const last = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    const end = addDays(last, 6 - last.getDay());
    for (let d = first; d <= end; d = addDays(d, 7)) {
      weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    }
  }

  const navStep = (dir: -1 | 1) => {
    const next =
      mode === "week"
        ? addDays(anchorDate, dir * 7)
        : new Date(anchorDate.getFullYear(), anchorDate.getMonth() + dir, 1);
    onNavigate(dayKey(next));
  };

  const label = anchorDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <YStack gap="$1">
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$1">
        <Text fontSize={14} fontWeight="600" color={palette.ink}>
          {label}
        </Text>
        <XStack gap="$3">
          <Text
            fontSize={16}
            color={palette.ink}
            cursor="pointer"
            onPress={() => navStep(-1)}
            userSelect="none"
          >
            ‹
          </Text>
          <Text
            fontSize={16}
            color={palette.ink}
            cursor="pointer"
            onPress={() => navStep(1)}
            userSelect="none"
          >
            ›
          </Text>
        </XStack>
      </XStack>
      <XStack>
        {DOW.map((d, i) => (
          <Text
            key={i}
            flex={1}
            textAlign="center"
            fontSize={10}
            color={palette.muted}
            textTransform="uppercase"
          >
            {d}
          </Text>
        ))}
      </XStack>
      {weeks.map((week) => (
        <XStack key={week[0] !== undefined ? dayKey(week[0]) : "empty"}>
          {week.map((d) => {
            const k = dayKey(d);
            const inSel = selected !== null && k >= selected.from && k <= selected.to;
            const endpoint = selected !== null && (k === selected.from || k === selected.to);
            return (
              <DayCell
                key={k}
                date={d}
                selected={inSel}
                inRange={inSel && !endpoint}
                endpoint={endpoint}
                today={k === today}
                dim={mode === "month" && d.getMonth() !== anchorDate.getMonth()}
                dots={dots.get(k) ?? []}
                onPress={() => pick(d)}
              />
            );
          })}
        </XStack>
      ))}
    </YStack>
  );
};
