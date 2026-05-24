import { useContext } from "react";
import { NDKContext } from "@/lib/context/ndk-context";

export function useIdentity() {
  return useContext(NDKContext);
}
