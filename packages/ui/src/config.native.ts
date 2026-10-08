import { getDefaultTamaguiConfig } from "@tamagui/config-default";
import { createTamagui } from "tamagui";

// native entry of config-default takes no platform argument — its tokens
// are already resolved for RN (no CSS units, no media queries).
export const uiConfig = createTamagui(getDefaultTamaguiConfig());
