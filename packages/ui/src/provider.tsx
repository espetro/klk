import type { ReactNode } from "react";
import { TamaguiProvider } from "tamagui";
import { uiConfig } from "./config";

export const KlkProvider = ({ children }: { children: ReactNode }) => (
  <TamaguiProvider config={uiConfig} defaultTheme="light">
    {children}
  </TamaguiProvider>
);
