import { TextInput, type TextInputProps } from 'react-native';

interface HostedInputProps extends TextInputProps {
  value?: string;
}

export function HostedInput({ value, onChangeText, ...props }: HostedInputProps) {
  return <TextInput {...props} value={value} onChangeText={onChangeText} />;
}
