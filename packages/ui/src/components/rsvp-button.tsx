import { useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

interface RSVPButtonProps {
  isGoing: boolean;
  onToggle: () => Promise<void>;
  loading?: boolean;
}

/**
 * RSVPButton — optimistic UI toggle between Going / Not Going states.
 *
 * @props isGoing  - current RSVP state
 * @props onToggle - async handler that performs the toggle (throw on failure triggers rollback)
 * @props loading  - show spinner overrides all states
 */
export function RSVPButton({ isGoing, onToggle, loading }: RSVPButtonProps) {
  const [optimisticGoing, setOptimisticGoing] = useState(isGoing);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Sync optimistic state when prop changes (e.g. external refresh)
  if (isGoing !== optimisticGoing && !isRollingBack) {
    setOptimisticGoing(isGoing);
  }

  const handlePress = async () => {
    if (loading || isRollingBack) return;

    const previousState = optimisticGoing;
    const newState = !previousState;

    // Optimistic update
    setOptimisticGoing(newState);
    setIsRollingBack(true);

    try {
      await onToggle();
    } catch {
      // Rollback on failure
      setOptimisticGoing(previousState);
    } finally {
      setIsRollingBack(false);
    }
  };

  const isCurrentlyGoing = optimisticGoing;

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading || isRollingBack}
      className={`rounded-full px-6 py-3 flex-row items-center justify-center gap-2 ${
        isCurrentlyGoing ? 'bg-action-primary' : 'bg-bg-elevated border border-border'
      }`}
    >
      {loading ? (
        <ActivityIndicator
          size='small'
          color={isCurrentlyGoing ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)'}
        />
      ) : (
        <Text
          className={`font-semibold text-base ${
            isCurrentlyGoing ? 'text-text-inverse' : 'text-text-secondary'
          }`}
        >
          {isCurrentlyGoing ? 'Going' : 'Not Going'}
        </Text>
      )}
    </Pressable>
  );
}
