import { valibotResolver } from '@hookform/resolvers/valibot';
import { useForm } from 'react-hook-form';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as v from 'valibot';

import { cn } from '../lib/utils';

const circleFormSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2, 'Name must be at least 2 characters')),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(500, 'Description must be 500 characters or less'))
  ),
});

type CircleFormData = v.InferOutput<typeof circleFormSchema>;

interface CircleFormProps {
  onSubmit: (data: CircleFormData) => void;
  defaultValues?: Partial<CircleFormData> | undefined;
  isLoading?: boolean;
  submitLabel?: string;
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <View className='mb-4'>
      <Text className='text-sm font-medium text-text-secondary mb-1.5'>{label}</Text>
      {children}
      {error && <Text className='text-xs text-red-500 mt-1'>{error}</Text>}
    </View>
  );
}

export function CircleForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  submitLabel = 'Create Circle',
}: CircleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CircleFormData>({
    resolver: valibotResolver(circleFormSchema),
    ...(defaultValues && { defaultValues }),
  });

  return (
    <View className='p-4'>
      <FormField label='Circle Name *' error={errors.name?.message}>
        <TextInput
          className={cn(
            'rounded-lg px-3 py-2.5 text-base text-text-primary bg-bg-default border',
            Platform.select({
              ios: 'border-secondary/20',
              android: 'border-secondary/20',
              web: 'border-secondary/20 focus:border-ring focus:ring-ring/50 focus:ring-[3px] outline-none',
            }),
            errors.name && 'border-red-500'
          )}
          placeholder='e.g. Family, Book Club…'
          placeholderTextColor='text-text-secondary/50'
          maxLength={32}
          editable={!isLoading}
          {...register('name')}
        />
      </FormField>

      <FormField label='Description (optional)' error={errors.description?.message}>
        <TextInput
          className={cn(
            'rounded-lg px-3 py-2.5 text-base text-text-primary bg-bg-default border border-secondary/20',
            Platform.select({
              ios: '',
              android: '',
              web: 'focus:border-ring focus:ring-ring/50 focus:ring-[3px] outline-none',
            }),
            errors.description && 'border-red-500'
          )}
          placeholder='What is this circle about?'
          placeholderTextColor='text-text-secondary/50'
          multiline
          numberOfLines={3}
          maxLength={500}
          editable={!isLoading}
          {...register('description')}
        />
      </FormField>

      <Pressable
        className={cn(
          'rounded-lg py-3 px-4 items-center justify-center',
          'bg-action-primary',
          isLoading && 'opacity-50'
        )}
        onPress={handleSubmit(onSubmit as never)}
        disabled={isLoading}
        role='button'
      >
        <Text className='text-base font-medium text-text-inverse'>
          {isLoading ? 'Saving…' : submitLabel}
        </Text>
      </Pressable>
    </View>
  );
}
