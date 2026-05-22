import { useContext } from "react";
import { NDKContext } from "@/app/_layout";

export function useIdentity() {
  return useContext(NDKContext);
}
