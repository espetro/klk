// Assistant settings — device-scoped, localStorage under `klk.ai`,
// exactly like sealed circle keys and the identity wrap key (spec §3.2).

const LS_KEY = "klk.ai";

export interface AiSettings {
  mode: "managed" | "custom";
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const defaultAiSettings: AiSettings = {
  mode: "managed",
  baseUrl: "",
  apiKey: "",
  model: "",
};

export function loadAiSettings(): AiSettings {
  try {
    const raw = globalThis.localStorage?.getItem(LS_KEY);
    if (raw == null || raw === "") return { ...defaultAiSettings };
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      mode: parsed.mode === "custom" ? "custom" : "managed",
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
    };
  } catch {
    return { ...defaultAiSettings };
  }
}

export function saveAiSettings(s: AiSettings): void {
  globalThis.localStorage?.setItem(LS_KEY, JSON.stringify(s));
}

/** A custom endpoint is usable only when all three fields are set. */
export function customEndpointReady(s: AiSettings): boolean {
  return s.baseUrl.trim() !== "" && s.model.trim() !== "";
}
