import { useEffect } from "react";

// Escape hatch for one-time external-system sync (map widgets, DOM libs).
export const useMountEffect = (effect: () => void | (() => void)) => {
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- mount-once by design
  useEffect(effect, []);
};
