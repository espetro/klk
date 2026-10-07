import { getDefaultTamaguiConfig } from "@tamagui/config-default";
import { createTamagui } from "tamagui";

export const uiConfig = createTamagui(getDefaultTamaguiConfig("web"));
