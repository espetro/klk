import * as LocalAuthentication from "expo-local-authentication";

export interface BiometricResult {
  success: boolean;
  biometricType: LocalAuthentication.AuthenticationType | null;
}

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function getBiometricType(): Promise<LocalAuthentication.AuthenticationType | null> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return null;
  return await LocalAuthentication.supportedAuthenticationTypesAsync().then(
    (types) => types[0] ?? null,
  );
}

export async function authenticateWithBiometrics(
  promptMessage = "Authenticate to continue",
): Promise<BiometricResult> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return { success: false, biometricType: null };
    }

    const biometricType = await getBiometricType();

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
    });

    return {
      success: result.success,
      biometricType,
    };
  } catch {
    return { success: false, biometricType: null };
  }
}
