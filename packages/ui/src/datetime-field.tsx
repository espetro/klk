import { palette } from "./palette.ts";

/**
 * One local "YYYY-MM-DDTHH:mm" string, rendered as the platform's datetime
 * control. Web: <input type="datetime-local">. Native: date + time text
 * fields (datetime-field.native.tsx).
 */
export const DateTimeField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <input
    type="datetime-local"
    value={value}
    onChange={(e) => onChange(e.currentTarget.value)}
    style={{
      border: `1px solid ${palette.border}`,
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 14,
      background: palette.surface,
      color: palette.ink,
      width: "100%",
    }}
  />
);
