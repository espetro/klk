// The cohort email gate is a launch-cohort web concept — native builds
// ship behind app-store access anyway, so the gate is a passthrough.
import type { ReactNode } from "react";

export function CohortGate({ children }: { children: ReactNode }) {
  return children;
}
