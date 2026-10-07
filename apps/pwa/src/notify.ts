// Thin toast adapter — app code never touches sonner directly.
import { toast } from "sonner";

export const notify = (message: string): void => {
  toast(message);
};
