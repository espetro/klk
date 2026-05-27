import { Pressable, Text, type ViewStyle } from 'react-native';

export interface ButtonProps {
  label: string;
  variant?: 'filled' | 'outlined' | 'text';
  disabled?: boolean;
  onPress?: () => void;
}

export function HostedButton({
  label,
  variant = 'filled',
  disabled = false,
  onPress,
}: ButtonProps) {
  const baseStyle: ViewStyle = {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const variantStyle: ViewStyle =
    variant === 'filled'
      ? { backgroundColor: disabled ? '#5c554d' : '#c45b3a' }
      : variant === 'outlined'
        ? {
            borderWidth: 1,
            borderColor: disabled ? '#5c554d' : '#c45b3a',
            backgroundColor: 'transparent',
          }
        : { backgroundColor: 'transparent' };

  const containerStyle: ViewStyle = { ...baseStyle, ...variantStyle };
  const textColor =
    variant === 'filled' ? (disabled ? '#5c554d' : '#fdfbf7') : disabled ? '#5c554d' : '#c45b3a';

  return (
    <Pressable disabled={disabled} onPress={onPress} style={containerStyle}>
      <Text style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
