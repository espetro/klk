import { valibotResolver } from '@hookform/resolvers/valibot';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Platform, Pressable, View } from 'react-native';
import * as v from 'valibot';

import { cn } from '../lib/utils';
import { Button } from './rnr/button';
import { Input } from './rnr/input';
import { Text } from './rnr/text';

const EventFormSchema = v.object({
  title: v.pipe(v.string(), v.minLength(3, 'Title must be at least 3 characters')),
  description: v.optional(v.string()),
  startDate: v.pipe(v.date(), v.minValue(new Date(), 'Start date must be in the future')),
  endDate: v.pipe(v.date(), v.minValue(new Date(), 'End date must be in the future')),
  location: v.optional(v.string()),
  imageUrl: v.optional(v.pipe(v.string(), v.url('Must be a valid URL'))),
});

export type EventFormValues = v.InferOutput<typeof EventFormSchema>;

export interface EventFormProps {
  onSubmit: (data: EventFormValues) => void | Promise<void>;
  defaultValues?: Partial<EventFormValues>;
  isLoading?: boolean;
}

export function EventForm({ onSubmit, defaultValues, isLoading }: EventFormProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const defaultStartDate = defaultValues?.startDate ?? new Date();
  const defaultEndDate = defaultValues?.endDate ?? new Date(Date.now() + 2 * 60 * 60 * 1000);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: valibotResolver(EventFormSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      location: defaultValues?.location ?? '',
      imageUrl: defaultValues?.imageUrl ?? '',
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const handleStartChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      setShowStartPicker(true);
    } else {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setValue('startDate', selectedDate, { shouldValidate: true });
    }
  };

  const handleEndChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      setShowEndPicker(true);
    } else {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setValue('endDate', selectedDate, { shouldValidate: true });
    }
  };

  return (
    <View className='flex-1 gap-4 p-4'>
      {/* Title */}
      <View className='gap-1'>
        <Text variant='small' className='text-text-secondary'>
          Title
        </Text>
        <Input
          {...register('title')}
          placeholder='Event title'
          autoCorrect={false}
          autoCapitalize='words'
          className={cn(
            'bg-bg-default border-text-secondary/20 text-text-primary',
            errors.title && 'border-red-500'
          )}
        />
        {errors.title && (
          <Text variant='small' className='text-red-500'>
            {errors.title.message}
          </Text>
        )}
      </View>

      {/* Description */}
      <View className='gap-1'>
        <Text variant='small' className='text-text-secondary'>
          Description
        </Text>
        <Input
          {...register('description')}
          placeholder="What's the event about?"
          multiline
          numberOfLines={4}
          className='bg-bg-default border-text-secondary/20 text-text-primary min-h-24 text-start align-top'
        />
      </View>

      {/* Start Date/Time */}
      <View className='gap-1'>
        <Text variant='small' className='text-text-secondary'>
          Start
        </Text>
        <Pressable
          onPress={() => setShowStartPicker(true)}
          className='bg-bg-default border-text-secondary/20 rounded-md border px-3 py-2'
        >
          <Text className='text-text-primary'>{startDate?.toLocaleString()}</Text>
        </Pressable>
        {errors.startDate && (
          <Text variant='small' className='text-red-500'>
            {errors.startDate.message}
          </Text>
        )}
      </View>

      {/* End Date/Time */}
      <View className='gap-1'>
        <Text variant='small' className='text-text-secondary'>
          End
        </Text>
        <Pressable
          onPress={() => setShowEndPicker(true)}
          className='bg-bg-default border-text-secondary/20 rounded-md border px-3 py-2'
        >
          <Text className='text-text-primary'>{endDate?.toLocaleString()}</Text>
        </Pressable>
        {errors.endDate && (
          <Text variant='small' className='text-red-500'>
            {errors.endDate.message}
          </Text>
        )}
      </View>

      {/* Location */}
      <View className='gap-1'>
        <Text variant='small' className='text-text-secondary'>
          Location
        </Text>
        <Input
          {...register('location')}
          placeholder='Venue / address'
          className='bg-bg-default border-text-secondary/20 text-text-primary'
        />
      </View>

      {/* Image URL */}
      <View className='gap-1'>
        <Text variant='small' className='text-text-secondary'>
          Image URL
        </Text>
        <Input
          {...register('imageUrl')}
          placeholder='https://...'
          autoCapitalize='none'
          keyboardType='url'
          className={cn(
            'bg-bg-default border-text-secondary/20 text-text-primary',
            errors.imageUrl && 'border-red-500'
          )}
        />
        {errors.imageUrl && (
          <Text variant='small' className='text-red-500'>
            {errors.imageUrl.message}
          </Text>
        )}
      </View>

      {/* Submit */}
      <Button
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        className='bg-action-primary text-text-inverse disabled:opacity-50'
      >
        {isLoading ? 'Saving...' : 'Save Event'}
      </Button>

      {/* Date/Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate ?? new Date()}
          mode='datetime'
          onChange={handleStartChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate ?? new Date()}
          mode='datetime'
          onChange={handleEndChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}
    </View>
  );
}
