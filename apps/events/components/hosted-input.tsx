import { TextInput, type TextInputProps, useNativeState } from '@expo/ui';
import { useEffect } from 'react';

interface HostedInputProps extends Omit<TextInputProps, 'value'> {
  value?: string;
}

export function HostedInput({ value, onChangeText, ...props }: HostedInputProps) {
  const state = useNativeState(value ?? '');
  const isControlled = value !== undefined;

  useEffect(
    function syncControlledValue() {
      if (isControlled && value !== state.value) {
        state.value = value;
      }
    },
    [value, isControlled, state]
  );

  const handleChange = (text: string) => {
    state.value = text;
    onChangeText?.(text);
  };

  return <TextInput {...props} value={state} onChangeText={handleChange} />;
}
