// Cohort gate: the app collects an email before first use so the launch
// cohort is known. The relay appends signups to cohort.jsonl — lifting the
// gate later is just VITE_COHORT_GATE=0.
import { storage } from "@klk/core";
import { API_ORIGIN } from "./config.ts";

const KEY = "klk.cohort.email";

export function cohortEmail(): string | null {
  try {
    return storage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function joinCohort(email: string): Promise<void> {
  const res = await fetch(`${API_ORIGIN}/api/cohort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`Couldn't join early access (${res.status}) — try again`);
  try {
    storage.setItem(KEY, email.trim().toLowerCase());
  } catch {
    // storage unavailable — the POST still landed
  }
}
