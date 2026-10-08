// Native toasts: sonner is DOM-only — ToastAndroid covers Android; on iOS
// v0 the call is a no-op (toast UI is a residual item).
import { Platform, ToastAndroid } from "react-native";

export const notify = (msg: string) => {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
};
